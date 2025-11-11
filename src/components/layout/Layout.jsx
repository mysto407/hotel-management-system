// src/components/layout/Layout.jsx
import { useState } from 'react';
import { Header } from './Header';
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

export const Layout = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <main className={`flex-1 ${currentPage === 'reservation-calendar' ? '' : 'p-4 md:p-6'}`}>
        {pages[currentPage]}
      </main>
    </div>
  );
};