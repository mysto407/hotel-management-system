// src/components/layout/Layout.jsx
import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import Dashboard from '../../pages/dashboard/Dashboard';
import RoomTypes from '../../pages/rooms/RoomTypes';
import Rooms from '../../pages/rooms/Rooms';
import RoomStatus from '../../pages/rooms/RoomStatus';
import Reservations from '../../pages/reservations/Reservations';
import ReservationCalendar from '../../pages/reservations/ReservationCalendar';
import Billing from '../../pages/billing/Billing';
import Reports from '../../pages/reports/Reports';
import Inventory from '../../pages/inventory/Inventory';
import Guests from '../../pages/guests/Guests';
import Agents from '../../pages/agents/Agents';
import Expenses from '../../pages/expenses/Expenses';
import SettingsPage from '../../pages/settings/Settings';
import { cn } from '@/lib/utils';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Listen for sidebar collapse changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    };

    // Custom event for same-tab updates
    window.addEventListener('sidebarCollapseChange', handleStorageChange);
    // Storage event for cross-tab updates
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('sidebarCollapseChange', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const pages = {
    dashboard: <Dashboard />,
    'room-types': <RoomTypes />,
    rooms: <Rooms />,
    'room-status': <RoomStatus />,
    reservations: <Reservations />,
    'reservation-calendar': <ReservationCalendar />,
    billing: <Billing />,
    reports: <Reports />,
    inventory: <Inventory />,
    guests: <Guests />,
    agents: <Agents />,
    expenses: <Expenses />,
    settings: <SettingsPage />
  };

  const getPageTitle = () => {
    const pageTitles = {
      'dashboard': 'Dashboard',
      'room-types': 'Room Types',
      'rooms': 'Rooms',
      'room-status': 'Room Status',
      'reservations': 'Reservations',
      'reservation-calendar': 'Reservation Calendar',
      'billing': 'Billing',
      'reports': 'Reports',
      'inventory': 'Inventory',
      'guests': 'Guests',
      'agents': 'Agents',
      'expenses': 'Expenses',
      'settings': 'Settings'
    };
    return pageTitles[currentPage] || 'Dashboard';
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        <Header
          pageTitle={getPageTitle()}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6">
          {pages[currentPage]}
        </main>
      </div>
    </div>
  );
};