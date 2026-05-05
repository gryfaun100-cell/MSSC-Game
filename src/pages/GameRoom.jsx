import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, Clock, CheckCircle2, XCircle, LogOut, LayoutDashboard, Target } from 'lucide-react';
import { socket } from '../socket';
import { API_URL } from '../config';
import { RaceTrack, CircleTimer, Leaderboard, WinnersPodium, QuestionDisplay, FinishCameraView } from '../components/GameRoomParts';

const LETTERS = ['A', 'B', 'C', 'D'];

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'start') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.15);
      osc.frequency.setValueAtTime(659.25, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
    }
  } catch(e) {}
}

function NavBar({ user, isAdmin, roomName, onBack }) {
  return (
    <header className="topbar-neo" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/MSSC - Logo.png" alt="MSSC" style={{ height: 36, filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.4))' }} />
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12, marginLeft: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>{roomName || 'Game Room'}</div>
          <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{isAdmin ? 'Admin Host' : 'Player'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, display: window.innerWidth < 600 ? 'none' : 'inline' }}>{user.name}</span>
        </div>
        <button style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    </header>
  );
}

export default function GameRoom({ user }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user.role === 'admin';
  const gameAreaRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);
  const [openText, setOpenText] = useState('');
  const [qTimeLeft, setQTimeLeft] = useState(null);
  const [revealPhase, setRevealPhase] = useState(false);
  const [revealData, setRevealData] = useState(null);
  const [revealCountdown, setRevealCountdown] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameAreaRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // The server actively emits 'timerTick' every second, so we no longer need a client-side countdown.

  useEffect(() => {
    if (isAdmin) {
      socket.emit('rejoinRoom', { roomId, isAdmin: true });
    } else {
      const chosenColor = location.state?.color;
      const chosenAccessory = location.state?.accessory;
      socket.emit('rejoinRoom', { roomId, isAdmin: false, player: { ...user, color: chosenColor, accessory: chosenAccessory } });
    }

    fetch(`${API_URL}/api/rooms/${roomId}`)
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setRoom(d);
          // Sync timer from actual room setting (not hardcoded 30)
          if (d.status === 'playing') setQTimeLeft(d.timePerQuestion || 30);
        }
      })
      .catch(() => { });

    const onRoomStateUpdate = (r) => {
      setRoom(r);
      setQTimeLeft(prev => prev === null ? (r.timePerQuestion || 30) : prev);
    };
    const onGameStarted = (r) => {
      setRoom(r);
      setAnswered(false); setAnswerResult(null); setRevealPhase(false);
      setQTimeLeft(r.timePerQuestion || 30);
      playTone('start');
    };
    const onQuestionReveal = (data) => {
      setRevealPhase(true);
      setRevealData(data);
      setRevealCountdown(3);
      const meData = data.players?.find(p => p.id === socket.id);
      if (meData && meData.answered) {
        if (meData.lastAnswerCorrect) playTone('correct');
        else playTone('wrong');
      }
      setAnswerResult({
        correct: meData?.lastAnswerCorrect ?? false,
        correctAnswerIndex: data.correctAnswerIndex,
        correctAnswerText: data.correctAnswerText,
        question: data.question
      });
    };
    const onRevealCountdown = (n) => setRevealCountdown(n);
    const onTimerTick = (timeLeft) => setQTimeLeft(timeLeft);
    const onNextQuestion = ({ room: r }) => {
      setRoom(r);
      setRevealPhase(false); setRevealData(null); setRevealCountdown(null);
      setAnswered(false); setAnswerResult(null); setOpenText('');
      setQTimeLeft(r.timePerQuestion || 30);
    };
    const onAnswerAck = () => {
      setAnswered(true);
    };
    const onGameEnded = (r) => setRoom(r);
    const onError = (e) => setError(e.message);

    socket.on('roomStateUpdate', onRoomStateUpdate);
    socket.on('gameStarted', onGameStarted);
    socket.on('questionReveal', onQuestionReveal);
    socket.on('revealCountdown', onRevealCountdown);
    socket.on('timerTick', onTimerTick);
    socket.on('nextQuestion', onNextQuestion);
    socket.on('answerAck', onAnswerAck);
    socket.on('gameEnded', onGameEnded);
    socket.on('error', onError);

    return () => {
      socket.off('roomStateUpdate', onRoomStateUpdate);
      socket.off('gameStarted', onGameStarted);
      socket.off('questionReveal', onQuestionReveal);
      socket.off('revealCountdown', onRevealCountdown);
      socket.off('timerTick', onTimerTick);
      socket.off('nextQuestion', onNextQuestion);
      socket.off('answerAck', onAnswerAck);
      socket.off('gameEnded', onGameEnded);
      socket.off('error', onError);
    };
  }, [roomId, user, isAdmin]);

  const submitAnswer = useCallback((idx, text) => {
    if (answered) return;
    socket.emit('submitAnswer', { roomId, answerIndex: idx, answerText: text });
    setAnswered(true);
  }, [answered, roomId]);

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div style={{ fontSize: 48 }}>⚠️</div><h2 style={{ color: '#dc2626' }}>{error}</h2>
      <button className="btn btn-outline" onClick={() => navigate('/')}>Go Back</button>
    </div>
  );

  if (!room) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b' }}>Loading room...</p>
    </div>
  );

  const totalQ = room.questions?.length ?? 0;
  const currentQ = room.questions?.[room.currentQuestionIndex ?? 0] ?? null;

  // ── ADMIN VIEW ──
  if (isAdmin) {
    const finished = room.status === 'finished';
    return (
      <div className="game-dash-bg core-bg-dark" style={{ minHeight: '100vh' }}>
        <div className="dash-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="dash-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 6 + 2}px`, height: `${Math.random() * 6 + 2}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 10 + 10}s` }} />
          ))}
        </div>
        <NavBar user={user} isAdmin roomName={room.name} onBack={() => navigate('/admin')} />

        {/* Sub-header */}
        <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', position: 'sticky', top: 60, zIndex: 100, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-ghost btn-icon" onClick={() => navigate('/admin')} style={{ color: '#64748b' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>{room.name}</h1>
            {room.status === 'playing' && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>🔴 LIVE</span>}
            {finished && <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>Finished</span>}
            <span style={{ fontSize: 12, color: '#94a3b8' }}>👤 {room.players?.length ?? 0} players • ❓ {totalQ} questions</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ fontSize: 13 }} onClick={toggleFullscreen}>
              {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
            {room.status === 'playing' && (
              <>
                <button className="btn btn-warning" style={{ fontSize: 13, background: '#eab308', color: 'white', borderColor: '#ca8a04', border: '1px solid' }} onClick={() => socket.emit('skipToNextQuestion', roomId)}>⏭ Skip Question</button>
                <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => socket.emit('endGame', roomId)}>⏹ End Game</button>
              </>
            )}
            {finished && (
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowWinners(true)}>🏆 View the Winners</button>
            )}
          </div>
        </div>

        {/* Main game area — fullscreen target */}
        <div ref={gameAreaRef} style={{ background: isFullscreen ? '#0f172a' : 'transparent', minHeight: isFullscreen ? '100vh' : 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Half: Race Track (Full Width like Player POV) */}
          <div style={{ height: '40vh', minHeight: 250, padding: '24px 24px 0', display: 'flex', flexDirection: 'column' }}>
            <RaceTrack players={room.players ?? []} totalPoints={room.questions?.reduce((s, q) => s + (q.points || 10), 0) || 1} />
          </div>

          {/* Bottom Half: Game Controls */}
          <div className="game-controls-grid" style={{ maxWidth: 1150, margin: '0 auto', width: '100%', padding: '24px', flex: 1 }}>

            {/* Current Question panel — bottom left */}
            <div className="glass-card" style={{ padding: 0, border: `2px solid ${revealPhase ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {room.status === 'playing' && currentQ ? <>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${revealPhase ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, background: revealPhase ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>📋 Q{(room.currentQuestionIndex ?? 0) + 1}/{totalQ}</span>
                    <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setEditingQuestion(currentQ)}>✏️ Edit</button>
                    <span style={{ background: '#eff6ff', color: '#3333aa', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {currentQ.type === 'multiple' ? 'Multiple Choice' : currentQ.type === 'fillblank' ? 'Fill in Blank' : 'Enumeration'}
                    </span>
                    {revealPhase && revealCountdown > 0 && (
                      <span style={{ background: '#fef9c3', color: '#a16207', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, animation: 'pulse 0.5s ease infinite alternate' }}>Next in {revealCountdown}s...</span>
                    )}
                  </div>
                  {/* Timer */}
                  {!revealPhase && <CircleTimer value={qTimeLeft ?? room.timePerQuestion ?? 30} max={room.timePerQuestion || 30} />}
                  {revealPhase && <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>✅ Revealed</div>}
                </div>
                <div style={{ padding: 20, flex: 1 }}>
                  <QuestionDisplay question={currentQ} idx={room.currentQuestionIndex} total={totalQ} revealPhase={revealPhase} revealData={revealData} />
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {room.players.map(p => (
                      <div key={p.id} style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: p.answered ? (p.lastAnswerCorrect ? '#dcfce7' : '#fee2e2') : '#f1f5f9',
                        color: p.answered ? (p.lastAnswerCorrect ? '#15803d' : '#b91c1c') : '#64748b',
                        border: `1px solid ${p.answered ? (p.lastAnswerCorrect ? '#86efac' : '#fca5a5') : '#e2e8f0'}`
                      }}>
                        {p.answered ? (p.lastAnswerCorrect ? '✓' : '✗') : '⏳'} {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              </> : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14, padding: 24 }}>Waiting for game to start...</div>}
            </div>

            {/* Leaderboard — bottom right */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 20px', background: 'linear-gradient(90deg,#0d0d5c,#3333aa)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>🏆 Leaderboard</div>
              </div>
              <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
                <Leaderboard players={room.players ?? []} revealPhase={revealPhase} />
              </div>
            </div>

          </div>
        </div>

        {/* Winners Modal */}
        {showWinners && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: 560, padding: 40, textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(90deg,#f59e0b,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Game Over!</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 28, fontSize: 14 }}>Congratulations to all participants!</p>
              <WinnersPodium players={room.players ?? []} />
              <div style={{ marginTop: 24, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 20px', textAlign: 'left', maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'rgba(255,255,255,0.5)' }}>Full Rankings</div>
                {[...room.players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 14, width: 24, color: 'rgba(255,255,255,0.4)' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'white' }}>{p.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>{p.score} pts</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 24, width: '100%', fontSize: 15 }} onClick={() => setShowWinners(false)}>Close</button>
            </div>
          </div>
        )}
        {/* Edit Modal */}
        {editingQuestion && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditingQuestion(null)} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>✏️ Edit Question</span>
                <button onClick={() => setEditingQuestion(null)} style={{ background: 'transparent', border: 'none', fontSize: 20, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Question Text</label>
                  <textarea rows={3} value={editingQuestion.text} onChange={e => setEditingQuestion(f => ({ ...f, text: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                {editingQuestion.type === 'multiple' && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Answer Options</label>
                      {editingQuestion.options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{LETTERS[i]}</div>
                          <input style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} type="text" value={opt}
                            onChange={e => { const ops = [...editingQuestion.options]; ops[i] = e.target.value; setEditingQuestion(f => ({ ...f, options: ops })); }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Correct Answer</label>
                      <select style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} value={editingQuestion.correctAnswerIndex}
                        onChange={e => setEditingQuestion(f => ({ ...f, correctAnswerIndex: Number(e.target.value) }))}>
                        {LETTERS.map((l, i) => <option key={i} value={i} style={{ color: 'black' }}>Option {l}</option>)}
                      </select>
                    </div>
                  </>
                )}
                {editingQuestion.type !== 'multiple' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Correct Answer(s)</label>
                    <input style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} type="text" placeholder="Separate multiple correct answers with commas" value={editingQuestion.options.join(', ')}
                      onChange={e => setEditingQuestion(f => ({ ...f, options: e.target.value.split(',').map(s => s.trim()) }))} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button className="btn btn-outline" onClick={() => setEditingQuestion(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  const newQuestions = [...room.questions];
                  const qIndex = newQuestions.findIndex(q => q.id === editingQuestion.id);
                  if (qIndex !== -1) newQuestions[qIndex] = editingQuestion;
                  socket.emit('updateRoomQuestions', { roomId, questions: newQuestions });
                  setEditingQuestion(null);
                }}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{from{opacity:1}to{opacity:0.6}}`}</style>
      </div>
    );
  }

  // ── PLAYER VIEW ──
  const me = room.players?.find(p => p.id === socket.id);

  if (room.status === 'waiting') return (
    <div className="game-dash-bg core-bg-dark" style={{ minHeight: '100vh' }}>
      <div className="dash-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="dash-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 6 + 2}px`, height: `${Math.random() * 6 + 2}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 10 + 10}s` }} />
        ))}
      </div>
      <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 16, textAlign: 'center', padding: 32, color: 'white' }}>
        <div style={{ fontSize: 64, transform: 'scaleX(-1)' }}>🦆</div>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Ready to Race!</h2>
        <div style={{ width: 36, height: 36, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.8)' }}>Waiting for host to start...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (room.status === 'finished') {
    const sortedPlayers = [...(room.players || [])].sort((a, b) => b.score - a.score);
    const myRank = sortedPlayers.findIndex(p => p.id === socket.id) + 1;
    return (
      <div className="game-dash-bg core-bg-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="dash-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 6 + 2}px`, height: `${Math.random() * 6 + 2}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 10 + 10}s` }} />
          ))}
        </div>
        <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
          <FinishCameraView player={me} rank={myRank} />
          
          <div className="glass-card" style={{ width: '100%', padding: 20, marginTop: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, color: 'white', textAlign: 'center' }}>🏆 Final Rankings</div>
            <Leaderboard players={room.players ?? []} revealPhase={false} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 24, padding: '14px 32px', fontSize: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} onClick={() => navigate('/dashboard')}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  // Playing
  const myScore = me?.score ?? 0;
  const totalPoints = room.questions?.reduce((sum, q) => sum + (q.points || 10), 0) || 1;
  const pct = totalPoints > 0 ? Math.min((myScore / totalPoints) * 82, 82) : 0;

  return (
    <div className="game-dash-bg core-bg-dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="dash-particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="dash-particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 6 + 2}px`, height: `${Math.random() * 6 + 2}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 10 + 10}s` }} />
        ))}
      </div>
      <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')} />

      {/* Top Half: Race Track (Full Width like Admin POV) */}
      <div style={{ height: '40vh', minHeight: 250, padding: '24px 24px 0', display: 'flex', flexDirection: 'column' }}>
        <RaceTrack players={room.players ?? []} totalPoints={totalPoints} />
      </div>

      {/* Feedback toast */}
      {answerResult && (
        <div style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 500, padding: '10px 28px', borderRadius: 99, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', color: 'white', background: answerResult.correct ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap', animation: 'popIn 0.2s ease' }}>
          {answerResult.correct ? '✅ Correct!' : '❌ Wrong!'}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

        {/* Reveal phase — show correct answer */}
        {revealPhase && answerResult && (
          <div className="glass-card" style={{ border: `2px solid ${answerResult.correct ? '#22c55e' : '#ef4444'}`, padding: 20, background: answerResult.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: answerResult.correct ? '#4ade80' : '#f87171', marginBottom: 10 }}>
              {answerResult.correct ? '✅ Correct! Well done!' : '❌ Wrong Answer'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Correct Answer:</div>
            <div style={{ fontSize: 15, fontWeight: 700, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              {answerResult.question?.type === 'multiple' ? `${LETTERS[answerResult.correctAnswerIndex]}. ${answerResult.correctAnswerText}` : answerResult.correctAnswerText}
            </div>
            {revealCountdown > 0 && <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Next question in {revealCountdown}s...</div>}
          </div>
        )}

        {/* Question card */}
        {!revealPhase && currentQ && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Q{(room.currentQuestionIndex ?? 0) + 1}/{totalQ}</span>
                <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#7dd3fc', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  {currentQ.type === 'multiple' ? 'Multiple Choice' : currentQ.type === 'fillblank' ? 'Fill in Blank' : 'Enumeration'}
                </span>
              </div>
              <CircleTimer value={qTimeLeft} max={room.timePerQuestion || 30} />
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', background: qTimeLeft <= 5 ? '#ef4444' : '#38bdf8', width: `${(qTimeLeft / (room.timePerQuestion || 30)) * 100}%`, transition: 'width 1s linear' }} />
            </div>
            <div style={{ padding: 20 }}>
              {currentQ.image && <img src={currentQ.image} alt="Question Context" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, marginBottom: 16, objectFit: 'contain' }} />}
              <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, marginBottom: 20, color: 'white' }}>{currentQ.text}</p>
              {currentQ.type === 'multiple' ? (
                <div className="answer-grid">
                  {currentQ.options.map((opt, i) => (
                    <button key={i} onClick={() => submitAnswer(i, opt)} disabled={answered}
                      style={{ width: '100%', padding: '16px 18px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'left', fontSize: 14, fontWeight: 500, cursor: answered ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, opacity: answered ? 0.7 : 1, transition: 'all 0.15s' }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{LETTERS[i]}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); submitAnswer(0, openText); }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input className="form-input" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} type="text" value={openText} onChange={e => setOpenText(e.target.value)}
                      placeholder={currentQ.type === 'enumeration' ? 'Type answers separated by commas...' : 'Type your answer...'} disabled={answered} />
                    <button type="submit" className="btn-neon" disabled={answered || !openText.trim()}>→</button>
                  </div>
                </form>
              )}
              {answered && !revealPhase && <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>⏳ Waiting for other players...</div>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(0.8)}to{opacity:1;transform:translateX(-50%) scale(1)}}`}</style>
    </div>
  );
}
