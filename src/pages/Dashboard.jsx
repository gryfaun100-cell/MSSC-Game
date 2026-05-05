import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Clock, Hash, LogOut, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';
import { socket } from '../socket';

function ConfirmModal({ title, message, confirmText, confirmColor, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="modal" style={{ maxWidth: 360, padding: 32, textAlign: 'center', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#fff' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 28, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onClose}>Cancel</button>
          <button style={{ flex: 1, padding: 12, background: confirmColor, color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const DUCK_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#8b5cf6', '#fbbf24', '#94a3b8', '#14b8a6', '#d946ef', '#78350f', '#0f172a', '#f8fafc', '#1e3a8a', '#fb7185'];
const ACCESSORIES = ['none', '🎩', '👑', '🧢', '🎀', '🕶️', '🎓', '🤠', '🌸', '🎧'];

export default function Dashboard({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [joinModal, setJoinModal] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedAccessory, setSelectedAccessory] = useState('none');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/rooms`).then(r => r.json()).then(setRooms).catch(console.error);
    const onRoomsUpdated = (newRooms) => setRooms(newRooms);
    socket.on('roomsUpdated', onRoomsUpdated);
    return () => socket.off('roomsUpdated', onRoomsUpdated);
  }, []);

  return (
    <div className="game-dash-bg core-bg-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="dash-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="dash-particle" style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: `${Math.random() * 6 + 2}px`, height: `${Math.random() * 6 + 2}px`,
            animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 10 + 10}s`
          }} />
        ))}
      </div>

      <header className="topbar-neo" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.4))' }} />
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12, marginLeft: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>MSSC RACE</div>
            <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Player Hub</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, display: window.innerWidth < 600 ? 'none' : 'inline' }}>{user.name}</span>
          </div>
          <button style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowLogoutModal(true)}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 8, textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>🦆 Available Game Rooms</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>Select a room below to join the race.</p>
        </div>

        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15,23,42,0.4)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div className="empty-animate" style={{ fontSize: 80, marginBottom: 20, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>🦆</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>No Active Rooms</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, maxWidth: 400, margin: '0 auto' }}>Waiting for the host to create a game room. Grab a snack and check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {rooms.map(room => (
              <div key={room.id} className="room-card-neo">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{room.name}</h3>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>👥 {room.playerCount} players</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>⏱ {room.timePerQuestion ?? 30}s/q</span>
                    </div>
                  </div>
                  {room.status === 'playing' ? (
                    <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.3)', animation: 'pulse-fab 2s infinite' }}>🔴 LIVE</span>
                  ) : room.status === 'finished' ? (
                    <span style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>FINISHED</span>
                  ) : (
                    <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid rgba(56, 189, 248, 0.3)' }}>WAITING</span>
                  )}
                </div>
                
                <div style={{ marginTop: 24 }}>
                  <button 
                    disabled={room.status === 'finished'}
                    className={room.status === 'finished' ? '' : 'btn-neon'}
                    style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12, background: room.status === 'finished' ? 'rgba(255,255,255,0.05)' : '', color: room.status === 'finished' ? 'rgba(255,255,255,0.3)' : '', border: room.status === 'finished' ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: room.status === 'finished' ? 'not-allowed' : 'pointer' }}
                    onClick={() => {
                      if (room.status === 'waiting' || room.status === 'playing') {
                        setJoinModal(room);
                        const avail = DUCK_COLORS.find(c => !room.usedColors?.includes(c));
                        setSelectedColor(avail || DUCK_COLORS[0]);
                      }
                    }}
                  >
                    {room.status === 'waiting' ? '🦆 Join Game' : room.status === 'playing' ? '🦆 Join Late' : 'Finished'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {joinModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setJoinModal(null)} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="modal" style={{ maxWidth: 420, width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Join Game Room</span>
              <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' }} onClick={() => setJoinModal(null)}>✕</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', padding: '8px 0 16px', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block', fontSize: 64, marginBottom: 12, filter: `drop-shadow(0 0 16px ${selectedColor})`, transition: 'all 0.3s' }}>
                  🦆
                  {selectedAccessory !== 'none' && (
                    <span style={{ position: 'absolute', top: -16, right: -4, fontSize: 36, transform: 'rotate(15deg)' }}>{selectedAccessory}</span>
                  )}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{joinModal.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{joinModal.playerCount} player(s) joined</div>
              </div>
              
              <div style={{ marginBottom: 20, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>Color:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DUCK_COLORS.map(c => {
                    const isUsed = joinModal.usedColors?.includes(c);
                    return (
                      <button key={c} disabled={isUsed} onClick={() => setSelectedColor(c)}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: selectedColor === c ? '2px solid #fff' : '2px solid transparent', opacity: isUsed ? 0.2 : 1, cursor: isUsed ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: selectedColor === c ? '0 0 10px rgba(255,255,255,0.5)' : 'none' }} />
                    );
                  })}
                </div>
              </div>
              
              <div style={{ marginBottom: 20, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>Hat/Accessory:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ACCESSORIES.map(acc => (
                    <button key={acc} onClick={() => setSelectedAccessory(acc)}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: selectedAccessory === acc ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)', border: selectedAccessory === acc ? '1px solid #38bdf8' : '1px solid transparent', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {acc === 'none' ? '🚫' : acc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => setJoinModal(null)}>Cancel</button>
              <button className="btn-neon" style={{ padding: '12px 24px' }} onClick={() => { navigate(`/room/${joinModal.id}`, { state: { color: selectedColor, accessory: selectedAccessory } }); setJoinModal(null); }}>
                ▶ Join Race
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <ConfirmModal title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" confirmColor="#ef4444" onConfirm={onLogout} onClose={() => setShowLogoutModal(false)} />
      )}
    </div>
  );
}
