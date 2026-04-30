import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { socket } from '../socket';

function NavBar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, width: 'auto' }} />
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
          <button className="logout-btn" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [joinModal, setJoinModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/rooms`).then(r => r.json()).then(setRooms);
    socket.on('roomsUpdated', setRooms);
    return () => socket.off('roomsUpdated');
  }, []);

  const getBadge = (status) => {
    if (status === 'waiting') return <span className="badge badge-waiting">Waiting</span>;
    if (status === 'playing') return <span className="badge badge-live">LIVE 🔴</span>;
    return <span className="badge badge-finished">Finished</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
                    className={room.status === 'waiting' ? 'btn btn-primary' : 'btn btn-outline'}
                    disabled={room.status !== 'waiting'}
                    onClick={() => room.status === 'waiting' && setJoinModal(room)}
                    style={{ fontSize: 13 }}
                  >
                    {room.status === 'waiting' ? '🦆 Join Game' : room.status === 'playing' ? 'In Progress' : 'Finished'}
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
              <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🦆</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{joinModal.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{joinModal.playerCount} player(s) waiting</div>
              </div>
              <div style={{ background: 'var(--primary-bg)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--primary-dark)' }}>
                Joining as <strong>{user.name}</strong>. Get ready to race! 🏁
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setJoinModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { navigate(`/room/${joinModal.id}`); setJoinModal(null); }}>
                ▶ Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
