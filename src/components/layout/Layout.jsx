// src/components/layout/Layout.jsx
import { useState, useEffect, useRef } from 'react';
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

// Helper function to save scroll position
const saveScrollPosition = (page) => {
  const scrollPos = {
    x: window.scrollX,
    y: window.scrollY
  };
  sessionStorage.setItem(`scroll_${page}`, JSON.stringify(scrollPos));
};

// Helper function to restore scroll position
const restoreScrollPosition = (page) => {
  const saved = sessionStorage.getItem(`scroll_${page}`);
  if (saved) {
    try {
      const { x, y } = JSON.parse(saved);
      // Use setTimeout with a delay to ensure async content is loaded
      // Try multiple times to handle dynamic content loading
      const attemptScroll = (attempt = 0) => {
        if (attempt > 10) return; // Max 10 attempts (500ms total)

        setTimeout(() => {
          window.scrollTo(x, y);

          // Check if we've reached the desired position
          // If not, try again (content might still be loading)
          if (Math.abs(window.scrollY - y) > 10 && attempt < 10) {
            attemptScroll(attempt + 1);
          }
        }, attempt === 0 ? 0 : 50);
      };

      requestAnimationFrame(() => {
        attemptScroll();
      });
    } catch (e) {
      console.error('Error restoring scroll position:', e);
    }
  } else {
    // Scroll to top if no saved position
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }
};

export const Layout = () => {
  const [currentPage, setCurrentPage] = useState(getPageFromHash());
  const previousPageRef = useRef(currentPage);

  // Custom navigation handler that updates hash and saves scroll position
  const handleNavigate = (page) => {
    // Save scroll position of current page before navigating
    saveScrollPosition(previousPageRef.current);

    // Update hash (this will trigger the hashchange event)
    window.location.hash = page;

    // Update state
    setCurrentPage(page);
    previousPageRef.current = page;
  };

  // Listen for hash changes (browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash();
      saveScrollPosition(previousPageRef.current);
      setCurrentPage(newPage);
      previousPageRef.current = newPage;
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Restore scroll position when page changes
  useEffect(() => {
    restoreScrollPosition(currentPage);
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