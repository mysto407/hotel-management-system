import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (username, password) => {
    const users = {
      admin: { username: 'admin', password: 'admin123', role: 'Admin', name: 'Admin User' },
      frontdesk: { username: 'frontdesk', password: 'front123', role: 'Front Desk', name: 'Front Desk User' },
      accounts: { username: 'accounts', password: 'acc123', role: 'Accounts', name: 'Accounts User' }
    };

    const foundUser = Object.values(users).find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};