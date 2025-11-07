import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onMenuClick, pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button onClick={onMenuClick} className="menu-btn mobile-only">
            <Menu size={24} />
          </button>
          <h2>{pageTitle}</h2>
        </div>
        <div className="header-right">
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
          <button onClick={logout} className="logout-btn" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};