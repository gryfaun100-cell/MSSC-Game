import React, { useState } from 'react';
import { API_URL } from '../config';

const PARTICLES = Array.from({ length: 15 }).map((_, i) => {
  const size = Math.random() * 8 + 4;
  return (
    <div key={`p-${i}`} className="particle" style={{
      width: size, height: size,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 10 + 10}s`,
      animationDelay: `${Math.random() * 5}s`
    }} />
  );
});

const DUCKS = Array.from({ length: 4 }).map((_, i) => (
  <div key={`d-${i}`} className="duck-float" style={{
    left: `${Math.random() * 90 + 5}%`,
    animationDuration: `${Math.random() * 15 + 15}s`,
    animationDelay: `${Math.random() * 10}s`,
    fontSize: Math.random() * 16 + 20
  }}>🦆</div>
));

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
      <div className="particles-container">
        {PARTICLES}
        {DUCKS}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32, zIndex: 1 }}>
        <img src="/MSSC - Logo.png" alt="MSSC Logo" style={{ height: 72, marginBottom: 16, filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: 600, letterSpacing: '0.5px' }}>Multiplayer Quiz Game</div>
      </div>

      <div className="auth-card" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: 99, fontSize: 12, color: 'white', fontWeight: 600, marginBottom: 20, border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }}></span>
            12 Players Online
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 8, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>Join Game</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.5 }}>Join a live quiz and race your duck to the finish! 🏆</p>
        </div>

        <button 
          className="btn-guest" 
          onClick={() => setModalType('guest')}
        >
          <span style={{ fontSize: 22 }}>🦆</span> Continue as Guest
        </button>

        <button 
          className="btn-host" 
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

      <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, zIndex: 1 }}>© 2026 Mustard Seed Systems Corporation</p>
    </div>
  );
}
