import { createContext, useContext, useState } from 'react';

const ReservationContext = createContext();

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (!context) throw new Error('useReservations must be used within ReservationProvider');
  return context;
};

export const ReservationProvider = ({ children }) => {
  const [reservations, setReservations] = useState([
    {
      id: 1,
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '9876543210',
      guestIdProof: 'AADHAR-1234',
      roomId: 2,
      checkInDate: '2025-10-14',
      checkOutDate: '2025-10-16',
      numberOfGuests: 2,
      totalAmount: 8000,
      advancePayment: 4000,
      paymentStatus: 'Partial',
      status: 'Checked-in',
      specialRequests: 'Early check-in',
      createdAt: '2025-10-13'
    },
    {
      id: 2,
      guestName: 'Jane Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '9876543211',
      guestIdProof: 'PAN-5678',
      roomId: 5,
      checkInDate: '2025-10-18',
      checkOutDate: '2025-10-20',
      numberOfGuests: 2,
      totalAmount: 16000,
      advancePayment: 16000,
      paymentStatus: 'Paid',
      status: 'Upcoming',
      specialRequests: '',
      createdAt: '2025-10-12'
    }
  ]);

  const addReservation = (reservation) => {
    setReservations([...reservations, { ...reservation, id: Date.now(), createdAt: new Date().toISOString().split('T')[0] }]);
  };

  const updateReservation = (id, updatedReservation) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, ...updatedReservation } : r));
  };

  const deleteReservation = (id) => {
    setReservations(reservations.filter(r => r.id !== id));
  };

  const checkIn = (id) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, status: 'Checked-in' } : r));
  };

  const checkOut = (id) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, status: 'Checked-out' } : r));
  };

  const cancelReservation = (id) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r));
  };

  return (
    <ReservationContext.Provider value={{
      reservations,
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