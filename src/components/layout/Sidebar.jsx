import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, X, Building2, DoorOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['Admin', 'Front Desk', 'Accounts'] },
    { id: 'room-types', label: 'Room Types', icon: Building2, roles: ['Admin'] },
    { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['Admin', 'Front Desk'] },
    { id: 'room-status', label: 'Room Status', icon: Hotel, roles: ['Admin', 'Front Desk'] },
    { id: 'reservations', label: 'Reservations', icon: Calendar, roles: ['Admin', 'Front Desk'] },
    { id: 'reservation-calendar', label: 'Booking Calendar', icon: Calendar, roles: ['Admin', 'Front Desk'] },
    { id: 'billing', label: 'Billing', icon: Receipt, roles: ['Admin', 'Front Desk', 'Accounts'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Accounts'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['Admin', 'Store'] },
    { id: 'guests', label: 'Guests', icon: Users, roles: ['Admin', 'Front Desk'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] }
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));
  
  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="overlay mobile-only" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Hotel size={32} />
            <span>HMS</span>
          </div>
          <button onClick={onClose} className="close-btn mobile-only">
            <X size={24} />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
