// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  updateRoomStatus,
  createBill,
  getMealPlanByCode
} from '../lib/supabase';
import { useAlert } from './AlertContext';

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

    // Update room status for display purposes only
    // Note: Actual availability is determined by date-based queries, not status
    if (reservation.status === 'Checked-in') {
      await updateRoomStatus(reservation.room_id, 'Occupied');
    } else if (reservation.status === 'Confirmed') {
      // Set room to Reserved when a confirmed booking is created
      await updateRoomStatus(reservation.room_id, 'Reserved');
    }

    await loadReservations(); // Reload to get with relations
    return data[0];
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
    if (!reservation) return;

    try {
      // Update reservation status to Checked-in
      await updateReservation(id, { status: 'Checked-in' });

      // Update room status to Occupied (for display purposes only)
      // Note: Actual availability is determined by date-based queries
      await updateRoomStatus(reservation.room_id, 'Occupied');

      // Auto-create Room Charge Bill
      const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);

      // Use rate type price if available, otherwise fall back to room type base price
      const roomRate = reservation.room_rate_types?.base_price || reservation.rooms?.room_types?.base_price || 0;

      // Create bill items for each night
      const billItems = [];
      let subtotal = 0;

      // Add room charges
      for (let i = 0; i < nights; i++) {
        billItems.push({
          description: `Room ${reservation.rooms?.room_number || 'N/A'} - Night ${i + 1}`,
          quantity: 1,
          rate: roomRate,
          amount: roomRate
        });
        subtotal += roomRate;
      }

      // Add meal plan charges if available
      if (reservation.meal_plan && reservation.meal_plan !== 'EP') {
        try {
          const { data: mealPlanData } = await getMealPlanByCode(reservation.meal_plan);
          if (mealPlanData && mealPlanData.length > 0) {
            const mealPlanPrice = parseFloat(mealPlanData[0].price_per_person) || 0;
            if (mealPlanPrice > 0) {
              const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0);
              const mealPlanPerNight = mealPlanPrice * totalGuests;

              for (let i = 0; i < nights; i++) {
                billItems.push({
                  description: `Meal Plan (${mealPlanData[0].name}) - Day ${i + 1} - ${totalGuests} guests`,
                  quantity: 1,
                  rate: mealPlanPerNight,
                  amount: mealPlanPerNight
                });
                subtotal += mealPlanPerNight;
              }
            }
          }
        } catch (mealPlanError) {
          console.error('Error fetching meal plan:', mealPlanError);
          // Continue without meal plan if there's an error
        }
      }

      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;

      // Create the room charge bill
      const rateTypeName = reservation.room_rate_types?.rate_name || 'Standard Rate';
      const billData = {
        reservation_id: reservation.id,
        bill_type: 'Room',
        subtotal: subtotal,
        tax: tax,
        discount: 0,
        total: total,
        paid_amount: 0,
        balance: total,
        payment_status: 'Pending',
        notes: `Auto-generated room charge for ${nights} night(s) - ${rateTypeName}` +
               (reservation.meal_plan && reservation.meal_plan !== 'EP' ? ` with ${reservation.meal_plan} meal plan` : '')
      };

      const { data: billResult, error: billError } = await createBill(billData, billItems);
      
      if (billError) {
        console.error('Error creating room charge bill:', billError);
        showError('Guest checked in successfully, but failed to create room charge bill. Please create manually.');
      } else {
        console.log('Room charge bill created successfully:', billResult);
        showSuccess(`Guest checked in successfully! Room charge bill created for ${nights} night(s) - Total: â‚¹${total.toFixed(2)}`);
      }

    } catch (error) {
      console.error('Error during check-in:', error);
      showError('Failed to complete check-in: ' + error.message);
    }
  };

  const checkOut = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Checked-out' });
    // Update room status to Available (for display purposes only)
    // Note: Actual availability is determined by date-based queries
    await updateRoomStatus(reservation.room_id, 'Available');
  };

  const cancelReservation = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Cancelled' });

    // Update room status to Available if it was occupied/reserved (for display purposes only)
    // Note: Actual availability is determined by date-based queries
    if (reservation.status === 'Checked-in' || reservation.status === 'Confirmed') {
      await updateRoomStatus(reservation.room_id, 'Available');
    }
  };

  return (
    <ReservationContext.Provider value={{
      reservations,
      loading,
      addReservation,
      updateReservation,
      deleteReservation,
      checkIn,
      checkOut,
      cancelReservation,
      fetchReservations: loadReservations
    }}>
      {children}
    </ReservationContext.Provider>
  );
};