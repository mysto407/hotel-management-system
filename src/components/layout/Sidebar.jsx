import { useState, useEffect } from 'react';
import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, X, Building2, DoorOpen, UserCog, CreditCard, FileText, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './sidebar.module.css'; // Import the CSS module

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Load sidebar collapsed state from localStorage (desktop only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // All categories collapsed by default (desktop only)
  const [expandedCategories, setExpandedCategories] = useState({
    'Room Management': false,
    'Reservations': false,
    'Guests & Agents': false,
    'Financial': false,
    'Operations': false
  });
  
  // Simple flat menu for mobile (original style)
  const flatMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['Admin', 'Front Desk', 'Accounts'] },
    { id: 'room-types', label: 'Room Types', icon: Building2, roles: ['Admin'] },
    { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['Admin', 'Front Desk'] },
    { id: 'room-status', label: 'Room Status', icon: Hotel, roles: ['Admin', 'Front Desk'] },
    { id: 'reservations', label: 'Reservations', icon: Calendar, roles: ['Admin', 'Front Desk'] },
    { id: 'reservation-calendar', label: 'Booking Calendar', icon: CalendarDays, roles: ['Admin', 'Front Desk'] },
    { id: 'billing', label: 'Billing', icon: CreditCard, roles: ['Admin', 'Front Desk', 'Accounts'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Accounts'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['Admin', 'Store'] },
    { id: 'guests', label: 'Guests', icon: Users, roles: ['Admin', 'Front Desk'] },
    { id: 'agents', label: 'Agents', icon: UserCog, roles: ['Admin', 'Front Desk'] },
    { id: 'expenses', label: 'Expenses', icon: FileText, roles: ['Admin', 'Accounts'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] }
  ];
  
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
  
  const filteredFlatItems = flatMenuItems.filter(item => item.roles.includes(user?.role));
  
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

  // --- Compile class names ---
  const sidebarClasses = [
    styles.sidebar,
    isOpen ? styles.open : '',
    !isMobile && sidebarCollapsed ? styles.collapsed : ''
  ].filter(Boolean).join(' ');

  // Mobile: Render simple flat menu
  if (isMobile) {
    return (
      <>
        {isOpen && <div className={`${styles.overlay} ${styles.mobileOnly}`} onClick={onClose} />}
        
        <aside className={sidebarClasses}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogo}>
              <Hotel size={32} />
              <span>HMS</span>
            </div>
            <button onClick={onClose} className={`${styles.closeBtn} ${styles.mobileOnly}`}>
              <X size={24} />
            </button>
          </div>
          
          <nav className={styles.sidebarNav}>
            {filteredFlatItems.map((item) => {
              const Icon = item.icon;
              const itemClasses = [
                styles.navItem,
                currentPage === item.id ? styles.active : ''
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={itemClasses}
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
  }

  // Desktop: Render categorized collapsible menu
  return (
    <>
      {/* Overlay is not used in desktop mode, but kept for consistency if needed */}
      
      <aside className={sidebarClasses}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <Hotel size={32} />
            {!sidebarCollapsed && <span>HMS</span>}
          </div>
          {/* Close button is mobile only, so not rendered here */}
        </div>
        
        {/* Collapse/Expand Toggle Button */}
        <button 
          className={styles.sidebarCollapseBtn} 
          onClick={toggleSidebarCollapse}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        
        <nav className={styles.sidebarNav}>
          {filteredCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {category.category ? (
                <>
                  <button
                    className={styles.navCategoryToggle}
                    onClick={() => toggleCategory(category.category)}
                    title={sidebarCollapsed ? category.category : ''}
                  >
                    {!sidebarCollapsed && (
                      <>
                        <span className={styles.navCategoryLabel}>{category.category}</span>
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
                      <div className={styles.collapsedCategoryIcon}>
                        {category.items[0] && (() => {
                          const Icon = category.items[0].icon;
                          return <Icon size={20} />;
                        })()}
                      </div>
                    )}
                  </button>
                  
                  {!sidebarCollapsed && expandedCategories[category.category] && (
                    <div className={styles.navCategoryItems}>
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const itemClasses = [
                          styles.navItem,
                          currentPage === item.id ? styles.active : ''
                        ].filter(Boolean).join(' ');
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={itemClasses}
                          >
                            <Icon size={20} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {sidebarCollapsed && (
                    <div className={styles.collapsedCategoryItems}>
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const itemClasses = [
                          styles.navItem,
                          styles.collapsed,
                          currentPage === item.id ? styles.active : ''
                        ].filter(Boolean).join(' ');
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={itemClasses}
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
                    const itemClasses = [
                      styles.navItem,
                      currentPage === item.id ? styles.active : '',
                      sidebarCollapsed ? styles.collapsed : ''
                    ].filter(Boolean).join(' ');
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={itemClasses}
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
                <div className={styles.navSeparator}></div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
