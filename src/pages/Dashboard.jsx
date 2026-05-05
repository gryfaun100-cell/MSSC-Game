import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Clock, Hash, LogOut, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';
import { socket } from '../socket';

function ConfirmModal({ title, message, confirmText, confirmColor, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360, padding: 24, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn" style={{ flex: 1, background: confirmColor, color: '#fff', border: 'none' }} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavBar({ user, onLogout }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  return (
    <>
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12, marginLeft: 4 }}>
            <div className="navbar-title">Game System</div>
            <div className="navbar-subtitle">Player</div>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-badge">
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
    {showLogoutModal && (
      <ConfirmModal 
        title="Log Out" 
        message="Are you sure you want to log out?" 
        confirmText="Log Out" 
        confirmColor="var(--danger)" 
        onConfirm={onLogout} 
        onClose={() => setShowLogoutModal(false)} 
      />
    )}
    </>
  );
}

const DUCK_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#8b5cf6', '#fbbf24', '#94a3b8', '#14b8a6', '#d946ef', '#78350f', '#0f172a', '#f8fafc', '#1e3a8a', '#fb7185'];
const ACCESSORIES = ['none', '🎩', '👑', '🧢', '🎀', '🕶️', '🎓', '🤠', '🌸', '🎧'];

export default function Dashboard({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [joinModal, setJoinModal] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/rooms`).then(r => r.json()).then(setRooms);
    const onRoomsUpdated = (newRooms) => setRooms(newRooms);
    socket.on('roomsUpdated', onRoomsUpdated);
    return () => socket.off('roomsUpdated', onRoomsUpdated);
  }, []);

  const getBadge = (status) => {
    if (status === 'waiting') return <span className="badge badge-waiting">Waiting</span>;
    if (status === 'playing') return <span className="badge badge-live">LIVE 🔴</span>;
    return <span className="badge badge-finished">Finished</span>;
  };

  return (
    <div className="core-bg-light" style={{ minHeight: '100vh' }}>
      <NavBar user={user} onLogout={onLogout} />

      <div className="container-sm">
        <div className="section-header">
          <div>
            <h2 className="section-title">🦆 Game Rooms</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Join a room to race your duck!</p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🦆</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No active rooms</div>
            <div className="empty-state-text">Waiting for the host to create a game room.</div>
          </div>
        ) : (
          <div className="room-list">
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#dbeafe,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🦆</div>
                <div className="room-info">
                  <div className="room-name">{room.name} {getBadge(room.status)}</div>
                  <div className="room-meta">
                    <span>👤 {room.playerCount} players</span>
                    <span>⏱ {room.timePerQuestion ?? 30}s/question</span>
                  </div>
                </div>
                <div className="room-actions">
                  <button
                    className={room.status === 'waiting' || room.status === 'playing' ? 'btn btn-primary' : 'btn btn-outline'}
                    disabled={room.status === 'finished'}
                    onClick={() => {
                      if (room.status === 'waiting' || room.status === 'playing') {
                        setJoinModal(room);
                        const avail = DUCK_COLORS.find(c => !room.usedColors?.includes(c));
                        setSelectedColor(avail || DUCK_COLORS[0]);
                      }
                    }}
                    style={{ fontSize: 13 }}
                  >
                    {room.status === 'waiting' ? '🦆 Join Game' : room.status === 'playing' ? '🦆 Join Late' : 'Finished'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {joinModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setJoinModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">Join Game Room</span>
              <button className="modal-close" onClick={() => setJoinModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '8px 0 10px', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block', fontSize: 56, marginBottom: 12, filter: `drop-shadow(0 0 8px ${selectedColor})` }}>
                  🦆
                  {selectedAccessory !== 'none' && (
                    <span style={{ position: 'absolute', top: -16, right: -4, fontSize: 32, transform: 'rotate(15deg)' }}>{selectedAccessory}</span>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{joinModal.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{joinModal.playerCount} player(s) waiting</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>Choose your Duck Color:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {DUCK_COLORS.map(c => {
                    const isUsed = joinModal.usedColors?.includes(c);
                    return (
                      <button key={c} disabled={isUsed} onClick={() => setSelectedColor(c)}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: selectedColor === c ? '3px solid #0f172a' : '2px solid transparent', opacity: isUsed ? 0.2 : 1, cursor: isUsed ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: selectedColor === c ? '0 0 0 2px white inset' : 'none' }} />
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>Choose an Accessory:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {ACCESSORIES.map(acc => (
                    <button key={acc} onClick={() => setSelectedAccessory(acc)}
                      style={{ width: 36, height: 36, borderRadius: '50%', background: selectedAccessory === acc ? '#bfdbfe' : 'transparent', border: selectedAccessory === acc ? '2px solid #2563eb' : '2px solid transparent', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {acc === 'none' ? '🚫' : acc}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: 'var(--primary-bg)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--primary-dark)', textAlign: 'center' }}>
                Joining as <strong>{user.name}</strong>. Get ready to race! 🏁
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setJoinModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { navigate(`/room/${joinModal.id}`, { state: { color: selectedColor, accessory: selectedAccessory } }); setJoinModal(null); }}>
                ▶ Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
