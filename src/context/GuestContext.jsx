// ==========================================
// FILE: src/context/GuestContext.jsx
// ==========================================
import { createContext, useContext, useState } from 'react';

const GuestContext = createContext();

export const useGuests = () => {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuests must be used within GuestProvider');
  return context;
};

export const GuestProvider = ({ children }) => {
  const [guests, setGuests] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
      idProofType: 'AADHAR',
      idProofNumber: 'AADHAR-1234',
      address: '123 Main Street, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      dateOfBirth: '1985-05-15',
      guestType: 'Regular',
      preferences: 'Early check-in preferred, Room with city view',
      notes: 'Returning guest, prefers non-smoking rooms',
      totalBookings: 3,
      totalSpent: 45000,
      lastVisit: '2025-10-14',
      createdAt: '2024-06-10',
      loyaltyPoints: 450
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '9876543211',
      idProofType: 'PAN',
      idProofNumber: 'PAN-5678',
      address: '456 Park Avenue, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      dateOfBirth: '1990-08-22',
      guestType: 'VIP',
      preferences: 'Vegan meals, Late checkout',
      notes: 'VIP guest, corporate bookings',
      totalBookings: 8,
      totalSpent: 128000,
      lastVisit: '2025-10-18',
      createdAt: '2023-03-15',
      loyaltyPoints: 1280
    },
    {
      id: 3,
      name: 'Robert Wilson',
      email: 'robert@company.com',
      phone: '9876543212',
      idProofType: 'Passport',
      idProofNumber: 'P-9876543',
      address: '789 Business District, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      dateOfBirth: '1982-12-10',
      guestType: 'Corporate',
      preferences: 'Business center access, Early breakfast',
      notes: 'Corporate account - TechCorp Ltd',
      totalBookings: 12,
      totalSpent: 180000,
      lastVisit: '2025-09-25',
      createdAt: '2022-11-20',
      loyaltyPoints: 1800
    }
  ]);

  const idProofTypes = ['AADHAR', 'PAN', 'Passport', 'Driving License', 'Voter ID'];
  const guestTypes = ['Regular', 'VIP', 'Corporate'];

  const addGuest = (guest) => {
    const newGuest = {
      ...guest,
      id: Date.now(),
      totalBookings: 0,
      totalSpent: 0,
      lastVisit: null,
      createdAt: new Date().toISOString().split('T')[0],
      loyaltyPoints: 0
    };
    setGuests([...guests, newGuest]);
    return newGuest;
  };

  const updateGuest = (id, updatedGuest) => {
    setGuests(guests.map(guest => 
      guest.id === id ? { ...guest, ...updatedGuest } : guest
    ));
  };

  const deleteGuest = (id) => {
    setGuests(guests.filter(guest => guest.id !== id));
  };

  const getGuestByPhone = (phone) => {
    return guests.find(guest => guest.phone === phone);
  };

  const getGuestByEmail = (email) => {
    return guests.find(guest => guest.email.toLowerCase() === email.toLowerCase());
  };

  const updateGuestStats = (guestId, bookingAmount) => {
    setGuests(guests.map(guest => {
      if (guest.id === guestId) {
        return {
          ...guest,
          totalBookings: guest.totalBookings + 1,
          totalSpent: guest.totalSpent + bookingAmount,
          lastVisit: new Date().toISOString().split('T')[0],
          loyaltyPoints: guest.loyaltyPoints + Math.floor(bookingAmount / 100)
        };
      }
      return guest;
    }));
  };

  const getGuestsByType = (type) => {
    return guests.filter(guest => guest.guestType === type);
  };

  const getReturningGuests = () => {
    return guests.filter(guest => guest.totalBookings > 1);
  };

  const getTopGuests = (limit = 5) => {
    return [...guests]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  };

  return (
    <GuestContext.Provider value={{
      guests,
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