import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../config';
import { socket } from '../socket';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const QUESTION_TYPES = [
  { value: 'multiple',    label: '🔤 Multiple Choice' },
  { value: 'true_false',  label: '✅ True or False' },
  { value: 'fillblank',   label: '🖊️ Identification' },
  { value: 'enumeration', label: '📋 Enumeration' },
  { value: 'short_answer',label: '💬 Short Answer' },
  { value: 'ordering',    label: '🔢 Ordering' },
  { value: 'matching',    label: '🔗 Matching' },
];

function getDefaultOptions(type) {
  if (type === 'multiple')     return ['', '', '', ''];
  if (type === 'true_false')   return ['True', 'False'];
  if (type === 'ordering')     return ['', '', '', ''];
  if (type === 'matching')     return ['', '', '', ''];
  return [''];
}

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

function CreateRoomModal({ onClose, onCreated }) {
  const [roomName, setRoomName] = useState('');
  const [timePerQ, setTimePerQ] = useState(30);
  const [winScore, setWinScore] = useState(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!roomName.trim()) { setError("Please enter a room name."); return; }
    const t = parseInt(timePerQ, 10);
    if (isNaN(t) || t < 5) { setError("Timer must be at least 5 seconds."); return; }
    const w = parseInt(winScore, 10);
    if (isNaN(w) || w < 10) { setError("Win score must be at least 10 points."); return; }
    if (!socket.connected) { setError("Cannot connect to server. Is the backend running?"); return; }

    setLoading(true);
    onCreated({ roomName, timePerQuestion: t, winScore: w });
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <div className="modal-overlay" onClick={(e) => !loading && e.target === e.currentTarget && onClose()} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="modal" style={{ maxWidth: 460, width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>🎮 Create Game Room</span>
          {!loading && <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' }} onClick={onClose}>✕</button>}
        </div>
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto' }}>
          <div style={{ padding: '32px' }}>
            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>⚠️ {error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Room Name</label>
              <input style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 15, outline: 'none' }} type="text" placeholder="e.g. Training Quiz Round 1" value={roomName} onChange={(e) => setRoomName(e.target.value)} autoFocus disabled={loading} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Time per Question (seconds)</label>
              <input style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 15, outline: 'none' }} type="number" min={5} max={120} value={timePerQ} onChange={(e) => setTimePerQ(e.target.value)} disabled={loading} />
            </div>
            <div style={{ padding: '16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>🏆 Win Score (First to reach wins!)</label>
              <input style={{ width: '100%', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 12, fontSize: 15, outline: 'none', fontWeight: 700 }} type="number" min={10} max={10000} value={winScore} onChange={(e) => setWinScore(e.target.value)} disabled={loading} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginBottom: 0 }}>The first player to reach this score wins. Wrong answers deduct 20% of the question's points.</p>
            </div>
          </div>
          <div style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-neon" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [replayRoomId, setReplayRoomId] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [viewReview, setViewReview] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, matchingPairs: [['',''],['',''],['','']], type: 'multiple', points: 10, image: '' });
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [registeredPlayers, setRegisteredPlayers] = useState([]);

  const totalPlayers = rooms.reduce((s, r) => s + r.playerCount, 0);
  const activeGames = rooms.filter(r => r.status === 'playing').length;

  useEffect(() => {
    fetch(`${API_URL}/api/rooms`).then(r => r.json()).then(setRooms).catch(console.error);
    fetch(`${API_URL}/api/users`).then(r => r.json()).then(setRegisteredPlayers).catch(console.error);

    const onRoomsUpdated = (newRooms) => setRooms(newRooms);
    const onRoomCreated = (room) => {
      setExpandedRoom(room.id);
      setShowModal(false);
    };

    socket.on('roomsUpdated', onRoomsUpdated);
    socket.on('roomCreated', onRoomCreated);

    return () => {
      socket.off('roomsUpdated', onRoomsUpdated);
      socket.off('roomCreated', onRoomCreated);
    };
  }, []);

  const handleCreateRoom = ({ roomName, timePerQuestion, winScore }) => {
    socket.emit('createRoom', { roomName, timePerQuestion, winScore, questions: [] });
  };

  const addQuestion = () => {
    if (!qForm.text.trim()) return alert('Enter a question.');
    if ((qForm.type === 'multiple' || qForm.type === 'ordering') && qForm.options.some(o => typeof o !== 'string' || !o.trim())) return alert('Fill all answer options.');
    if (qForm.type === 'matching' && qForm.matchingPairs.some(([a,b]) => !a.trim() || !b.trim())) return alert('Fill all matching pairs.');
    if (['fillblank','enumeration','short_answer'].includes(qForm.type) && (!qForm.options[0] || !qForm.options[0].trim())) return alert('Provide at least one correct answer.');

    let newQuestions;
    if (editingQuestionId) {
      newQuestions = questions.map(q => q.id === editingQuestionId ? { ...qForm, id: q.id } : q);
    } else {
      newQuestions = [...questions, { ...qForm, id: Date.now() }];
    }

    setQuestions(newQuestions);
    setQForm({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, matchingPairs: [['',''],['',''],['','']], type: 'multiple', points: 10, image: '' });
    setEditingQuestionId(null);
    if (expandedRoom) socket.emit('updateRoomQuestions', { roomId: expandedRoom, questions: newQuestions });
  };

  const removeQuestion = (id) => {
    const newQuestions = questions.filter(q => q.id !== id);
    setQuestions(newQuestions);
    if (expandedRoom) socket.emit('updateRoomQuestions', { roomId: expandedRoom, questions: newQuestions });
  };

  const handleStartRoom = (roomId) => {
    if (questions.length === 0) return alert('Add at least one question before starting.');
    socket.emit('updateRoomQuestions', { roomId, questions });
    socket.emit('startGame', roomId);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="game-dash-bg core-bg-dark">
      <div className="dash-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="dash-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 10}s`
          }} />
        ))}
      </div>

      {/* Main Content */}
      <main className="game-main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="topbar-neo" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.4))' }} />
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12, marginLeft: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>MSSC RACE</div>
              <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Control Center</div>
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: 16 }}>
            <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveTab('dashboard')}>
              Dashboard
            </div>
            <div className={`nav-link ${activeTab === 'rooms' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveTab('rooms')}>
              Game Rooms
            </div>
            <div className={`nav-link ${activeTab === 'players' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => setActiveTab('players')}>
              Players
            </div>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, display: window.innerWidth < 600 ? 'none' : 'inline' }}>{user.name}</span>
            </div>
            <button style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="game-main-content">
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
                {[
                  { label: 'Total Rooms', value: rooms.length, color: '#38bdf8', icon: '🎮' },
                  { label: 'Active Games', value: activeGames, color: '#22c55e', icon: '🔴' },
                  { label: 'Total Players', value: totalPlayers, color: '#f59e0b', icon: '👥' },
                  { label: 'Questions', value: questions.reduce((s, r) => s + (r.questions?.length || 0), 0) || questions.length, color: '#a855f7', icon: '❓' },
                ].map((s, i) => (
                  <div key={i} className="glass-card">
                    <div className="stat-glow" style={{ background: s.color }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                        <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${s.color}80` }}>{s.value}</div>
                      </div>
                      <div style={{ fontSize: 48, opacity: 0.8, filter: `drop-shadow(0 0 10px ${s.color})` }}>{s.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Game Rooms List */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Active & Recent Rooms</h2>
              </div>
              
              {rooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15,23,42,0.4)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div className="empty-animate" style={{ fontSize: 80, marginBottom: 20, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}>🦆</div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>No Game Rooms Yet!</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Create your first room, add some exciting questions, and invite players to start the duck race!</p>
                  <button className="btn-neon" onClick={() => setShowModal(true)}>
                    <Plus size={18} strokeWidth={3} /> Create First Room
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                  {rooms.map(room => (
                    <div key={room.id} className="room-card-neo">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{room.name}</h3>
                          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>👥 {room.playerCount}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>❓ {room.questionCount ?? questions.length}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>⏱ {room.timePerQuestion ?? 30}s</span>
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
                      
                      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                        {room.status === 'waiting' && (
                          <>
                            <button style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background='rgba(255,255,255,0.15)'} onMouseOut={e => e.target.style.background='rgba(255,255,255,0.1)'} onClick={() => {
                              if (expandedRoom === room.id && !viewReview) { setExpandedRoom(null); }
                              else { setExpandedRoom(room.id); setViewReview(false); fetch(`${API_URL}/api/rooms/${room.id}`).then(r => r.json()).then(d => setQuestions(d.questions || [])); }
                            }}>❓ Edit Qs</button>
                            <button style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.4)', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.transform='translateY(-2px)'} onMouseOut={e => e.target.style.transform='translateY(0)'} onClick={() => handleStartRoom(room.id)}>
                              ▶ Start
                            </button>
                          </>
                        )}
                        {(room.status === 'playing' || room.status === 'finished') && (
                          <button style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }} onClick={() => navigate(`/room/${room.id}`)}>
                            {room.status === 'playing' ? '👁 Spectate' : '📊 View Results'}
                          </button>
                        )}
                        {room.status === 'finished' && (
                          <button style={{ padding: '10px 14px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 10, color: '#7dd3fc', fontWeight: 700, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                            onMouseOver={e => e.currentTarget.style.background='rgba(56,189,248,0.22)'}
                            onMouseOut={e => e.currentTarget.style.background='rgba(56,189,248,0.12)'}
                            onClick={() => {
                              setExpandedRoom(room.id);
                              setViewReview(false);
                              fetch(`${API_URL}/api/rooms/${room.id}`).then(r => r.json()).then(d => setQuestions(d.questions || []));
                            }}>
                            ✏️ Edit Qs
                          </button>
                        )}
                        {room.status === 'finished' && (
                          <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer' }} onClick={() => setReplayRoomId(room.id)}>🔄</button>
                        )}
                        <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: 10, color: '#ef4444', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background='rgba(239, 68, 68, 0.2)'} onMouseOut={e => e.target.style.background='rgba(239, 68, 68, 0.1)'} onClick={() => setDeleteRoomId(room.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'rooms' && (
            <div className="glass-card">
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Manage All Game Rooms</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>View is synced with Dashboard Overview.</p>
              <button className="btn-neon" style={{ marginTop: 16 }} onClick={() => { setActiveTab('dashboard'); setShowModal(true); }}>
                Create New Room
              </button>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Player Analytics</h2>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>View registered players who have accessed the game.</p>
                </div>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '8px 16px', borderRadius: 12, fontWeight: 700 }}>
                  Total: {registeredPlayers.length}
                </div>
              </div>
              
              {registeredPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 16 }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No players have registered yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Email / Username</th>
                        <th style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Company</th>
                        <th style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredPlayers.map((player, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '16px', fontWeight: 600, color: '#fff' }}>{player.name}</td>
                          <td style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>{player.email}</td>
                          <td style={{ padding: '16px', color: 'rgba(255,255,255,0.7)' }}>{player.company || '-'}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                              {player.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <button className="fab-neon" onClick={() => setShowModal(true)} title="Create Room">
        <Plus size={28} strokeWidth={3} />
      </button>

      {showModal && <CreateRoomModal onClose={() => setShowModal(false)} onCreated={handleCreateRoom} />}
      
      {deleteRoomId && (
        <ConfirmModal title="Delete Room" message="Are you sure you want to delete this room? This action cannot be undone." confirmText="Delete" confirmColor="#ef4444" onConfirm={() => { socket.emit('deleteRoom', deleteRoomId); setDeleteRoomId(null); }} onClose={() => setDeleteRoomId(null)} />
      )}
      {replayRoomId && (
        <div className="modal-overlay" onClick={() => setReplayRoomId(null)} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ maxWidth: 420, padding: 24, textAlign: 'center', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'white' }}>Replay Game</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>Reset the game state and play again. You can keep the existing players or start a fresh session.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button style={{ padding: 14, background: '#22c55e', color: 'white', fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer' }} onClick={() => { socket.emit('replayRoom', { roomId: replayRoomId, keepPlayers: true }); navigate(`/room/${replayRoomId}`); setReplayRoomId(null); }}>
                ▶ Replay with same players
              </button>
              <button style={{ padding: 14, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 600, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} onClick={() => { socket.emit('replayRoom', { roomId: replayRoomId, keepPlayers: false }); setReplayRoomId(null); }}>
                👥 Start new session (Clear players)
              </button>
              <button style={{ padding: 14, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => setReplayRoomId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Question Manager Modal */}
      {expandedRoom && !viewReview && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setExpandedRoom(null)} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal" style={{ maxWidth: 800, width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>❓ Manage Room Questions</span>
              <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color='white'} onMouseOut={e => e.target.style.color='rgba(255,255,255,0.5)'} onClick={() => setExpandedRoom(null)}>✕</button>
            </div>
            <div style={{ padding: '24px 32px', overflowY: 'auto' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.8)' }}>Current Questions ({questions.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto', marginBottom: 24, paddingRight: 8 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ padding: '12px 16px', background: editingQuestionId === q.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.2)', border: editingQuestionId === q.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%', fontWeight: 500 }}>
                      <span style={{ color: '#38bdf8', fontWeight: 800, marginRight: 8 }}>{i + 1}.</span> {q.text}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ background: 'rgba(56, 189, 248, 0.1)', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12 }} onClick={() => { setQForm({ ...q, options: q.options || (q.type === 'multiple' ? ['', '', '', ''] : ['']) }); setEditingQuestionId(q.id); }}>Edit</button>
                      <button style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12 }} onClick={() => removeQuestion(q.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {questions.length === 0 && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>No questions added yet.</div>}
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {editingQuestionId ? '✏️ Edit Question' : '➕ Create New Question'}
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <select value={qForm.type} onChange={e => setQForm(f => ({ ...f, type: e.target.value, options: getDefaultOptions(e.target.value), matchingPairs: [['',''],['',''],['','']], correctAnswerIndex: 0 }))} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, fontSize: 14, outline: 'none' }}>
                    {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value} style={{ color: '#000' }}>{qt.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, paddingRight: 12 }}>
                    <input type="number" value={qForm.points} onChange={e => setQForm(f => ({ ...f, points: Number(e.target.value) }))} style={{ width: 60, padding: '12px 0 12px 16px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, outline: 'none' }} title="Points" />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>pts</span>
                  </div>
                </div>
                <textarea placeholder="Type your question here..." value={qForm.text} onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, fontSize: 15, marginBottom: 16, outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase' }}>Optional Media</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Paste Image URL..." value={qForm.image || ''} onChange={e => setQForm(f => ({ ...f, image: e.target.value }))} style={{ flex: 1, minWidth: 200, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                    <label style={{ padding: '12px 20px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                      📁 Upload File
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) { alert('Image too large (max 2MB)'); return; }
                          const reader = new FileReader();
                          reader.onload = (e) => setQForm(f => ({ ...f, image: e.target.result }));
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  {qForm.image && qForm.image.startsWith('data:image') && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#4ade80' }}>✅ Local image attached successfully.</div>
                  )}
                </div>
                
                {/* ── MULTIPLE CHOICE ── */}
                {qForm.type === 'multiple' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                      {qForm.options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, paddingLeft: 16, gap: 8 }}>
                          <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: 14, minWidth: 18 }}>{LETTERS[i]}</span>
                          <input type="text" placeholder={`Option ${LETTERS[i]}`} value={opt} onChange={e => { const ops = [...qForm.options]; ops[i] = e.target.value; setQForm(f => ({ ...f, options: ops })); }} style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, outline: 'none' }} />
                          {qForm.options.length > 2 && (
                            <button onClick={() => { const ops = qForm.options.filter((_,j)=>j!==i); setQForm(f => ({ ...f, options: ops, correctAnswerIndex: Math.min(f.correctAnswerIndex, ops.length-1) })); }} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }} title="Remove option">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      {qForm.options.length < 6 && (
                        <button onClick={() => setQForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ padding: '8px 18px', background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>＋ Add Choice</button>
                      )}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>{qForm.options.length} choices (min 2, max 6)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={qForm.correctAnswerIndex} onChange={e => setQForm(f => ({ ...f, correctAnswerIndex: Number(e.target.value) }))} style={{ flex: 1, minWidth: 200, padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#4ade80', borderRadius: 12, fontSize: 14, outline: 'none', fontWeight: 600 }}>
                        {qForm.options.map((_, i) => <option key={i} value={i} style={{ color: '#000' }}>✓ Correct: {LETTERS[i]}</option>)}
                      </select>
                      <button onClick={addQuestion} className="btn-neon" style={{ padding: '14px 32px', fontSize: 15 }}>{editingQuestionId ? 'Save Edit' : 'Add Question'}</button>
                      {editingQuestionId && <button onClick={() => { setEditingQuestionId(null); setQForm({ text: '', options: ['','','',''], correctAnswerIndex: 0, matchingPairs:[['',''],['',''],['','']], type: 'multiple', points: 10, image: '' }); }} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                    </div>
                  </>
                )}

                {/* ── TRUE / FALSE ── */}
                {qForm.type === 'true_false' && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={qForm.correctAnswerIndex} onChange={e => setQForm(f => ({ ...f, correctAnswerIndex: Number(e.target.value) }))} style={{ flex: 1, minWidth: 200, padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#4ade80', borderRadius: 12, fontSize: 14, outline: 'none', fontWeight: 600 }}>
                      <option value={0} style={{ color: '#000' }}>✓ Correct: True</option>
                      <option value={1} style={{ color: '#000' }}>✓ Correct: False</option>
                    </select>
                    <button onClick={addQuestion} className="btn-neon" style={{ padding: '14px 32px', fontSize: 15 }}>{editingQuestionId ? 'Save Edit' : 'Add Question'}</button>
                    {editingQuestionId && <button onClick={() => { setEditingQuestionId(null); setQForm({ text: '', options: ['True','False'], correctAnswerIndex: 0, matchingPairs:[['',''],['',''],['','']], type: 'true_false', points: 10, image: '' }); }} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                  </div>
                )}

                {/* ── IDENTIFICATION / SHORT ANSWER / ENUMERATION ── */}
                {['fillblank','short_answer','enumeration'].includes(qForm.type) && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text"
                      placeholder={qForm.type === 'enumeration' ? 'Correct answers, separated by commas' : 'Correct answer'}
                      value={qForm.options.join(', ')}
                      onChange={e => setQForm(f => ({ ...f, options: e.target.value.split(',').map(s => s.trim()) }))}
                      style={{ flex: 1, minWidth: 200, padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#4ade80', borderRadius: 12, fontSize: 15, outline: 'none', fontWeight: 600 }} />
                    <button onClick={addQuestion} className="btn-neon" style={{ padding: '14px 32px', fontSize: 15 }}>{editingQuestionId ? 'Save Edit' : 'Add Question'}</button>
                    {editingQuestionId && <button onClick={() => { setEditingQuestionId(null); setQForm({ text: '', options: [''], correctAnswerIndex: 0, matchingPairs:[['',''],['',''],['','']], type: qForm.type, points: 10, image: '' }); }} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                  </div>
                )}

                {/* ── ORDERING ── */}
                {qForm.type === 'ordering' && (
                  <>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Enter items in the CORRECT order (players must re-arrange them)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {qForm.options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, paddingLeft: 16, gap: 8 }}>
                          <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13, minWidth: 20 }}>{i + 1}.</span>
                          <input type="text" placeholder={`Item ${i + 1}`} value={opt} onChange={e => { const ops = [...qForm.options]; ops[i] = e.target.value; setQForm(f => ({ ...f, options: ops })); }} style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', color: 'white', fontSize: 14, outline: 'none' }} />
                          {qForm.options.length > 2 && <button onClick={() => setQForm(f => ({ ...f, options: f.options.filter((_,j)=>j!==i) }))} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                    {qForm.options.length < 6 && <button onClick={() => setQForm(f => ({ ...f, options: [...f.options, ''] }))} style={{ padding: '8px 18px', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', color: '#f59e0b', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>＋ Add Item</button>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button onClick={addQuestion} className="btn-neon" style={{ padding: '14px 32px', fontSize: 15, flex: '1 1 auto' }}>{editingQuestionId ? 'Save Edit' : 'Add Question'}</button>
                      {editingQuestionId && <button onClick={() => { setEditingQuestionId(null); setQForm({ text: '', options: ['','','',''], correctAnswerIndex: 0, matchingPairs:[['',''],['',''],['','']], type: 'ordering', points: 10, image: '' }); }} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                    </div>
                  </>
                )}

                {/* ── MATCHING ── */}
                {qForm.type === 'matching' && (
                  <>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>Enter matching pairs — Column A → Column B</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {qForm.matchingPairs.map(([a, b], i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="text" placeholder={`Column A item ${i+1}`} value={a} onChange={e => { const p=[...qForm.matchingPairs]; p[i]=[e.target.value,p[i][1]]; setQForm(f=>({...f,matchingPairs:p})); }} style={{ flex: 1, padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid #6366f1', color: 'white', borderRadius: 10, fontSize: 13, outline: 'none' }} />
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>→</span>
                          <input type="text" placeholder={`Column B item ${i+1}`} value={b} onChange={e => { const p=[...qForm.matchingPairs]; p[i]=[p[i][0],e.target.value]; setQForm(f=>({...f,matchingPairs:p})); }} style={{ flex: 1, padding: '10px 14px', background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', color: 'white', borderRadius: 10, fontSize: 13, outline: 'none' }} />
                          {qForm.matchingPairs.length > 2 && <button onClick={() => setQForm(f=>({...f,matchingPairs:f.matchingPairs.filter((_,j)=>j!==i)}))} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                    {qForm.matchingPairs.length < 6 && <button onClick={() => setQForm(f=>({...f,matchingPairs:[...f.matchingPairs,['','']]}))} style={{ padding: '8px 18px', background: 'rgba(168,85,247,0.1)', border: '1px solid #a855f7', color: '#a855f7', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>＋ Add Pair</button>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button onClick={addQuestion} className="btn-neon" style={{ padding: '14px 32px', fontSize: 15, flex: '1 1 auto' }}>{editingQuestionId ? 'Save Edit' : 'Add Question'}</button>
                      {editingQuestionId && <button onClick={() => { setEditingQuestionId(null); setQForm({ text: '', options: [''], correctAnswerIndex: 0, matchingPairs:[['',''],['',''],['','']], type: 'matching', points: 10, image: '' }); }} style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
