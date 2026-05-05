import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../config';
import { socket } from '../socket';

const LETTERS = ['A', 'B', 'C', 'D'];

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
              <div className="navbar-subtitle">Admin Host</div>
            </div>
          </div>
          <div className="navbar-right">
            <div className="user-badge">
              <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            </div>
            <button className="logout-btn" onClick={() => setShowLogoutModal(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
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

function CreateRoomModal({ onClose, onCreated }) {
  const [roomName, setRoomName] = useState('');
  const [timePerQ, setTimePerQ] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!roomName.trim()) {
      setError("Please enter a room name.");
      return;
    }
    const t = parseInt(timePerQ, 10);
    if (isNaN(t) || t < 5) {
      setError("Timer must be at least 5 seconds.");
      return;
    }
    if (!socket.connected) {
      setError("Cannot connect to server. Is the backend running?");
      return;
    }

    setLoading(true);
    onCreated({ roomName, timePerQuestion: t });

    setTimeout(() => {
      setLoading(false);
    }, 5000);
  };

  return (
    <div className="modal-overlay" onClick={(e) => !loading && e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">🎮 Create Game Room</span>
          {!loading && <button className="modal-close" onClick={onClose}>✕</button>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>⚠️ {error}</div>}
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input className="form-input" type="text" placeholder="e.g. Training Quiz Round 1" value={roomName} onChange={(e) => setRoomName(e.target.value)} autoFocus disabled={loading} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Time per Question (seconds)</label>
              <input className="form-input" type="number" min={5} max={120} value={timePerQ} onChange={(e) => setTimePerQ(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
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
  const [qForm, setQForm] = useState({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, type: 'multiple', points: 10, image: null });

  const totalPlayers = rooms.reduce((s, r) => s + r.playerCount, 0);
  const activeGames = rooms.filter(r => r.status === 'playing').length;

  useEffect(() => {
    fetch(`${API_URL}/api/rooms`).then(r => r.json()).then(setRooms);

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

  const handleCreateRoom = ({ roomName, timePerQuestion }) => {
    socket.emit('createRoom', { roomName, timePerQuestion, questions: [] });
  };

  const addQuestion = () => {
    if (!qForm.text.trim()) return alert('Enter a question.');
    if (qForm.type === 'multiple' && qForm.options.some(o => !o.trim())) return alert('Fill all answer options.');
    const newQuestions = [...questions, { ...qForm, id: Date.now() }];
    setQuestions(newQuestions);
    setQForm({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, type: 'multiple', points: 10, image: null });
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

  const getBadge = (status) => {
    if (status === 'waiting') return <span className="badge badge-waiting">Waiting</span>;
    if (status === 'playing') return <span className="badge badge-playing">Live</span>;
    return <span className="badge badge-finished">Finished</span>;
  };

  return (
    <div className="core-bg-light" style={{ minHeight: '100vh' }}>
      <NavBar user={user} onLogout={onLogout} />

      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Stats Row */}
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Rooms', value: rooms.length, color: 'var(--primary)' },
            { label: 'Active Games', value: activeGames, color: 'var(--success)' },
            { label: 'Total Players', value: totalPlayers, color: 'var(--warning)' },
            { label: 'Questions', value: questions.length, color: 'var(--purple)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Game Rooms */}
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2 className="section-title">Game Rooms</h2>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Create Room
          </button>
        </div>

        <div className="room-list">
          {rooms.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🎮</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No rooms yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create a room to get started</div>
            </div>
          )}

          {rooms.map(room => (
            <div key={room.id}>
              <div className="room-card">
                <div className="room-info">
                  <div className="room-name">{room.name} {getBadge(room.status)}</div>
                  <div className="room-meta">
                    <span>👤 {room.playerCount} players</span>
                    <span>❓ {room.questionCount ?? questions.length} Qs</span>
                    <span>⏱ {room.timePerQuestion ?? 30}s</span>
                  </div>
                </div>
                <div className="room-actions">
                  {room.status === 'waiting' && (
                    <>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => {
                          if (expandedRoom === room.id && !viewReview) { setExpandedRoom(null); }
                          else { setExpandedRoom(room.id); setViewReview(false); fetch(`${API_URL}/api/rooms/${room.id}`).then(r => r.json()).then(d => setQuestions(d.questions || [])); }
                        }}>❓ Questions</button>
                      {room.playerCount === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, padding: '0 8px' }}>Waiting for players...</span>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => handleStartRoom(room.id)}>▶ Start</button>
                      )}
                    </>
                  )}
                  {room.status === 'playing' && (
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/room/${room.id}`)}>👁 View Race</button>
                  )}
                  {room.status === 'finished' && (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/room/${room.id}`)}>📊 Game Summary</button>
                      <button className="btn btn-success btn-sm" onClick={() => setReplayRoomId(room.id)}>🔄 Replay</button>
                      <button className="btn btn-outline btn-sm" onClick={() => {
                        if (expandedRoom === room.id && viewReview) { setExpandedRoom(null); setViewReview(false); }
                        else { setExpandedRoom(room.id); setViewReview(true); fetch(`${API_URL}/api/rooms/${room.id}`).then(r => r.json()).then(d => setQuestions(d.questions || [])); }
                      }}>👀 Review Questions</button>
                    </>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteRoomId(room.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              {expandedRoom === room.id && !viewReview && (
                <div className="card" style={{ borderTop: '3px solid var(--primary)', borderRadius: '0 0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text)' }}>➕ Add Question</div>
                    <div className="tab-group" style={{ marginBottom: 16 }}>
                      {[['multiple', 'Multiple Choice'], ['fillblank', 'Fill in the Blank'], ['enumeration', 'Enumeration']].map(([t, label]) => (
                        <button key={t} className={`tab-btn${qForm.type === t ? ' active' : ''}`} onClick={() => setQForm(f => ({ ...f, type: t }))}>{label}</button>
                      ))}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Question</label>
                      <textarea className="form-input" rows={3} placeholder="Enter your question..." value={qForm.text}
                        onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Image (Optional)</label>
                      <input className="form-input" type="file" accept="image/png, image/jpeg, image/jpg, image/gif" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => setQForm(f => ({ ...f, image: ev.target.result }));
                          reader.readAsDataURL(file);
                        } else {
                          setQForm(f => ({ ...f, image: null }));
                        }
                      }} />
                      {qForm.image && <img src={qForm.image} alt="Preview" style={{ marginTop: 10, maxWidth: '100%', maxHeight: 150, borderRadius: 8, objectFit: 'contain' }} />}
                    </div>
                    {qForm.type === 'multiple' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Answer Options</label>
                          {qForm.options.map((opt, i) => (
                            <div key={i} className="option-row">
                              <div className="option-letter">{LETTERS[i]}</div>
                              <input className="form-input" type="text" placeholder={`Option ${LETTERS[i]}`} value={opt}
                                onChange={e => { const ops = [...qForm.options]; ops[i] = e.target.value; setQForm(f => ({ ...f, options: ops })); }} />
                            </div>
                          ))}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Correct Answer</label>
                          <select className="form-input" value={qForm.correctAnswerIndex}
                            onChange={e => setQForm(f => ({ ...f, correctAnswerIndex: Number(e.target.value) }))}>
                            {LETTERS.map((l, i) => <option key={i} value={i}>Option {l}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    {qForm.type !== 'multiple' && (
                      <div className="form-group">
                        <label className="form-label">Correct Answer</label>
                        <input className="form-input" type="text"
                          placeholder={qForm.type === 'enumeration' ? 'e.g. apple, banana, cherry' : 'Correct answer'}
                          value={qForm.options[0]}
                          onChange={e => { const ops = [...qForm.options]; ops[0] = e.target.value; setQForm(f => ({ ...f, options: ops, correctAnswerIndex: 0 })); }} />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Points</label>
                      <input className="form-input" type="number" min={1} value={qForm.points}
                        onChange={e => setQForm(f => ({ ...f, points: Number(e.target.value) }))} />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', padding: '12px 16px' }} onClick={addQuestion}>➕ Add Question</button>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text)' }}>Questions ({questions.length})</div>
                    {questions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No questions yet</div>
                    ) : questions.map((q, idx) => (
                      <div key={q.id} className="question-item">
                        <span className="q-num">{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div className="q-text">{q.text}</div>
                          {q.image && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>🖼️ Includes image</div>}
                          <div className="q-sub">{q.type === 'multiple' ? `Answer: ${LETTERS[q.correctAnswerIndex]} • 4 options` : `Answer: ${q.options[0]}`} • {q.points || 10} pts</div>
                        </div>
                        <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>🗑</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedRoom === room.id && viewReview && (
                <div className="card" style={{ borderTop: '3px solid var(--primary)', borderRadius: '0 0 12px 12px', padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>Review Questions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {questions.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)' }}>No questions found.</div>
                    ) : questions.map((q, idx) => (
                      <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-white)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>Question {idx + 1}</div>
                        {q.image && <img src={q.image} alt="Q" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, marginBottom: 8, objectFit: 'contain' }} />}
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{q.text}</div>
                        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                          ✓ Answer: {q.type === 'multiple' ? `${LETTERS[q.correctAnswerIndex]}. ${q.options[q.correctAnswerIndex]}` : q.options[0]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && <CreateRoomModal onClose={() => setShowModal(false)} onCreated={handleCreateRoom} />}
      {deleteRoomId && (
        <ConfirmModal
          title="Delete Room"
          message="Are you sure you want to delete this room? This action cannot be undone."
          confirmText="Delete"
          confirmColor="#dc2626"
          onConfirm={() => { socket.emit('deleteRoom', deleteRoomId); setDeleteRoomId(null); }}
          onClose={() => setDeleteRoomId(null)}
        />
      )}
      {replayRoomId && (
        <div className="modal-overlay" onClick={() => setReplayRoomId(null)}>
          <div className="modal" style={{ maxWidth: 420, padding: 24, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Replay Game</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Reset the game state and play again. You can keep the existing players or start a fresh session.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-success" onClick={() => { socket.emit('replayRoom', { roomId: replayRoomId, keepPlayers: true }); navigate(`/room/${replayRoomId}`); setReplayRoomId(null); }}>
                ▶ Replay with same players
              </button>
              <button className="btn btn-outline" onClick={() => { socket.emit('replayRoom', { roomId: replayRoomId, keepPlayers: false }); setReplayRoomId(null); }}>
                👥 Start new session (Clear players)
              </button>
              <button className="btn btn-ghost" onClick={() => setReplayRoomId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
