// src/components/layout/Header.jsx
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';

export const Header = ({ onMenuClick, pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      
      <h1 className="text-2xl font-semibold">{pageTitle}</h1>
      
      <div className="ml-auto flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="font-medium">{user?.name}</span>
          <span className="text-sm text-muted-foreground">{user?.role}</span>
        </div>
        <Button onClick={logout} variant="ghost" size="icon" title="Logout">
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
};