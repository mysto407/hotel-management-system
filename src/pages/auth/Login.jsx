// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Hotel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const success = await login(demoEmail, demoPassword);
      if (!success) {
        setError('Demo login failed. Please make sure the demo accounts are created.');
      }
    } catch (err) {
      console.error('Quick login error:', err);
      setError('An error occurred: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Hotel className="h-12 w-12 text-primary" />
            <CardTitle className="text-3xl font-bold">Hotel Manager</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
                required
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 bg-muted/30 p-6 rounded-b-lg">
           <div>
            <p className="text-sm font-semibold text-center">Demo Accounts:</p>
            <p className="text-xs text-muted-foreground text-center">
              Click to quick login
            </p>
           </div>
          <div className="w-full flex flex-col gap-2">
            <Button
              onClick={() => quickLogin('admin@hotel.com', 'admin123')}
              variant="secondary"
              className="w-full"
              disabled={loading}
              type="button"
            >
              🔐 Admin Login
            </Button>
            <Button
              onClick={() => quickLogin('frontdesk@hotel.com', 'front123')}
              variant="secondary"
              className="w-full"
              disabled={loading}
              type="button"
            >
              👤 Front Desk Login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;