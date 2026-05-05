import React from 'react';
const L = ['A','B','C','D'];

export function RaceTrack({ players, totalPoints }) {
  if (!players.length) return <div style={{textAlign:'center',padding:24,color:'#94a3b8'}}>🦆 Waiting for players...</div>;
  
  return (
    <div style={{ position: 'relative', width: '100%', height: 260, background: '#2563eb', borderRadius: 16, border: '4px solid #1e3a8a', overflow: 'hidden', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.3)' }}>
      {/* Grass Bank */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: '#16a34a', borderBottom: '2px solid #14532d' }}>
        {/* Little grass tufts */}
        <div style={{ position: 'absolute', left: 40, bottom: 2, fontSize: 12, color: '#15803d' }}>🌿</div>
        <div style={{ position: 'absolute', left: 140, bottom: 2, fontSize: 12, color: '#15803d' }}>🌿</div>
        <div style={{ position: 'absolute', right: 80, bottom: 2, fontSize: 12, color: '#15803d' }}>🌿</div>
      </div>
      {/* Dirt Bank */}
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 12, background: '#854d0e', borderBottom: '3px solid #713f12' }} />

      {/* Flowing Water Effect */}
      <div style={{
        position: 'absolute', top: 39, left: 0, right: 0, bottom: 0,
        background: 'url("data:image/svg+xml,%3Csvg width=\'120\' height=\'40\' viewBox=\'0 0 120 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 20 Q 30 0, 60 20 T 120 20\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'4\' stroke-opacity=\'0.15\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
        animation: 'waterFlow 3s linear infinite'
      }} />
      
      {/* Finish line (Slanted) */}
      <div style={{ position: 'absolute', right: 60, top: 24, bottom: -20, width: 32, background: 'repeating-linear-gradient(0deg, #000, #000 16px, #fff 16px, #fff 32px)', opacity: 0.9, transform: 'skewX(-15deg)', borderLeft: '4px solid #1e293b', borderRight: '4px solid #1e293b', boxShadow: '-10px 0 20px rgba(0,0,0,0.3)' }} />
      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 36, filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.4))' }}>🏁</div>
      
      {/* Swarm of Ducks */}
      {players.map((p, index) => {
        const pct = totalPoints > 0 ? Math.min((p.score / totalPoints), 1) : 0;
        // Formula creates rows across the 260px height (starting below the dirt bank).
        const yOffset = 45 + (index % 5) * 36 + (index % 3) * 10; 
        
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: `calc(10px + (100% - 130px) * ${pct})`,
            top: `${yOffset}px`,
            transition: 'left 0.8s cubic-bezier(0.34,1.56,0.64,1)',
            zIndex: 10 + Math.floor(pct),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.4))'
          }}>
            {/* The Duck Emoji directly on water */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 56, transform: 'scaleX(-1)', display: 'inline-block' }}>🦆</span>
              
              {/* Accessory */}
              {p.accessory && p.accessory !== 'none' && (
                <span style={{ position: 'absolute', top: -16, right: 6, fontSize: 32, transform: 'rotate(15deg) scaleX(-1)' }}>{p.accessory}</span>
              )}
              
              {/* White Pill Label (like the image) */}
              <div style={{
                position: 'absolute',
                top: 24, right: 14,
                background: 'white',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 12,
                border: `2px solid ${p.color || '#2563eb'}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                maxWidth: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                zIndex: 2
              }}>
                {p.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CircleTimer({ value, max }) {
  const r=28, circ=2*Math.PI*r;
  const pct=max>0?value/max:0;
  const color=value<=5?'#ef4444':value<=10?'#f97316':'#2563eb';
  return <div style={{position:'relative',width:72,height:72,flexShrink:0}}>
    <svg width={72} height={72} style={{transform:'rotate(-90deg)'}}>
      <circle cx={36} cy={36} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6}/>
      <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
        style={{transition:'stroke-dashoffset 1s linear,stroke 0.3s'}}/>
    </svg>
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color}}>{value}</div>
  </div>;
}

export function Leaderboard({ players, revealPhase }) {
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  return <div>{sorted.map((p,i)=>{
    let bg='white', border='#e2e8f0', textColor='#0f172a';
    if(revealPhase){
      if(p.answered && p.lastAnswerCorrect===true){bg='#dcfce7';border='#16a34a';textColor='#15803d';}
      else if(p.answered && p.lastAnswerCorrect===false){bg='#fee2e2';border='#dc2626';textColor='#b91c1c';}
    }
    return <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,marginBottom:6,background:bg,border:`1.5px solid ${border}`,transition:'all 0.4s ease'}}>
      <span style={{fontSize:18,width:28}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
      <div style={{width:28,height:28,position:'relative',borderRadius:'50%',background:p.color||'#2563eb',color:(p.color==='#f8fafc'||p.color==='#fbbf24'||p.color==='#eab308')?'#0f172a':'white',fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid rgba(0,0,0,0.1)'}}>
        {p.name[0]?.toUpperCase()}
        {p.accessory && p.accessory !== 'none' && <span style={{ position: 'absolute', top: -10, right: -6, fontSize: 16, transform: 'rotate(15deg)' }}>{p.accessory}</span>}
      </div>
      <span style={{flex:1,fontSize:13,fontWeight:600,color:textColor}}>{p.name}</span>
      <span style={{fontSize:14,fontWeight:700,color:'#2563eb'}}>{p.score}pts</span>
      {revealPhase && <span style={{fontSize:16}}>{!p.answered?'⏳':p.lastAnswerCorrect?'✅':'❌'}</span>}
    </div>;
  })}</div>;
}

export function WinnersPodium({ players }) {
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  const [first,second,third]=sorted;
  const PodiumBlock=({player,rank,height,medal})=>player?<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
    <div style={{fontSize:32}}>{medal}</div>
    <div style={{width:56,height:56,position:'relative',borderRadius:'50%',background:player.color||'#2563eb',color:(player.color==='#f8fafc'||player.color==='#fbbf24'||player.color==='#eab308')?'#0f172a':'white',border:'2px solid rgba(0,0,0,0.1)',fontSize:22,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
      {player.name[0]?.toUpperCase()}
      {player.accessory && player.accessory !== 'none' && <span style={{ position: 'absolute', top: -18, right: -8, fontSize: 32, transform: 'rotate(15deg)' }}>{player.accessory}</span>}
    </div>
    <div style={{fontSize:13,fontWeight:700,textAlign:'center',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{player.name}</div>
    <div style={{fontSize:12,color:'#64748b'}}>{player.score} pts</div>
    <div style={{width:90,height,background:rank===1?'linear-gradient(180deg,#fbbf24,#f59e0b)':rank===2?'linear-gradient(180deg,#cbd5e1,#94a3b8)':'linear-gradient(180deg,#d97706,#b45309)',borderRadius:'8px 8px 0 0',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:8,color:'white',fontWeight:800,fontSize:20}}>#{rank}</div>
  </div>:null;
  return <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:12,padding:'0 0 0'}}>
    <PodiumBlock player={second} rank={2} height={80} medal="🥈"/>
    <PodiumBlock player={first} rank={1} height={120} medal="🏆"/>
    <PodiumBlock player={third} rank={3} height={60} medal="🥉"/>
  </div>;
}

export function QuestionDisplay({ question, idx, total, revealPhase, revealData }) {
  if (!question) return null;
  const correctIdx = revealPhase ? (revealData?.correctAnswerIndex ?? question.correctAnswerIndex) : -1;
  return <div>
    {question.image && <img src={question.image} alt="Question Context" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, marginBottom: 16, objectFit: 'contain' }} />}
    <p style={{fontSize:18,fontWeight:700,lineHeight:1.5,marginBottom:16,color:'#0f172a'}}>{question.text}</p>
    {question.type==='multiple'&&<div className="answer-grid" style={{marginTop: 0}}>
      {question.options.map((opt,i)=>{
        let bg='#f8fafc',border='#e2e8f0',color='#0f172a';
        if(revealPhase){bg=i===correctIdx?'#dcfce7':'#fee2e2';border=i===correctIdx?'#16a34a':'#fca5a5';color=i===correctIdx?'#15803d':'#b91c1c';}
        return <div key={i} style={{padding:'10px 14px',borderRadius:10,fontSize:14,fontWeight:500,display:'flex',alignItems:'center',gap:10,background:bg,border:`2px solid ${border}`,color,transition:'all 0.4s'}}>
          <span style={{width:28,height:28,borderRadius:'50%',background:i===correctIdx&&revealPhase?'#16a34a':'#eff6ff',color:i===correctIdx&&revealPhase?'white':'#2563eb',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{L[i]}</span>
          {opt}{i===correctIdx&&revealPhase&&<span style={{marginLeft:'auto'}}>✓</span>}
        </div>;
      })}
    </div>}
    {question.type!=='multiple'&&revealPhase&&<div style={{background:'#dcfce7',border:'2px solid #16a34a',borderRadius:10,padding:'10px 16px',marginTop:8}}>
      <div style={{fontSize:11,fontWeight:700,color:'#15803d',marginBottom:4}}>CORRECT ANSWER</div>
      <div style={{fontSize:16,fontWeight:700}}>{revealData?.correctAnswerText}</div>
    </div>}
  </div>;
}

export function FinishCameraView({ player, rank }) {
  if (!player) return null;
  const isWinner = rank === 1;
  const rankText = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '60vh', background: 'linear-gradient(180deg, #38bdf8, #bae6fd, #e0f2fe)', borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', border: '8px solid white', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
      {/* Finish Banner */}
      <div style={{ position: 'absolute', top: 40, width: '110%', background: 'white', padding: '10px 0', textAlign: 'center', fontWeight: 900, fontSize: 'clamp(32px, 8vw, 64px)', letterSpacing: 10, color: '#0f172a', borderTop: '6px solid #1e293b', borderBottom: '6px solid #1e293b', transform: 'rotate(-2deg)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>FINISH</div>
      
      {/* Background elements */}
      <div style={{ position: 'absolute', top: 20, left: 20, fontSize: 64 }}>🏁</div>
      <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 64 }}>🏁</div>

      {/* The Track */}
      <div style={{ position: 'absolute', bottom: 0, width: '150%', height: '45%', background: '#334155', transform: 'perspective(500px) rotateX(60deg)', borderTop: '10px solid white' }}>
        <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.2) 40px, rgba(255,255,255,0.2) 80px)' }} />
      </div>

      {/* Red Ribbon (broken) */}
      {isWinner && (
        <div style={{ position: 'absolute', bottom: '25%', width: '120%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ width: '50%', height: 40, background: '#ef4444', transform: 'rotate(-8deg) translateY(30px)', boxShadow: '0 5px 10px rgba(0,0,0,0.3)' }} />
          <div style={{ width: '50%', height: 40, background: '#ef4444', transform: 'rotate(8deg) translateY(30px)', boxShadow: '0 5px 10px rgba(0,0,0,0.3)' }} />
        </div>
      )}

      {/* Confetti Particles */}
      {isWinner && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}>
          {[...Array(20)].map((_,i) => (
            <div key={i} style={{
              position: 'absolute', top: `${Math.random()*50}%`, left: `${Math.random()*100}%`,
              width: 10, height: 20, background: ['#ef4444','#3b82f6','#22c55e','#eab308'][i%4],
              animation: `confettiDrop ${1+Math.random()*2}s linear infinite`,
              transform: `rotate(${Math.random()*360}deg)`
            }} />
          ))}
        </div>
      )}

      {/* The Duck */}
      <div style={{ position: 'relative', zIndex: 20, marginBottom: '8%', animation: 'duckBounce 1s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5)' }}>
        {/* Shadow */}
        <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', width: 140, height: 30, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', filter: 'blur(10px)', zIndex: -1 }} />
        
        <div style={{
          width: 200, height: 200, borderRadius: '50%', background: player.color || '#2563eb', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          boxShadow: 'inset -15px -30px 40px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5)', border: '6px solid rgba(255,255,255,0.4)'
        }}>
          <span style={{ fontSize: 130 }}>🦆</span>
          {player.accessory && player.accessory !== 'none' && (
             <span style={{ position: 'absolute', top: -35, right: -10, fontSize: 100, transform: 'rotate(15deg)', filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.4))' }}>{player.accessory}</span>
          )}
          
          {/* Medal hanging on neck */}
          <div style={{ position: 'absolute', bottom: -15, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', marginBottom: -20, zIndex: -1 }}>
              <div style={{ width: 8, height: 50, background: '#ef4444', transform: 'rotate(-30deg) translateX(15px)', boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }} />
              <div style={{ width: 8, height: 50, background: '#ef4444', transform: 'rotate(30deg) translateX(-15px)', boxShadow: '0 4px 8px rgba(0,0,0,0.4)' }} />
            </div>
            <div style={{ width: 90, height: 90, background: 'radial-gradient(circle at 30% 30%, #fef08a, #eab308, #a16207)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#713f12', border: '5px solid #fef08a', boxShadow: '0 15px 30px rgba(0,0,0,0.5), inset 0 2px 10px rgba(255,255,255,0.8)', textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
              {rankText}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes duckBounce { from { transform: translateY(0); } to { transform: translateY(-50px); } }
        @keyframes confettiDrop { from { transform: translateY(-20px) rotate(0deg); opacity: 1; } to { transform: translateY(500px) rotate(720deg); opacity: 0; } }
      `}</style>
    </div>
  );
}
