import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ company: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Full name is required.');
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) navigate('/');
      else setError(data.error || 'Registration failed.');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img src="/MSSC - Logo.png" alt="MSSC Logo" style={{ height: 60, marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(37,99,235,0.2))' }} />
        <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500, marginTop: 4 }}>Create your player account</div>
      </div>

      <div className="auth-card">
        <h2 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24, color: 'var(--primary)' }}>Registration</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span style={{color:'var(--danger)'}}>*</span></label>
            <input className="form-input" name="name" type="text" placeholder="Your full name" onChange={onChange} required autoFocus />
          </div>
          <div className="form-group" style={{marginBottom:24}}>
            <label className="form-label">Company Name <span style={{color:'var(--text-light)',fontWeight:400,textTransform:'none'}}>(optional)</span></label>
            <input className="form-input" name="company" type="text" placeholder="Your company name" onChange={onChange} />
          </div>

          <button type="submit" className="btn btn-primary-full" disabled={loading}>
            {loading ? 'Creating account…' : '🦆 Create Player Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/" className="link">Sign In</Link>
        </p>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-light)' }}>© 2026 Mustard Seed Systems Corporation</p>
    </div>
  );
}
