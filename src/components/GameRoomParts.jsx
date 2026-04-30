import React from 'react';
const L = ['A','B','C','D'];

export function RaceTrack({ players, totalQ }) {
  if (!players.length) return <div style={{textAlign:'center',padding:24,color:'#94a3b8'}}>🦆 Waiting for players...</div>;
  
  return (
    <div style={{ position: 'relative', width: '100%', height: 220, background: 'linear-gradient(180deg, #bae6fd, #38bdf8)', borderRadius: 16, border: '4px solid #7dd3fc', overflow: 'hidden', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.1)' }}>
      {/* Finish line */}
      <div style={{ position: 'absolute', right: 20, top: 0, bottom: 0, width: 24, background: 'repeating-linear-gradient(45deg, #000, #000 12px, #fff 12px, #fff 24px)', opacity: 0.8 }} />
      <div style={{ position: 'absolute', right: 54, top: '50%', transform: 'translateY(-50%)', fontSize: 32, opacity: 0.9 }}>🏁</div>
      
      {/* Swarm of Ducks */}
      {players.map((p, index) => {
        const pct = totalQ > 0 ? Math.min((p.score / totalQ) * 85, 85) : 0;
        // Distribute them vertically so they "stick together" but stagger nicely.
        // Formula creates rows across the 220px height.
        const yOffset = 15 + (index % 5) * 32 + (index % 3) * 8; 
        
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: `calc(${pct}% + 10px)`,
            top: `${yOffset}px`,
            transition: 'left 0.7s cubic-bezier(0.34,1.56,0.64,1)',
            zIndex: 10 + Math.floor(pct),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
          }}>
            <span style={{ fontSize: 32 }}>🦆</span>
            <span style={{
              background: '#0f172a',
              color: 'white',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              marginTop: -6,
              whiteSpace: 'nowrap',
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {p.name}
            </span>
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
      <div style={{width:28,height:28,borderRadius:'50%',background:'#2563eb',color:'white',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{p.name[0]?.toUpperCase()}</div>
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
    <div style={{width:56,height:56,borderRadius:'50%',background:rank===1?'linear-gradient(135deg,#fbbf24,#f59e0b)':rank===2?'#94a3b8':'#cd7c2f',color:'white',fontSize:22,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>{player.name[0]?.toUpperCase()}</div>
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
