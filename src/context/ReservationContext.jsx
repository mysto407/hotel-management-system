// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  updateRoomStatus,
  createBill
} from '../lib/supabase';

const ReservationContext = createContext();

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservations must be used within ReservationProvider');
  return context;
};

export const ReservationProvider = ({ children }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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
      alert('Failed to create reservation: ' + error.message);
      return null;
    }
    
    // Update room status to Occupied if checking in
    if (reservation.status === 'Checked-in') {
      await updateRoomStatus(reservation.room_id, 'Occupied');
    }
    
    await loadReservations(); // Reload to get with relations
    return data[0];
  };

  const updateReservation = async (id, updatedReservation) => {
    const { error } = await updateReservationAPI(id, updatedReservation);
    if (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation: ' + error.message);
      return;
    }
    await loadReservations();
  };

  const deleteReservation = async (id) => {
    const { error } = await deleteReservationAPI(id);
    if (error) {
      console.error('Error deleting reservation:', error);
      alert('Cannot delete reservation: ' + error.message);
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
      
      // Update room status to Occupied
      await updateRoomStatus(reservation.room_id, 'Occupied');

      // Auto-create Room Charge Bill
      const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
      const roomRate = reservation.rooms?.room_types?.base_price || 0;
      const subtotal = nights * roomRate;
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + tax;

      // Create bill items for each night
      const billItems = [];
      for (let i = 0; i < nights; i++) {
        billItems.push({
          description: `Room ${reservation.rooms?.room_number || 'N/A'} - Night ${i + 1}`,
          quantity: 1,
          rate: roomRate,
          amount: roomRate
        });
      }

      // Create the room charge bill
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
        notes: `Auto-generated room charge for ${nights} night(s)`
      };

      const { data: billResult, error: billError } = await createBill(billData, billItems);
      
      if (billError) {
        console.error('Error creating room charge bill:', billError);
        alert('Guest checked in successfully, but failed to create room charge bill. Please create manually.');
      } else {
        console.log('Room charge bill created successfully:', billResult);
        alert(`Guest checked in successfully! Room charge bill created for ${nights} night(s) - Total: ₹${total.toFixed(2)}`);
      }

    } catch (error) {
      console.error('Error during check-in:', error);
      alert('Failed to complete check-in: ' + error.message);
    }
  };

  const checkOut = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Checked-out' });
    await updateRoomStatus(reservation.room_id, 'Available');
  };

  const cancelReservation = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Cancelled' });
    
    // If was checked in, make room available
    if (reservation.status === 'Checked-in') {
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
      cancelReservation
    }}>
      {children}
    </ReservationContext.Provider>
  );
};