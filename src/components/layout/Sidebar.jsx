// src/components/layout/Sidebar.jsx
import { useState, useEffect } from 'react';
import { Home, Calendar, Receipt, Package, Users, BarChart3, Settings, Hotel, Building2, DoorOpen, UserCog, CreditCard, FileText, CalendarDays, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Sidebar = ({ currentPage, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [expandedCategories, setExpandedCategories] = useState({
    'Room Management': false,
    'Reservations': false,
    'Guests & Agents': false,
    'Financial': false,
    'Operations': false
  });
  
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
    // Dispatch custom event to notify Layout component
    window.dispatchEvent(new Event('sidebarCollapseChange'));
  };

  // --- Mobile Sidebar ---
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
        
        {/* Mobile Sidebar Content */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r bg-background transition-transform duration-300 ease-in-out lg:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center border-b px-6">
            <Button onClick={onClose} variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
            {/* You can add a logo here if you want */}
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4">
            {filteredFlatItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "secondary" : "ghost"}
                  size="lg"
                  className="w-full justify-start gap-3"
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>
        </aside>
      </>
    );
  }

  // --- Desktop Sidebar ---
  return (
    <aside
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex h-screen flex-col border-r bg-background shadow-lg transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header Section */}
      <div className="flex h-16 items-center border-b px-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className={cn("flex items-center gap-3 flex-1", sidebarCollapsed && "justify-center")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Hotel className="h-7 w-7 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight">Hotel Manager</span>
                <span className="text-xs text-muted-foreground">Management System</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <Hotel className="h-7 w-7 text-primary" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebarCollapse}
          className="ml-auto"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu size={20} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto px-3 py-4 space-y-1", sidebarCollapsed && "px-2")}>
        {filteredCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className={cn(categoryIndex > 0 && "mt-4")}>
            {category.category ? (
              <Collapsible
                open={expandedCategories[category.category]}
                onOpenChange={() => toggleCategory(category.category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-muted/50",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    title={sidebarCollapsed ? category.category : ''}
                  >
                    {!sidebarCollapsed && (
                      <>
                        <span className="text-xs font-semibold uppercase text-muted-foreground/80 flex-1 text-left tracking-wide">
                          {category.category}
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            "transition-transform text-muted-foreground/60",
                            expandedCategories[category.category] && "rotate-180"
                          )}
                        />
                      </>
                    )}
                    {sidebarCollapsed && (
                      <div className="flex items-center justify-center h-6">
                        {category.items[0] && (() => {
                          const Icon = category.items[0].icon;
                          return <Icon size={18} className="text-muted-foreground/60" />;
                        })()}
                      </div>
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className={cn("space-y-0.5 mt-1", !sidebarCollapsed && "ml-0")}>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-3 font-medium transition-all",
                          sidebarCollapsed && "justify-center px-2",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm",
                          !isActive && "hover:bg-muted/70"
                        )}
                        title={sidebarCollapsed ? item.label : ''}
                        onClick={() => handleNavigate(item.id)}
                      >
                        <Icon size={20} className={isActive ? "text-primary" : ""} />
                        {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                      </Button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // Items without a category (like Dashboard, Settings)
              category.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11 px-3 font-medium transition-all",
                      sidebarCollapsed && "justify-center px-2",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm",
                      !isActive && "hover:bg-muted/70"
                    )}
                    title={sidebarCollapsed ? item.label : ''}
                    onClick={() => handleNavigate(item.id)}
                  >
                    <Icon size={22} className={isActive ? "text-primary" : ""} />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </Button>
                );
              })
            )}

            {categoryIndex < filteredCategories.length - 1 && !sidebarCollapsed && (
              <div className="py-3">
                <div className="h-px w-full bg-border/50"></div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className={cn("border-t p-4 bg-muted/30", sidebarCollapsed && "p-2")}>
        <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.role || 'Role'}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};