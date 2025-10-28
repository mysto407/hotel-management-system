import { useState } from 'react';
import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, X, Building2, DoorOpen, UserCog, CreditCard, FileText, CalendarDays, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  const [expandedCategories, setExpandedCategories] = useState({
    'Room Management': true,
    'Reservations': true,
    'Guests & Agents': true,
    'Financial': true,
    'Operations': true
  });
  
  const menuCategories = [
    {
      category: null, // No category for Dashboard
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
      category: null, // No category for Settings
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

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
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
              {/* Category with Collapse Toggle */}
              {category.category ? (
                <>
                  <button
                    className="nav-category-toggle"
                    onClick={() => toggleCategory(category.category)}
                  >
                    <span className="nav-category-label">{category.category}</span>
                    <ChevronDown 
                      size={16} 
                      style={{
                        transform: expandedCategories[category.category] ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </button>
                  
                  {/* Collapsible Category Items */}
                  {expandedCategories[category.category] && (
                    <div className="nav-category-items">
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
                    </div>
                  )}
                </>
              ) : (
                // Items without category (Dashboard & Settings)
                <>
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
                </>
              )}
              
              {/* Category Separator */}
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