// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Hotel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
      console.log('Attempting login with:', email);
      const success = await login(email, password);
      console.log('Login result:', success);
      
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
      console.log('Quick login attempt for:', demoEmail);
      const success = await login(demoEmail, demoPassword);
      console.log('Quick login result:', success);
      
      if (!success) {
        setError('Demo login failed. Please make sure the demo accounts are created in Supabase Authentication.');
      }
    } catch (err) {
      console.error('Quick login error:', err);
      setError('An error occurred: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Hotel size={40} />
          </div>
          <h1>Hotel Manager</h1>
          <p>Welcome back! Please login to your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button 
            type="submit" 
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-demo">
          <p><strong>🚀 Demo Accounts</strong></p>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
            Quick access for testing (accounts must exist in Supabase)
          </p>
          <div>
            <button
              onClick={() => quickLogin('admin@hotel.com', 'admin123')}
              className="btn-secondary"
              disabled={loading}
              type="button"
            >
              🔐 Admin Login
            </button>
            <button
              onClick={() => quickLogin('frontdesk@hotel.com', 'front123')}
              className="btn-secondary"
              disabled={loading}
              type="button"
            >
              👤 Front Desk Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;