// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  getReservationById,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  splitReservation as splitReservationAPI,
  updateRoomStatus,
  createBill,
  getMealPlanByCode,
  // Room assignment functions
  assignRoomToReservation as assignRoomAPI,
  autoAssignRooms as autoAssignRoomsAPI,
  // Folio and charge generation functions
  getOrCreateMasterFolio,
  getFolioByReservation,
  generateDailyRoomChargesWithTax,
  createServiceChargeWithTax,
  generateExtraPersonCharges,
  voidTransaction,
  voidTransactionWithChildren,
  getTransactionsByReservation
} from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

const ReservationContext = createContext();

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservations must be used within ReservationProvider');
  return context;
};

export const ReservationProvider = ({ children }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error: showError, success: showSuccess } = useAlert();
  const { user } = useAuth();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    const { data, error } = await getReservations();
    if (error) {
      console.error('Error loading reservations:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  const addReservation = async (reservation, options = {}) => {
    const { skipFolioGeneration = false, guestName = 'Guest', roomNumber = '' } = options;

    const { data, error } = await createReservationAPI(reservation);
    if (error) {
      console.error('Error creating reservation:', error);
      showError('Failed to create reservation: ' + error.message);
      return null;
    }

    const createdReservation = data[0];

    // Update room status for display purposes only (only if room is assigned)
    // Note: Actual availability is determined by date-based queries, not status
    if (reservation.room_id) {
      if (reservation.status === 'Checked-in') {
        await updateRoomStatus(reservation.room_id, 'Occupied');
      } else if (reservation.status === 'Confirmed') {
        // Set room to Reserved when a confirmed booking is created
        await updateRoomStatus(reservation.room_id, 'Reserved');
      }
    }

    // Auto-generate folio and charges (Cloudbeds-style)
    if (!skipFolioGeneration && createdReservation) {
      try {
        await generateFolioCharges(createdReservation, guestName, roomNumber);
      } catch (folioError) {
        console.error('Error generating folio charges:', folioError);
        // Don't fail the reservation creation, just log the error
      }
    }

    await loadReservations(); // Reload to get with relations
    return createdReservation;
  };

  // Generate folio and all initial charges for a reservation
  const generateFolioCharges = async (reservation, guestName = 'Guest', roomNumber = '') => {
    const userId = user?.id || null;

    // 1. Create or get master folio
    const { data: folio, error: folioError } = await getOrCreateMasterFolio(
      reservation.id,
      guestName
    );

    if (folioError || !folio) {
      console.error('Error creating folio:', folioError);
      return;
    }

    // 2. Generate room charges with tax (per night, all as 'pending')
    const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);

    // FIX: Use room_subtotal (pre-tax) if available, otherwise estimate from total_amount
    // This fixes the double-taxation bug where tax was applied twice
    let roomRate;
    if (reservation.room_subtotal) {
      // New approach: room_subtotal is the pre-tax amount
      roomRate = parseFloat(reservation.room_subtotal) / nights;
    } else {
      // Legacy fallback: estimate pre-tax rate from total_amount
      // Assumes 18% tax rate for historical data
      const estimatedTaxRate = 0.18;
      roomRate = parseFloat(reservation.total_amount) / (1 + estimatedTaxRate) / nights;
      console.log('Using legacy fallback for room rate calculation (no room_subtotal)');
    }

    await generateDailyRoomChargesWithTax(
      reservation.id,
      folio.id,
      roomRate,
      reservation.check_in_date,
      reservation.check_out_date,
      roomNumber || 'TBD',
      userId,
      true // Apply taxes
    );

    // 3. Generate meal plan charges if applicable
    if (reservation.meal_plan && reservation.meal_plan !== 'NM') {
      try {
        const mealPlanData = await getMealPlanByCode(reservation.meal_plan);
        if (mealPlanData?.data && mealPlanData.data.price_per_person > 0) {
          const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
          const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0);
          const mealPlanTotal = mealPlanData.data.price_per_person * totalGuests * nights;

          await createServiceChargeWithTax(
            folio.id,
            reservation.id,
            mealPlanTotal,
            `${mealPlanData.data.name} - ${totalGuests} guests x ${nights} nights`,
            'food',
            userId,
            new Date(reservation.check_in_date)
          );
        }
      } catch (mealError) {
        console.error('Error generating meal plan charges:', mealError);
      }
    }

    // 4. Generate extra person charges if applicable
    // (This requires rate type info which may not be available at this point)
    // Extra person fees can be generated later when rate type is fully loaded

    console.log('Folio charges generated successfully for reservation:', reservation.id);
  };

  const updateReservation = async (id, updatedReservation, options = {}) => {
    const { skipChargeReconciliation = false } = options;

    // Get current reservation to detect date changes
    const currentReservation = reservations.find(r => r.id === id);

    const { error } = await updateReservationAPI(id, updatedReservation);
    if (error) {
      console.error('Error updating reservation:', error);
      showError('Failed to update reservation: ' + error.message);
      return;
    }

    // Check if dates changed and reconcile charges if needed
    if (!skipChargeReconciliation && currentReservation) {
      const datesChanged = (
        (updatedReservation.check_in_date && updatedReservation.check_in_date !== currentReservation.check_in_date) ||
        (updatedReservation.check_out_date && updatedReservation.check_out_date !== currentReservation.check_out_date)
      );

      if (datesChanged) {
        try {
          await reconcileRoomCharges(id, currentReservation, updatedReservation);
        } catch (reconcileError) {
          console.error('Error reconciling charges:', reconcileError);
          // Don't fail the update, just log the error
        }
      }
    }

    await loadReservations();
  };

  // Reconcile room charges when reservation dates change
  const reconcileRoomCharges = async (reservationId, oldReservation, newDates) => {
    const userId = user?.id || null;

    // 1. Get all transactions for this reservation
    const { data: transactions } = await getTransactionsByReservation(reservationId);
    if (!transactions) return;

    // 2. Void all pending room_charge transactions (and their child taxes)
    const pendingRoomCharges = transactions.filter(
      t => t.transaction_type === 'room_charge' && t.transaction_status === 'pending'
    );

    for (const charge of pendingRoomCharges) {
      await voidTransactionWithChildren(charge.id, 'Date change - charges regenerated', userId);
    }

    console.log(`Voided ${pendingRoomCharges.length} pending room charges due to date change`);

    // 3. Get the folio for this reservation
    const { data: folio } = await getFolioByReservation(reservationId);
    if (!folio) {
      console.error('No folio found for reservation');
      return;
    }

    // 4. Calculate new room rate
    const newCheckIn = newDates.check_in_date || oldReservation.check_in_date;
    const newCheckOut = newDates.check_out_date || oldReservation.check_out_date;
    const nights = calculateNights(newCheckIn, newCheckOut);

    // FIX: Use room_subtotal (pre-tax) if available, otherwise estimate from total_amount
    // This fixes the double-taxation bug where tax was applied twice
    let roomRate;
    const roomSubtotal = newDates.room_subtotal || oldReservation.room_subtotal;

    if (roomSubtotal) {
      // New approach: room_subtotal is the pre-tax amount
      roomRate = parseFloat(roomSubtotal) / nights;
    } else {
      // Legacy fallback: estimate pre-tax rate from total_amount
      const totalAmount = newDates.total_amount || oldReservation.total_amount;
      const estimatedTaxRate = 0.18;
      roomRate = parseFloat(totalAmount) / (1 + estimatedTaxRate) / nights;
      console.log('Using legacy fallback for room rate calculation in reconciliation');
    }

    // 5. Regenerate room charges with tax
    await generateDailyRoomChargesWithTax(
      reservationId,
      folio.id,
      roomRate,
      newCheckIn,
      newCheckOut,
      'Room', // Room number may not be available here
      userId,
      true
    );

    console.log(`Regenerated ${nights} room charges for new date range`);
  };

  const deleteReservation = async (id) => {
    const { error } = await deleteReservationAPI(id);
    if (error) {
      console.error('Error deleting reservation:', error);
      showError('Cannot delete reservation: ' + error.message);
      return;
    }
    setReservations(reservations.filter(r => r.id !== id));
  };

  // Calculate number of nights between check-in and check-out
  const calculateNights = (checkInDate, checkOutDate) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const checkIn = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return { success: false, error: 'Reservation not found' };

    // CRITICAL: Check if room is assigned before check-in
    if (!reservation.room_id) {
      return {
        success: false,
        needsRoomAssignment: true,
        error: 'No room assigned. Please assign a room before check-in.'
      };
    }

    try {
      // Update reservation status to Checked-in
      await updateReservation(id, { status: 'Checked-in' });

      // Update room status to Occupied (for display purposes only)
      // Note: Actual availability is determined by date-based queries
      await updateRoomStatus(reservation.room_id, 'Occupied');

      const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
      const rateTypeName = reservation.room_rate_types?.rate_name || 'Standard Rate';

      showSuccess(`Guest checked in! ${nights} night(s) @ ${rateTypeName}.`);

      return { success: true };
    } catch (error) {
      console.error('Error during check-in:', error);
      showError('Failed to complete check-in: ' + error.message);
      return { success: false, error: error.message };
    }
  };

  // Assign a specific room to a reservation
  const assignRoom = async (reservationId, roomId, forceRoomType = false) => {
    const { data, error } = await assignRoomAPI(reservationId, roomId, forceRoomType);

    if (error) {
      // Return specific error for room type mismatch (to show force move dialog)
      if (error.code === 'ROOM_TYPE_MISMATCH') {
        return { data: null, error, needsForceMove: true };
      }
      console.error('Error assigning room:', error);
      showError('Failed to assign room: ' + error.message);
      return { data: null, error };
    }

    showSuccess('Room assigned successfully');
    await loadReservations();
    return { data, error: null };
  };

  // Unassign room from a reservation (make it unassigned again)
  const unassignRoom = async (reservationId) => {
    const { error } = await updateReservationAPI(reservationId, { room_id: null });

    if (error) {
      console.error('Error unassigning room:', error);
      showError('Failed to unassign room: ' + error.message);
      return false;
    }

    showSuccess('Room unassigned');
    await loadReservations();
    return true;
  };

  // Auto-assign rooms to unassigned reservations
  const autoAssignRooms = async (reservationIds = null, roomTypeId = null) => {
    const { data, error } = await autoAssignRoomsAPI(reservationIds, roomTypeId);

    if (error) {
      console.error('Error auto-assigning rooms:', error);
      showError('Failed to auto-assign rooms: ' + error.message);
      return null;
    }

    const { assigned, failed } = data;
    if (assigned.length > 0) {
      showSuccess(`Successfully assigned ${assigned.length} room(s)`);
    }
    if (failed.length > 0) {
      showError(`Failed to assign ${failed.length} reservation(s)`);
    }

    await loadReservations();
    return data;
  };

  const checkOut = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Checked-out' });
    // Update room status to Available (for display purposes only, only if room was assigned)
    // Note: Actual availability is determined by date-based queries
    if (reservation.room_id) {
      await updateRoomStatus(reservation.room_id, 'Available');
    }
  };

  const cancelReservation = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    // Auto-void all pending transactions (Cloudbeds-style)
    try {
      const { data: transactions } = await getTransactionsByReservation(id);
      if (transactions && transactions.length > 0) {
        const pendingTransactions = transactions.filter(
          t => t.transaction_status === 'pending'
        );

        for (const txn of pendingTransactions) {
          await voidTransaction(txn.id, 'Reservation cancelled', user?.id);
        }

        if (pendingTransactions.length > 0) {
          console.log(`Voided ${pendingTransactions.length} pending transactions for cancelled reservation`);
        }
      }
    } catch (voidError) {
      console.error('Error voiding transactions on cancellation:', voidError);
      // Continue with cancellation even if voiding fails
    }

    await updateReservation(id, { status: 'Cancelled' });

    // Update room status to Available if it was occupied/reserved (for display purposes only)
    // Note: Actual availability is determined by date-based queries
    if (reservation.room_id && (reservation.status === 'Checked-in' || reservation.status === 'Confirmed')) {
      await updateRoomStatus(reservation.room_id, 'Available');
    }
  };

  const splitReservation = async (originalReservationId, splitData) => {
    const { data, error } = await splitReservationAPI(originalReservationId, splitData);

    if (error) {
      console.error('Error splitting reservation:', error);
      showError('Failed to split reservation: ' + error.message);
      return null;
    }

    showSuccess('Reservation split successfully');
    await loadReservations();
    return data;
  };

  return (
    <ReservationContext.Provider value={{
      reservations,
      loading,
      addReservation,
      updateReservation,
      deleteReservation,
      splitReservation,
      checkIn,
      checkOut,
      cancelReservation,
      // Room assignment functions
      assignRoom,
      unassignRoom,
      autoAssignRooms,
      fetchReservations: loadReservations
    }}>
      {children}
    </ReservationContext.Provider>
  );
};