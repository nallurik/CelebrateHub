import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeSelector from '../components/ThemeSelector';

export default function Login() {
  const { login, crewLogin } = useAuth();
  const [mode, setMode] = useState('admin'); // 'admin' or 'crew'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let result;
    if (mode === 'admin') {
      result = await login(username, password);
    } else {
      result = await crewLogin(phone, password);
    }
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-theme-corner"><ThemeSelector /></div>
      <div className="login-card">
        <div className="login-header">
          <h1>CelebrateHub</h1>
          <p className="muted">Every moment, perfectly planned</p>
        </div>
        <div className="login-tabs">
          <button className={`login-tab ${mode === 'admin' ? 'active' : ''}`} onClick={() => { setMode('admin'); setError(''); }}>Admin</button>
          <button className={`login-tab ${mode === 'crew' ? 'active' : ''}`} onClick={() => { setMode('crew'); setError(''); }}>Crew</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {mode === 'admin' ? (
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </label>
          ) : (
            <label>
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                required
                placeholder="Your registered phone"
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
