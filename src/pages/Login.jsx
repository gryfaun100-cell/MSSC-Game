import React, { useState } from 'react';
import { API_URL } from '../config';

export default function Login({ onLogin }) {
  const [modalType, setModalType] = useState(null); // 'guest' or 'host'
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (modalType === 'host') {
        const res = await fetch(`${API_URL}/api/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (data.success) onLogin(data.user);
        else setError(data.error || 'Invalid credentials');
      } else {
        if (!form.name.trim()) return setError('Full name is required.');
        const res = await fetch(`${API_URL}/api/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, company: form.company }),
        });
        const data = await res.json();
        if (data.success) onLogin(data.user);
        else setError(data.error || 'Guest join failed');
      }
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  const closeModal = () => { setModalType(null); setError(''); };

  return (
    <div className="auth-bg">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/MSSC - Logo.png" alt="MSSC Logo" style={{ height: 64, marginBottom: 12, filter: 'drop-shadow(0 4px 16px rgba(37,99,235,0.25))' }} />
        <div style={{ fontSize: 13, color: 'var(--bg-white)', fontWeight: 500 }}>Duck Race — Multiplayer Quiz Game</div>
      </div>

      <div className="auth-card" style={{ padding: '40px 32px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: 'var(--primary)' }}>Join Game</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32, fontSize: 14 }}>Select how you want to proceed</p>

        <button 
          className="btn btn-primary-full" 
          style={{ height: 52, fontSize: 16, marginBottom: 16, background: 'linear-gradient(135deg, var(--primary), var(--purple))', border: 'none', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
          onClick={() => setModalType('guest')}
        >
          🦆 Continue as Guest
        </button>

        <button 
          className="btn" 
          style={{ width: '100%', background: 'transparent', color: 'var(--text-light)', border: 'none', fontSize: 13, fontWeight: 500, textDecoration: 'underline', opacity: 0.8 }}
          onClick={() => setModalType('host')}
        >
          Login as Host
        </button>
      </div>

      {modalType && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">{modalType === 'host' ? 'Host Login' : 'Guest Details'}</span>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                {modalType === 'host' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Username / Email</label>
                      <input className="form-input" type="text" placeholder="Enter username or email"
                        value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoFocus />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Password</label>
                      <div className="input-wrapper">
                        <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Enter password"
                          value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                        <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Full Name <span style={{color:'var(--danger)'}}>*</span></label>
                      <input className="form-input" type="text" placeholder="Your full name"
                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Company Name <span style={{color:'var(--text-light)',fontWeight:400,textTransform:'none'}}>(optional)</span></label>
                      <input className="form-input" type="text" placeholder="Your company name"
                        value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary-full" disabled={loading}>
                  {loading ? 'Processing…' : (modalType === 'host' ? 'Login' : 'Join Game')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-light)' }}>© 2026 Mustard Seed Systems Corporation</p>
    </div>
  );
}
