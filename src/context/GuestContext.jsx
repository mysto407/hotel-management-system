// src/context/GuestContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getGuests,
  getGuestByPhone as getGuestByPhoneAPI,
  createGuest as createGuestAPI,
  updateGuest as updateGuestAPI,
  deleteGuest as deleteGuestAPI
} from '../lib/supabase';

const GuestContext = createContext();

export const useGuests = () => {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuests must be used within GuestProvider');
  return context;
};

export const GuestProvider = ({ children }) => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const idProofTypes = ['AADHAR', 'PAN', 'Passport', 'Driving License', 'Voter ID'];
  const guestTypes = ['Regular', 'VIP', 'Corporate'];

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    const { data, error } = await getGuests();
    if (error) {
      console.error('Error loading guests:', error);
    } else {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const addGuest = async (guest) => {
    const { data, error } = await createGuestAPI(guest);
    if (error) {
      console.error('Error creating guest:', error);
      alert('Failed to create guest: ' + error.message);
      return null;
    }
    setGuests([data[0], ...guests]);
    return data[0];
  };

  const updateGuest = async (id, updatedGuest) => {
    const { error } = await updateGuestAPI(id, updatedGuest);
    if (error) {
      console.error('Error updating guest:', error);
      alert('Failed to update guest: ' + error.message);
      return;
    }
    setGuests(guests.map(guest => 
      guest.id === id ? { ...guest, ...updatedGuest } : guest
    ));
  };

  const deleteGuest = async (id) => {
    const { error } = await deleteGuestAPI(id);
    if (error) {
      console.error('Error deleting guest:', error);
      alert('Cannot delete guest: ' + error.message);
      return;
    }
    setGuests(guests.filter(guest => guest.id !== id));
  };

  const getGuestByPhone = (phone) => {
    return guests.find(guest => guest.phone === phone);
  };

  const getGuestByEmail = (email) => {
    return guests.find(guest => guest.email?.toLowerCase() === email.toLowerCase());
  };

  const updateGuestStats = async (guestId, bookingAmount) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    const updatedData = {
      total_bookings: guest.total_bookings + 1,
      total_spent: guest.total_spent + bookingAmount,
      last_visit: new Date().toISOString().split('T')[0],
      loyalty_points: guest.loyalty_points + Math.floor(bookingAmount / 100)
    };

    await updateGuest(guestId, updatedData);
  };

  const getGuestsByType = (type) => {
    return guests.filter(guest => guest.guest_type === type);
  };

  const getReturningGuests = () => {
    return guests.filter(guest => guest.total_bookings > 1);
  };

  const getTopGuests = (limit = 5) => {
    return [...guests]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, limit);
  };

  return (
    <GuestContext.Provider value={{
      guests,
      loading,
      idProofTypes,
      guestTypes,
      addGuest,
      updateGuest,
      deleteGuest,
      getGuestByPhone,
      getGuestByEmail,
      updateGuestStats,
      getGuestsByType,
      getReturningGuests,
      getTopGuests
    }}>
      {children}
    </GuestContext.Provider>
  );
};