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
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Demo account quick login
  const quickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const success = await login(demoEmail, demoPassword);
      if (!success) {
        setError('Demo login failed. Please contact administrator.');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Hotel className="login-icon" size={48} />
          <h1>Hotel Manager</h1>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter email"
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
              onKeyPress={handleKeyPress}
              placeholder="Enter password"
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
          <p><strong>Demo Accounts:</strong></p>
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
            Click to quick login with demo credentials
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => quickLogin('admin@hotel.com', 'admin123')}
              className="btn-secondary btn-block"
              disabled={loading}
              type="button"
            >
              🔐 Admin Login
            </button>
            <button
              onClick={() => quickLogin('frontdesk@hotel.com', 'front123')}
              className="btn-secondary btn-block"
              disabled={loading}
              type="button"
            >
              👤 Front Desk Login
            </button>
          </div>
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
            Make sure you've created these accounts in Supabase first
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;