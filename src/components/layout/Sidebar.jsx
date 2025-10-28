import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, X, Building2, DoorOpen, UserCog, CreditCard, FileText, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  
  const menuCategories = [
    {
      category: null, // No category label for Dashboard
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['Admin', 'Front Desk', 'Accounts'] }
      ]
    },
    {
      category: 'Room Management',
      items: [
        { id: 'room-types', label: 'Room Types', icon: Building2, roles: ['Admin'] },
        { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['Admin', 'Front Desk'] },
        { id: 'room-status', label: 'Room Status', icon: Hotel, roles: ['Admin', 'Front Desk'] }
      ]
    },
    {
      category: 'Reservations',
      items: [
        { id: 'reservations', label: 'Bookings', icon: Calendar, roles: ['Admin', 'Front Desk'] },
        { id: 'reservation-calendar', label: 'Calendar View', icon: CalendarDays, roles: ['Admin', 'Front Desk'] }
      ]
    },
    {
      category: 'Guests & Agents',
      items: [
        { id: 'guests', label: 'Guests', icon: Users, roles: ['Admin', 'Front Desk'] },
        { id: 'agents', label: 'Agents', icon: UserCog, roles: ['Admin', 'Front Desk'] }
      ]
    },
    {
      category: 'Financial',
      items: [
        { id: 'billing', label: 'Billing', icon: CreditCard, roles: ['Admin', 'Front Desk', 'Accounts'] },
        { id: 'expenses', label: 'Expenses', icon: FileText, roles: ['Admin', 'Accounts'] },
        { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Accounts'] }
      ]
    },
    {
      category: 'Operations',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Package, roles: ['Admin', 'Store'] }
      ]
    },
    {
      category: null, // No category label for Settings
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] }
      ]
    }
  ];

  // Filter categories and items based on user role
  const filteredCategories = menuCategories
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.roles.includes(user?.role))
    }))
    .filter(category => category.items.length > 0);
  
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
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category Label */}
              {category.category && (
                <div className="nav-category-label">
                  {category.category}
                </div>
              )}
              
              {/* Category Items */}
              {category.items.map((item) => {
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
              
              {/* Category Separator (except for last category) */}
              {categoryIndex < filteredCategories.length - 1 && (
                <div className="nav-separator"></div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};