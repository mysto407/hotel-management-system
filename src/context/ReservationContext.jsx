// src/context/ReservationContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getReservations,
  createReservation as createReservationAPI,
  updateReservation as updateReservationAPI,
  deleteReservation as deleteReservationAPI,
  updateRoomStatus
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

  const checkIn = async (id) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    await updateReservation(id, { status: 'Checked-in' });
    await updateRoomStatus(reservation.room_id, 'Occupied');
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