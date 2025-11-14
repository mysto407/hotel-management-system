// src/App.jsx
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { MealPlanProvider } from './context/MealPlanContext';
import { ReservationProvider } from './context/ReservationContext';
import { ReservationFlowProvider } from './context/ReservationFlowContext';
import { BillingProvider } from './context/BillingContext';
import { InventoryProvider } from './context/InventoryContext';
import { GuestProvider } from './context/GuestContext';
import { AgentProvider } from './context/AgentContext';
import { ExpenseProvider } from './context/ExpensesContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/auth/Login';
import { Loader2 } from 'lucide-react'; // Import a loading icon
// import './styles/App.css'; // REMOVE THIS LINE

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      // Use Tailwind for loading screen
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading...</p>
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
        <MealPlanProvider>
          <ReservationProvider>
            <ReservationFlowProvider>
              <BillingProvider>
                <InventoryProvider>
                  <GuestProvider>
                    <AgentProvider>
                      <ExpenseProvider>
                        <AppContent />
                      </ExpenseProvider>
                    </AgentProvider>
                  </GuestProvider>
                </InventoryProvider>
              </BillingProvider>
            </ReservationFlowProvider>
          </ReservationProvider>
        </MealPlanProvider>
      </RoomProvider>
    </AuthProvider>
  );
}
export default App;