// ==========================================
// FILE: src/pages/auth/Login.jsx
// ==========================================
import { useState } from 'react';
import { Hotel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = () => {
    setError('');
    if (login(username, password)) {
      setUsername('');
      setPassword('');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Hotel className="login-icon" size={48} />
          <h1>Hotel Manager</h1>
        </div>
        <div className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter username"
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
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button onClick={handleSubmit} className="btn-primary btn-block">
            Sign In
          </button>
        </div>
        <div className="login-demo">
          <p><strong>Demo Credentials:</strong></p>
          <p>Admin: admin / admin123</p>
          <p>Front Desk: frontdesk / front123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
