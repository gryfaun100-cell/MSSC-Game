import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const LETTERS = ['A', 'B', 'C', 'D'];

function NavBar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, width: 'auto' }} />
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
          <button className="logout-btn" onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function CreateRoomModal({ onClose, onCreated }) {
  const [roomName, setRoomName] = useState('');
  const [timePerQ, setTimePerQ] = useState(30);
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (!roomName.trim()) return alert("Please enter a room name.");
    const t = parseInt(timePerQ, 10);
    if (isNaN(t) || t < 5) return alert("Timer must be at least 5 seconds.");
    onCreated({ roomName, timePerQuestion: t }); 
  };
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">🎮 Create Game Room</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input className="form-input" type="text" placeholder="e.g. Training Quiz Round 1" value={roomName} onChange={(e) => setRoomName(e.target.value)} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Time per Question (seconds)</label>
              <input className="form-input" type="number" min={5} max={120} value={timePerQ} onChange={(e) => setTimePerQ(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Room</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, type: 'multiple' });
  const navigate = useNavigate();

  const totalPlayers = rooms.reduce((s, r) => s + r.playerCount, 0);
  const activeGames = rooms.filter(r => r.status === 'playing').length;

  useEffect(() => {
    fetch(`http://${window.location.hostname}:3001/api/rooms`).then(r => r.json()).then(setRooms);
    socket.on('roomsUpdated', setRooms);
    socket.on('roomCreated', (room) => { setExpandedRoom(room.id); setShowModal(false); });
    return () => { socket.off('roomsUpdated'); socket.off('roomCreated'); };
  }, []);

  const handleCreateRoom = ({ roomName, timePerQuestion }) => {
    socket.emit('createRoom', { roomName, timePerQuestion, questions: [] });
  };

  const addQuestion = () => {
    if (!qForm.text.trim()) return alert('Enter a question.');
    if (qForm.type === 'multiple' && qForm.options.some(o => !o.trim())) return alert('Fill all answer options.');
    setQuestions(prev => [...prev, { ...qForm, id: Date.now() }]);
    setQForm({ text: '', options: ['', '', '', ''], correctAnswerIndex: 0, type: 'multiple' });
  };

  const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id));

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavBar user={user} onLogout={onLogout} />

      <div className="container">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { icon: '🎮', value: rooms.length, label: 'Total Rooms', color: '#2563eb' },
            { icon: '▶️', value: activeGames, label: 'Active Games', color: '#16a34a' },
            { icon: '👥', value: totalPlayers, label: 'Total Players', color: '#ea580c' },
            { icon: '❓', value: questions.length, label: 'Questions', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.color + '18' }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="section-header">
          <h2 className="section-title">Game Rooms</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Room
          </button>
        </div>

        <div className="room-list">
          {rooms.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🦆</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No rooms yet</div>
              <div className="empty-state-text">Click "Create Room" to get started!</div>
            </div>
          )}

          {rooms.map(room => (
            <div key={room.id}>
              <div className="room-card">
                <div className="room-info">
                  <div className="room-name">{room.name} {getBadge(room.status)}</div>
                  <div className="room-meta">
                    <span>👤 {room.playerCount} players</span>
                    <span>❓ {room.questionCount ?? questions.length} questions</span>
                    <span>⏱ {room.timePerQuestion ?? 30}s/question</span>
                  </div>
                </div>
                <div className="room-actions">
                  {room.status === 'waiting' && (
                    <>
                      <button className="btn btn-outline" style={{ fontSize: 13 }}
                        onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}>
                        ❓ Questions
                      </button>
                      <button className="btn btn-success" style={{ fontSize: 13 }} onClick={() => handleStartRoom(room.id)}>
                        ▶ Start
                      </button>
                    </>
                  )}
                  {room.status === 'playing' && (
                    <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate(`/room/${room.id}`)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View Race
                    </button>
                  )}
                  {room.status === 'finished' && (
                    <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={() => navigate(`/room/${room.id}`)}>
                      📊 Results
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded question manager */}
              {expandedRoom === room.id && (
                <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--primary)' }}>➕ Add Question</div>
                    <div className="tab-group">
                      {[['multiple', 'Multiple Choice'], ['fillblank', 'Fill in the Blank'], ['enumeration', 'Enumeration']].map(([t, label]) => (
                        <button key={t} className={`tab-btn${qForm.type === t ? ' active' : ''}`} onClick={() => setQForm(f => ({ ...f, type: t }))}>{label}</button>
                      ))}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Question</label>
                      <textarea className="form-input" rows={3} placeholder="Enter your question..." value={qForm.text}
                        onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
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
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={addQuestion}>➕ Add Question</button>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--primary)' }}>Questions ({questions.length})</div>
                    {questions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>No questions yet</div>
                    ) : questions.map((q, idx) => (
                      <div key={q.id} className="question-item">
                        <span className="q-num">{idx + 1}.</span>
                        <div style={{ flex: 1 }}>
                          <div className="q-text">{q.text}</div>
                          <div className="q-sub">{q.type === 'multiple' ? `Answer: ${LETTERS[q.correctAnswerIndex]} • 4 options` : `Answer: ${q.options[0]}`}</div>
                        </div>
                        <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>🗑</button>
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
    </div>
  );
}
