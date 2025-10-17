// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { ReservationProvider } from './context/ReservationContext';
import { BillingProvider } from './context/BillingContext';
import { InventoryProvider } from './context/InventoryContext';
import { GuestProvider } from './context/GuestContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/auth/Login';
import './styles/App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Layout />;
}

function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <ReservationProvider>
          <BillingProvider>
            <InventoryProvider>
              <GuestProvider>
                <AppContent />
              </GuestProvider>
            </InventoryProvider>
          </BillingProvider>
        </ReservationProvider>
      </RoomProvider>
    </AuthProvider>
  );
}

export default App;