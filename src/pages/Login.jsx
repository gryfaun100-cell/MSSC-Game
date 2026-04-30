import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) onLogin(data.user);
      else setError(data.error || 'Invalid credentials');
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/MSSC - Logo.png" alt="MSSC Logo" style={{ height: 64, marginBottom: 12, filter: 'drop-shadow(0 4px 16px rgba(37,99,235,0.25))' }} />
        <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>Duck Race — Multiplayer Quiz Game</div>
      </div>

      <div className="auth-card">
        <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Sign In</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username / Email</label>
            <input className="form-input" type="text" placeholder="Enter your username or email"
              value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                </svg>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary-full" disabled={loading}>
            {loading ? 'Signing in…' : '→ Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register" className="link">Register</Link>
        </p>
      </div>
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-light)' }}>© 2026 Mustard Seed Systems Corporation</p>
    </div>
  );
}
