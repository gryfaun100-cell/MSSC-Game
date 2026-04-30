import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { RaceTrack, CircleTimer, Leaderboard, WinnersPodium, QuestionDisplay } from '../components/GameRoomParts';

const LETTERS = ['A','B','C','D'];

function NavBar({ user, isAdmin, roomName, onBack }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src="/MSSC - Logo.png" alt="MSSC" style={{height:36}}/>
          <div style={{borderLeft:'1px solid rgba(255,255,255,0.2)',paddingLeft:12,marginLeft:4}}>
            <div className="navbar-title">{roomName||'Game Room'}</div>
            <div className="navbar-subtitle">{isAdmin?'Admin Host':'Player'}</div>
          </div>
        </div>
        <div className="navbar-right">
          <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
          <span style={{fontSize:13,fontWeight:600}}>{user.name}</span>
          <button className="logout-btn" onClick={onBack}>← Back</button>
        </div>
      </div>
    </nav>
  );
}

export default function GameRoom({ user }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
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
  const [readyToReveal, setReadyToReveal] = useState(false); // host sees Reveal Answer button

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

  // Client-side countdown — server is the authoritative timer
  useEffect(() => {
    if (revealPhase || !room || room.status !== 'playing') return;
    if (qTimeLeft === null || qTimeLeft <= 0) return;
    const t = setTimeout(() => setQTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearTimeout(t);
  }, [qTimeLeft, revealPhase, room]);

  useEffect(() => {
    if (isAdmin) {
      socket.emit('rejoinRoom', { roomId, isAdmin: true });
    } else {
      socket.emit('rejoinRoom', { roomId, isAdmin: false, player: user });
    }

    fetch(`http://${window.location.hostname}:3001/api/rooms/${roomId}`)
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setRoom(d);
          // Sync timer from actual room setting (not hardcoded 30)
          if (d.status === 'playing') setQTimeLeft(d.timePerQuestion || 30);
        }
      })
      .catch(() => {});

    socket.on('roomStateUpdate', (r) => {
      setRoom(r);
      // Keep timer in sync with room's timePerQuestion always
      setQTimeLeft(prev => prev === null ? (r.timePerQuestion || 30) : prev);
    });

    socket.on('gameStarted', (r) => {
      setRoom(r);
      setAnswered(false); setAnswerResult(null); setRevealPhase(false);
      // Use actual timePerQuestion from room
      setQTimeLeft(r.timePerQuestion || 30);
    });

    socket.on('questionReveal', (data) => {
      setRevealPhase(true);
      setRevealData(data);
      setRevealCountdown(3);
      setReadyToReveal(false); // hide the button once revealed
    });

    socket.on('revealCountdown', (n) => {
      setRevealCountdown(n);
    });

    socket.on('nextQuestion', ({ room: r }) => {
      setRoom(r);
      setRevealPhase(false); setRevealData(null); setRevealCountdown(null);
      setAnswered(false); setAnswerResult(null); setOpenText('');
      setReadyToReveal(false);
      setQTimeLeft(r.timePerQuestion || 30);
    });

    socket.on('answerResult', (result) => {
      setAnswerResult(result); setAnswered(true);
    });

    socket.on('readyToReveal', () => {
      setReadyToReveal(true);
      setQTimeLeft(0);
    });

    socket.on('gameEnded', (r) => { setRoom(r); });
    socket.on('error', (e) => setError(e.message));

    return () => {
      ['roomStateUpdate','gameStarted','questionReveal','revealCountdown','nextQuestion','answerResult','readyToReveal','gameEnded','error']
        .forEach(e => socket.off(e));
    };
  }, [roomId, user, isAdmin]);

  const submitAnswer = useCallback((idx, text) => {
    if (answered) return;
    socket.emit('submitAnswer', { roomId, answerIndex: idx, answerText: text });
    setAnswered(true);
  }, [answered, roomId]);

  if (error) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',gap:16}}>
      <div style={{fontSize:48}}>⚠️</div><h2 style={{color:'#dc2626'}}>{error}</h2>
      <button className="btn btn-outline" onClick={() => navigate('/')}>Go Back</button>
    </div>
  );

  if (!room) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}>
      <div style={{width:40,height:40,border:'4px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <p style={{color:'#64748b'}}>Loading room...</p>
    </div>
  );

  const totalQ = room.questions?.length ?? 0;
  const currentQ = room.questions?.[room.currentQuestionIndex ?? 0] ?? null;

  // ── ADMIN VIEW ──
  if (isAdmin) {
    const finished = room.status === 'finished';
    return (
      <div style={{minHeight:'100vh',background:'#f1f5f9'}}>
        <NavBar user={user} isAdmin roomName={room.name} onBack={() => navigate('/admin')}/>

        {/* Sub-header */}
        <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'12px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',position:'sticky',top:60,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn-ghost btn-icon" onClick={() => navigate('/admin')} style={{color:'#64748b'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <h1 style={{fontSize:16,fontWeight:700}}>{room.name}</h1>
            {room.status==='playing'&&<span style={{background:'#dcfce7',color:'#16a34a',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>🔴 LIVE</span>}
            {finished&&<span style={{background:'#f1f5f9',color:'#64748b',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600}}>Finished</span>}
            <span style={{fontSize:12,color:'#94a3b8'}}>👤 {room.players?.length??0} players • ❓ {totalQ} questions</span>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-outline" style={{fontSize:13}} onClick={toggleFullscreen}>
              {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
            {room.status==='playing'&&(
              <button className="btn btn-danger" style={{fontSize:13}} onClick={() => socket.emit('endGame', roomId)}>⏹ End Game</button>
            )}
            {finished&&(
              <button className="btn btn-primary" style={{fontSize:13}} onClick={() => setShowWinners(true)}>🏆 View the Winners</button>
            )}
          </div>
        </div>

        {/* Main game area — fullscreen target */}
        <div ref={gameAreaRef} style={{background: isFullscreen?'#0f172a':'transparent', minHeight: isFullscreen?'100vh':'auto'}}>
          <div style={{maxWidth:1150,margin:'0 auto',padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'auto auto',gap:18}}>

            {/* Duck Race panel — full width top row */}
            <div style={{gridColumn:'1 / -1',background:'white',border:'1px solid #e2e8f0',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',overflow:'hidden'}}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(90deg,#0d0d5c,#3333aa)'}}>
                <div style={{fontSize:15,fontWeight:700,color:'white',display:'flex',alignItems:'center',gap:8}}>🏁 Duck Race</div>
                {room.status==='playing'&&<span style={{background:'rgba(255,255,255,0.15)',color:'white',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>🔴 LIVE</span>}
              </div>
              <div style={{padding:'20px 24px',minHeight:140}}>
                <RaceTrack players={room.players??[]} totalQ={totalQ}/>
              </div>
            </div>

            {/* Current Question panel — bottom left */}
            <div style={{background:'white',border:`2px solid ${revealPhase?'#16a34a':readyToReveal?'#f59e0b':'#bfdbfe'}`,borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
              {room.status==='playing'&&currentQ ? <>
                <div style={{padding:'14px 20px',borderBottom:`1px solid ${revealPhase?'#bbf7d0':readyToReveal?'#fde68a':'#dbeafe'}`,background:revealPhase?'#f0fdf4':readyToReveal?'#fffbeb':'#eff6ff',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:14,fontWeight:700}}>📋 Q{(room.currentQuestionIndex??0)+1}/{totalQ}</span>
                    <span style={{background:'#eff6ff',color:'#3333aa',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600}}>
                      {currentQ.type==='multiple'?'Multiple Choice':currentQ.type==='fillblank'?'Fill in Blank':'Enumeration'}
                    </span>
                    {revealPhase&&revealCountdown>0&&(
                      <span style={{background:'#fef9c3',color:'#a16207',padding:'4px 10px',borderRadius:99,fontSize:12,fontWeight:700,animation:'pulse 0.5s ease infinite alternate'}}>Next in {revealCountdown}s...</span>
                    )}
                  </div>
                  {/* Timer OR Reveal button */}
                  {!revealPhase && !readyToReveal && <CircleTimer value={qTimeLeft??room.timePerQuestion??30} max={room.timePerQuestion||30}/>}
                  {readyToReveal && !revealPhase && (
                    <button onClick={() => socket.emit('hostRevealAnswer', roomId)}
                      style={{padding:'10px 18px',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'white',border:'none',borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 4px 14px rgba(245,158,11,0.4)',animation:'pulse 0.8s ease infinite alternate',whiteSpace:'nowrap',fontFamily:'inherit'}}>
                      🎯 Reveal Answer
                    </button>
                  )}
                  {revealPhase&&<div style={{fontSize:13,fontWeight:700,color:'#16a34a'}}>✅ Revealed</div>}
                </div>
                <div style={{padding:20,flex:1}}>
                  <QuestionDisplay question={currentQ} idx={room.currentQuestionIndex} total={totalQ} revealPhase={revealPhase} revealData={revealData}/>
                  <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                    {room.players.map(p=>(
                      <div key={p.id} style={{padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:600,
                        background:p.answered?(p.lastAnswerCorrect?'#dcfce7':'#fee2e2'):'#f1f5f9',
                        color:p.answered?(p.lastAnswerCorrect?'#15803d':'#b91c1c'):'#64748b',
                        border:`1px solid ${p.answered?(p.lastAnswerCorrect?'#86efac':'#fca5a5'):'#e2e8f0'}`}}>
                        {p.answered?(p.lastAnswerCorrect?'✓':'✗'):'⏳'} {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              </> : <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:14,padding:24}}>Waiting for game to start...</div>}
            </div>

            {/* Leaderboard — bottom right */}
            <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'14px 20px',background:'linear-gradient(90deg,#0d0d5c,#3333aa)'}}>
                <div style={{fontSize:14,fontWeight:700,color:'white'}}>🏆 Leaderboard</div>
              </div>
              <div style={{padding:20,flex:1,overflowY:'auto'}}>
                <Leaderboard players={room.players??[]} revealPhase={revealPhase}/>
              </div>
            </div>

          </div>
        </div>

        {/* Winners Modal */}
        {showWinners&&(
          <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.7)',backdropFilter:'blur(4px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{background:'white',borderRadius:20,boxShadow:'0 32px 64px rgba(0,0,0,0.3)',width:'100%',maxWidth:560,padding:40,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:8}}>🎉</div>
              <h2 style={{fontSize:28,fontWeight:800,marginBottom:4,background:'linear-gradient(90deg,#f59e0b,#2563eb)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Game Over!</h2>
              <p style={{color:'#64748b',marginBottom:28,fontSize:14}}>Congratulations to all participants!</p>
              <WinnersPodium players={room.players??[]}/>
              <div style={{marginTop:24,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 20px',textAlign:'left',maxHeight:200,overflowY:'auto'}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'#64748b'}}>Full Rankings</div>
                {[...room.players].sort((a,b)=>b.score-a.score).map((p,i)=>(
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:14,width:24,color:'#94a3b8'}}>#{i+1}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:600}}>{p.name}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>{p.score}/{totalQ}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{marginTop:24,width:'100%',fontSize:15}} onClick={() => setShowWinners(false)}>Close</button>
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
    <div style={{minHeight:'100vh',background:'#f1f5f9'}}>
      <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',gap:16,textAlign:'center',padding:32}}>
        <div style={{fontSize:64}}>🦆</div>
        <h2 style={{fontSize:22,fontWeight:800}}>Ready to Race!</h2>
        <div style={{width:36,height:36,border:'4px solid #e2e8f0',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <p style={{color:'#64748b'}}>Waiting for host to start...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (room.status === 'finished') return (
    <div style={{minHeight:'100vh',background:'#f1f5f9'}}>
      <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')}/>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',gap:16,padding:24,textAlign:'center'}}>
        <div style={{fontSize:64}}>🏁</div>
        <h2 style={{fontSize:26,fontWeight:800}}>Race Finished!</h2>
        {me&&<p style={{fontSize:16,color:'#64748b'}}>Your Score: <strong style={{color:'#2563eb',fontSize:22}}>{me.score}</strong> / {totalQ}</p>}
        {(()=>{const s=[...room.players].sort((a,b)=>b.score-a.score);const r=s.findIndex(p=>p.id===socket.id)+1;return r===1?<div style={{fontSize:36}}>🥇 You Won!</div>:r===2?<div style={{fontSize:28}}>🥈 2nd Place!</div>:r===3?<div style={{fontSize:28}}>🥉 3rd Place!</div>:null;})()}
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,padding:20,width:'100%',maxWidth:400}}>
          <div style={{fontWeight:700,marginBottom:12}}>🏆 Final Rankings</div>
          <Leaderboard players={room.players??[]} revealPhase={false}/>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>Back to Lobby</button>
      </div>
    </div>
  );

  // Playing
  const myScore = me?.score ?? 0;
  const pct = totalQ > 0 ? Math.min((myScore/totalQ)*82,82) : 0;

  return (
    <div style={{minHeight:'100vh',background:'#f1f5f9'}}>
      <NavBar user={user} isAdmin={false} roomName={room.name} onBack={() => navigate('/dashboard')}/>

      {/* Feedback toast */}
      {answerResult&&(
        <div style={{position:'fixed',top:72,left:'50%',transform:'translateX(-50%)',zIndex:500,padding:'10px 28px',borderRadius:99,fontSize:15,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',color:'white',background:answerResult.correct?'#16a34a':'#dc2626',whiteSpace:'nowrap',animation:'popIn 0.2s ease'}}>
          {answerResult.correct?'✅ Correct!':'❌ Wrong!'}
        </div>
      )}

      <div style={{maxWidth:680,margin:'24px auto',padding:'0 20px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Mini race */}
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
          <div style={{padding:'12px 18px',borderBottom:'1px solid #e2e8f0',background:'linear-gradient(90deg,#0f2d6b,#2563eb)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{color:'white',fontWeight:700,fontSize:14}}>🏁 Your Progress</span>
            <span style={{background:'rgba(255,255,255,0.15)',color:'white',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>🔴 LIVE</span>
          </div>
          <div style={{padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:26,height:26,borderRadius:'50%',background:'#2563eb',color:'white',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{user.name[0]?.toUpperCase()}</div>
              <span style={{fontSize:13,fontWeight:600}}>{user.name}</span>
              <span style={{marginLeft:'auto',fontSize:15,fontWeight:800,color:'#2563eb'}}>{myScore} pts</span>
            </div>
            <div style={{height:36,background:'linear-gradient(90deg,#bae6fd,#38bdf8)',borderRadius:99,position:'relative',overflow:'hidden',border:'2px solid #7dd3fc'}}>
              <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${pct}%`,background:'rgba(255,255,255,0.25)',transition:'width 0.7s ease'}}/>
              <span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:`calc(${pct}% + 2px)`,fontSize:20,transition:'left 0.7s ease'}}>🦆</span>
              <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:16}}>🏁</span>
            </div>
          </div>
        </div>

        {/* Reveal phase — show correct answer */}
        {revealPhase&&answerResult&&(
          <div style={{border:`2px solid ${answerResult.correct?'#16a34a':'#dc2626'}`,borderRadius:14,padding:20,background:answerResult.correct?'#f0fdf4':'#fff1f2'}}>
            <div style={{fontSize:20,fontWeight:800,color:answerResult.correct?'#15803d':'#b91c1c',marginBottom:10}}>
              {answerResult.correct?'✅ Correct! Well done!':'❌ Wrong Answer'}
            </div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:6}}>Correct Answer:</div>
            <div style={{fontSize:15,fontWeight:700,background:'white',borderRadius:8,padding:'10px 14px',border:'1px solid #e2e8f0'}}>
              {answerResult.question?.type==='multiple'?`${LETTERS[answerResult.correctAnswerIndex]}. ${answerResult.correctAnswerText}`:answerResult.correctAnswerText}
            </div>
            {revealCountdown>0&&<div style={{marginTop:10,fontSize:13,color:'#94a3b8',textAlign:'center'}}>Next question in {revealCountdown}s...</div>}
          </div>
        )}

        {/* Question card */}
        {!revealPhase&&currentQ&&(
          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,fontWeight:600,color:'#64748b'}}>Q{(room.currentQuestionIndex??0)+1}/{totalQ}</span>
                <span style={{background:'#eff6ff',color:'#2563eb',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600}}>
                  {currentQ.type==='multiple'?'Multiple Choice':currentQ.type==='fillblank'?'Fill in Blank':'Enumeration'}
                </span>
              </div>
              <CircleTimer value={qTimeLeft} max={room.timePerQuestion||30}/>
            </div>
            <div style={{height:3,background:'#e2e8f0'}}>
              <div style={{height:'100%',background:qTimeLeft<=5?'#ef4444':'#2563eb',width:`${(qTimeLeft/(room.timePerQuestion||30))*100}%`,transition:'width 1s linear'}}/>
            </div>
            <div style={{padding:20}}>
              <p style={{fontSize:18,fontWeight:700,lineHeight:1.5,marginBottom:20}}>{currentQ.text}</p>
              {currentQ.type==='multiple'?(
                <div className="answer-grid">
                  {currentQ.options.map((opt,i)=>(
                    <button key={i} onClick={()=>submitAnswer(i,opt)} disabled={answered}
                      style={{width:'100%',padding:'16px 18px',background:'white',border:'2px solid #e2e8f0',borderRadius:12,textAlign:'left',fontSize:14,fontWeight:500,cursor:answered?'default':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:10,opacity:answered?0.7:1,transition:'all 0.15s'}}>
                      <span style={{width:30,height:30,borderRadius:'50%',background:'#eff6ff',color:'#2563eb',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{LETTERS[i]}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              ):(
                <form onSubmit={e=>{e.preventDefault();submitAnswer(0,openText);}}>
                  <div style={{display:'flex',gap:10}}>
                    <input className="form-input" type="text" value={openText} onChange={e=>setOpenText(e.target.value)}
                      placeholder={currentQ.type==='enumeration'?'Type answers separated by commas...':'Type your answer...'} disabled={answered}/>
                    <button type="submit" className="btn btn-primary" disabled={answered||!openText.trim()}>→</button>
                  </div>
                </form>
              )}
              {answered&&!revealPhase&&<div style={{textAlign:'center',padding:'16px 0',color:'#94a3b8',fontSize:13}}>⏳ Waiting for other players...</div>}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(0.8)}to{opacity:1;transform:translateX(-50%) scale(1)}}`}</style>
    </div>
  );
}
