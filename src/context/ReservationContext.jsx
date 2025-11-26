// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  splitReservation as splitReservationAPI,
  updateRoomStatus,
  createBill,
  getMealPlanByCode,
  // Folio and transaction business logic
  createMasterFolio,
  getFoliosByReservation,
  generateDailyRoomCharges,
  createServiceCharge,
  // Room assignment functions
  assignRoomToReservation as assignRoomAPI,
  autoAssignRooms as autoAssignRoomsAPI
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

  const addReservation = async (reservation) => {
    const { data, error } = await createReservationAPI(reservation);
    if (error) {
      console.error('Error creating reservation:', error);
      showError('Failed to create reservation: ' + error.message);
      return null;
    }

    const createdReservation = data[0];

    // Create master folio immediately after reservation is created
    try {
      const { data: newFolio, error: folioError } = await createMasterFolio(createdReservation.id, {
        guestName: 'Main Folio'
      });

      if (folioError) {
        console.error('Error creating folio:', folioError);
        showError('Reservation created but failed to create folio. Please contact support.');
      }
    } catch (folioError) {
      console.error('Error creating folio:', folioError);
      // Continue even if folio creation fails - user can create it manually later
    }

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

    await loadReservations(); // Reload to get with relations
    return createdReservation;
  };

  const updateReservation = async (id, updatedReservation) => {
    const { error } = await updateReservationAPI(id, updatedReservation);
    if (error) {
      console.error('Error updating reservation:', error);
      showError('Failed to update reservation: ' + error.message);
      return;
    }
    await loadReservations();
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

      // Get or create master folio for the reservation
      const { data: existingFolios } = await getFoliosByReservation(id);
      let masterFolio = existingFolios?.find(f => f.folio_type === 'master');

      if (!masterFolio) {
        const { data: newFolio } = await createMasterFolio(id, {
          guestName: reservation.guests?.name || 'Main'
        });
        masterFolio = newFolio;
      }

      if (!masterFolio) {
        console.error('Failed to create or find master folio');
        showError('Failed to create billing folio');
        return;
      }

      // Generate daily room charges with scheduled posting
      const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
      const roomRate = reservation.room_rate_types?.base_price || reservation.rooms?.room_types?.base_price || 0;

      // Generate daily room charges with auto-posting at midnight
      const { data: roomCharges, error: roomChargeError } = await generateDailyRoomCharges(
        id, // reservation_id
        masterFolio.id, // folio_id
        roomRate, // room_rate
        reservation.check_in_date, // check_in_date
        reservation.check_out_date, // check_out_date
        reservation.rooms?.room_number || 'N/A', // room_number
        user?.id || null // user_id
      );

      if (roomChargeError) {
        console.error('Error generating room charges:', roomChargeError);
        showError('Guest checked in successfully, but failed to generate room charges. Please add manually.');
        return;
      }

      // Add meal plan charges if available (scheduled for each day)
      if (reservation.meal_plan && reservation.meal_plan !== 'EP') {
        try {
          const { data: mealPlanData } = await getMealPlanByCode(reservation.meal_plan);
          if (mealPlanData && mealPlanData.length > 0) {
            const mealPlanPrice = parseFloat(mealPlanData[0].price_per_person) || 0;
            if (mealPlanPrice > 0) {
              const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0);
              const mealPlanPerNight = mealPlanPrice * totalGuests;

              // Create scheduled meal plan charges for each day
              const checkInDate = new Date(reservation.check_in_date);
              for (let i = 0; i < nights; i++) {
                const scheduledDate = new Date(checkInDate);
                scheduledDate.setDate(scheduledDate.getDate() + i);
                scheduledDate.setHours(0, 0, 0, 0); // Midnight

                await createServiceCharge({
                  folio_id: masterFolio.id,
                  reservation_id: id,
                  description: `Meal Plan (${mealPlanData[0].name}) - Day ${i + 1} - ${totalGuests} guests`,
                  service_category: 'meal_plan',
                  amount: mealPlanPerNight,
                  quantity: 1,
                  rate: mealPlanPerNight,
                  transaction_date: new Date().toISOString(),
                  scheduled_post_date: scheduledDate.toISOString(),
                  auto_posted: true,
                  created_by: user?.id || null
                });
              }
            }
          }
        } catch (mealPlanError) {
          console.error('Error creating meal plan charges:', mealPlanError);
          // Continue without meal plan if there's an error
        }
      }

      const rateTypeName = reservation.room_rate_types?.rate_name || 'Standard Rate';
      console.log('Room charges generated successfully for', nights, 'nights');
      showSuccess(`Guest checked in successfully! Room charges scheduled for ${nights} night(s) - ${rateTypeName}`);

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