// ==========================================
// FILE: src/components/layout/Layout.jsx
// ==========================================
import { useState } from 'react';
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
import Agents from '../../pages/agents/Agents'; // ADD THIS LINE
import Expenses from '../../pages/expenses/Expenses';
import SettingsPage from '../../pages/settings/Settings';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    agents: <Agents />, // ADD THIS LINE
    expenses: <Expenses />,
    settings: <SettingsPage />
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="content">{pages[currentPage]}</main>
      </div>
    </div>
  );
};