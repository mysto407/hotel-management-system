// src/components/layout/Header.jsx
import { useState } from 'react';
import {
  Menu, LogOut, Hotel, Search, Home, Calendar, CalendarDays,
  Building2, DoorOpen, Users, UserCog, CreditCard, FileText, BarChart3, Package, Settings, Tag, CircleUser, Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../common/ThemeToggle';

export const Header = ({ currentPage, onNavigate, searchTerm, onSearchChange }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'reservations', label: 'Reservation', icon: Calendar },
    { id: 'reservation-calendar', label: 'Calendar', icon: CalendarDays }
  ];

  // All navigation items organized by category
  const allNavCategories = [
    {
      category: 'Room Management',
      items: [
        { id: 'room-types', label: 'Room Types', icon: Building2, roles: ['Admin'] },
        { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['Admin', 'Front Desk'] }
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
        { id: 'discounts', label: 'Discounts', icon: Tag, roles: ['Admin', 'Front Desk'] },
        { id: 'expenses', label: 'Expenses', icon: FileText, roles: ['Admin', 'Accounts'] },
        { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['Admin', 'Accounts'] }
      ]
    },
    {
      category: 'Operations',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Package, roles: ['Admin', 'Store'] }
      ]
    }
  ];

  const filteredCategories = allNavCategories
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.roles.includes(user?.role))
    }))
    .filter(category => category.items.length > 0);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
        {/* Left Section: Hamburger + Hotel Name */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <Hotel className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:block">Hotel Manager</span>
          </div>
        </div>

        {/* Middle Section: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search guests, rooms, reservations..."
              className="pl-9 w-full"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Right Section: Navigation Items (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "gap-2",
                  isActive && "bg-primary/10 text-primary"
                )}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* New Booking Button */}
        <Button
          onClick={() => onNavigate('new-reservation')}
          size="sm"
          className="hidden sm:flex gap-2"
        >
          <Plus size={18} />
          <span className="hidden md:inline">New Booking</span>
        </Button>

        {/* User Menu */}
        <div className="ml-2 lg:ml-4 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <CircleUser className="h-6 w-6" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-sm">Dark Mode</span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Full Navigation Menu (Hamburger) */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 top-16 z-20 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-72 bg-background border-r shadow-xl overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Dashboard */}
              <div>
                <Button
                  variant={currentPage === 'dashboard' ? "secondary" : "ghost"}
                  size="lg"
                  className={cn(
                    "w-full justify-start gap-3",
                    currentPage === 'dashboard' && "bg-primary/10 text-primary"
                  )}
                  onClick={() => handleNavigate('dashboard')}
                >
                  <Home size={20} />
                  <span>Dashboard</span>
                </Button>
              </div>

              {/* Categories */}
              {filteredCategories.map((category, idx) => (
                <div key={idx}>
                  <h3 className="px-3 mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    {category.category}
                  </h3>
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "secondary" : "ghost"}
                          size="lg"
                          className={cn(
                            "w-full justify-start gap-3",
                            isActive && "bg-primary/10 text-primary"
                          )}
                          onClick={() => handleNavigate(item.id)}
                        >
                          <Icon size={20} />
                          <span>{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Settings */}
              <div>
                <div className="h-px bg-border mb-4" />
                <Button
                  variant={currentPage === 'settings' ? "secondary" : "ghost"}
                  size="lg"
                  className={cn(
                    "w-full justify-start gap-3",
                    currentPage === 'settings' && "bg-primary/10 text-primary"
                  )}
                  onClick={() => handleNavigate('settings')}
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};