// src/components/layout/Layout.jsx
import { useState, useEffect } from 'react';
import { Header } from './Header';
import Dashboard from '../../pages/dashboard/Dashboard';
import RoomTypes from '../../pages/rooms/RoomTypes';
import Rooms from '../../pages/rooms/Rooms';
import Reservations from '../../pages/reservations/Reservations';
import ReservationCalendar from '../../pages/reservations/ReservationCalendar';
import ReservationDetails from '../../pages/reservations/ReservationDetails';
import NewReservation from '../../pages/reservations/NewReservation';
import GuestDetailsPage from '../../pages/reservations/GuestDetailsPage';
import PaymentPage from '../../pages/reservations/PaymentPage';
import Billing from '../../pages/billing/Billing';
import Discounts from '../../pages/Discounts';
import Reports from '../../pages/reports/Reports';
import Inventory from '../../pages/inventory/Inventory';
import Guests from '../../pages/guests/Guests';
import Agents from '../../pages/agents/Agents';
import Expenses from '../../pages/expenses/Expenses';
import SettingsPage from '../../pages/settings/Settings';

// Helper function to get page from URL hash
const getPageFromHash = () => {
  const hash = window.location.hash.slice(1); // Remove the '#'
  return hash || 'dashboard';
};

export const Layout = () => {
  const [currentPage, setCurrentPage] = useState(getPageFromHash());

  // Custom navigation handler that updates hash
  const handleNavigate = (page) => {
    // Update hash (this will trigger the hashchange event)
    window.location.hash = page;
  };

  // Listen for hash changes (browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash();
      setCurrentPage(newPage);
      // Scroll to top on page change
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const pages = {
    dashboard: <Dashboard />,
    'room-types': <RoomTypes />,
    rooms: <Rooms />,
    reservations: <Reservations onNavigate={handleNavigate} />,
    'reservation-calendar': <ReservationCalendar />,
    'reservation-details': <ReservationDetails onNavigate={handleNavigate} />,
    'new-reservation': <NewReservation onNavigate={handleNavigate} />,
    'guest-details': <GuestDetailsPage onNavigate={handleNavigate} />,
    'payment': <PaymentPage onNavigate={handleNavigate} />,
    billing: <Billing />,
    discounts: <Discounts />,
    reports: <Reports />,
    inventory: <Inventory />,
    guests: <Guests />,
    agents: <Agents />,
    expenses: <Expenses />,
    settings: <SettingsPage />
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />
      <main className={`flex-1 ${['reservation-calendar', 'reservation-details', 'new-reservation', 'guest-details', 'payment'].includes(currentPage) ? '' : 'p-4 md:p-6'}`}>
        {pages[currentPage]}
      </main>
    </div>
  );
};