import { useState } from 'react';
import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, X, Building2, DoorOpen, UserCog, CreditCard, FileText, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  
  // Load sidebar collapsed state from localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // All categories collapsed by default
  const [expandedCategories, setExpandedCategories] = useState({
    'Room Management': false,
    'Reservations': false,
    'Guests & Agents': false,
    'Financial': false,
    'Operations': false
  });
  
  const menuCategories = [
    {
      category: null,
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
      category: null,
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] }
      ]
    }
  ];

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

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <>
      {isOpen && <div className="overlay mobile-only" onClick={onClose} />}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Hotel size={32} />
            {!sidebarCollapsed && <span>HMS</span>}
          </div>
          <button onClick={onClose} className="close-btn mobile-only">
            <X size={24} />
          </button>
        </div>
        
        {/* Collapse/Expand Toggle Button */}
        <button 
          className="sidebar-collapse-btn desktop-only" 
          onClick={toggleSidebarCollapse}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        
        <nav className="sidebar-nav">
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {category.category ? (
                <>
                  <button
                    className="nav-category-toggle"
                    onClick={() => toggleCategory(category.category)}
                    title={sidebarCollapsed ? category.category : ''}
                  >
                    {!sidebarCollapsed && (
                      <>
                        <span className="nav-category-label">{category.category}</span>
                        <ChevronDown 
                          size={16} 
                          style={{
                            transform: expandedCategories[category.category] ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </>
                    )}
                    {sidebarCollapsed && (
                      <div className="collapsed-category-icon">
                        {category.items[0] && (() => {
                          const Icon = category.items[0].icon;
                          return <Icon size={20} />;
                        })()}
                      </div>
                    )}
                  </button>
                  
                  {!sidebarCollapsed && expandedCategories[category.category] && (
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
                  
                  {sidebarCollapsed && (
                    <div className="collapsed-category-items">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`nav-item collapsed ${currentPage === item.id ? 'active' : ''}`}
                            title={item.label}
                          >
                            <Icon size={20} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`nav-item ${currentPage === item.id ? 'active' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
                        title={sidebarCollapsed ? item.label : ''}
                      >
                        <Icon size={20} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </>
              )}
              
              {categoryIndex < filteredCategories.length - 1 && !sidebarCollapsed && (
                <div className="nav-separator"></div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};