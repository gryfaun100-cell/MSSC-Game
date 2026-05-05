/**
 * MSSC Duck Race – 50-Bot Load Tester
 * ------------------------------------
 * Run with:  node run_bots.mjs
 *
 * This script will:
 *  1. Create a room via the server's socket API
 *  2. Seed 5 sample questions automatically
 *  3. Connect 50 bot players with unique names/colors/accessories
 *  4. Each bot answers every question with a realistic delay (1-7s)
 *  5. Auto-starts the game after all bots are connected
 */

import { io as SocketClient } from 'socket.io-client';

const SERVER = 'http://localhost:3001';

const SAMPLE_QUESTIONS = [
  {
    type: 'multiple',
    text: 'What is the capital of the Philippines?',
    options: ['Manila', 'Cebu', 'Davao', 'Quezon City'],
    correctAnswerIndex: 0,
    points: 10,
    image: ''
  },
  {
    type: 'multiple',
    text: 'Which planet is known as the Red Planet?',
    options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswerIndex: 1,
    points: 10,
    image: ''
  },
  {
    type: 'multiple',
    text: 'What is 15 × 4?',
    options: ['50', '55', '60', '65'],
    correctAnswerIndex: 2,
    points: 10,
    image: ''
  },
  {
    type: 'multiple',
    text: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'],
    correctAnswerIndex: 2,
    points: 15,
    image: ''
  },
  {
    type: 'multiple',
    text: 'What does "CPU" stand for?',
    options: ['Central Processing Unit', 'Computer Power Unit', 'Core Processing Utility', 'Central Program Unit'],
    correctAnswerIndex: 0,
    points: 10,
    image: ''
  }
];

const BOT_COLORS = [
  '#ef4444','#3b82f6','#22c55e','#eab308','#f97316',
  '#a855f7','#ec4899','#06b6d4','#84cc16','#6366f1',
  '#8b5cf6','#fbbf24','#94a3b8','#14b8a6','#d946ef',
  '#78350f','#0f172a','#f8fafc','#1e3a8a','#fb7185'
];
const BOT_ACCESSORIES = ['none', '🧢', '👑', '🕶️', '🎓', '🎩', '✨', '🔥', '🌟', '🏆'];

// --- Helper: wait ms
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('='.repeat(60));
  console.log('  MSSC Duck Race – 50-Bot Load Tester');
  console.log('='.repeat(60));

  // ── Step 1: Check server is alive ──────────────────────────────────────
  console.log('\n[1/4] Checking server connectivity...');
  try {
    const res = await fetch(`${SERVER}/api/rooms`);
    if (!res.ok) throw new Error('Bad response');
    console.log('      ✅ Server is reachable at', SERVER);
  } catch (e) {
    console.error('      ❌ Cannot reach server at', SERVER);
    console.error('         Make sure both servers are running: npm run start');
    process.exit(1);
  }

  // ── Step 2: Create room via admin socket ───────────────────────────────
  console.log('\n[2/4] Creating bot test room with 5 questions...');
  const adminSocket = SocketClient(SERVER);
  
  let roomId;
  await new Promise((resolve, reject) => {
    adminSocket.on('connect', () => {
      adminSocket.emit('createRoom', {
        roomName: '🤖 Bot Test Room – 50 Players',
        questions: SAMPLE_QUESTIONS.map((q, i) => ({ ...q, id: Date.now() + i })),
        timePerQuestion: 20
      });
    });
    adminSocket.on('roomCreated', (room) => {
      roomId = room.id;
      console.log(`      ✅ Room created: "${room.name}"`);
      console.log(`      📋 Room ID: ${roomId}`);
      console.log(`      ❓ Questions loaded: ${room.questions.length}`);
      resolve();
    });
    setTimeout(() => reject(new Error('Room creation timed out after 5s')), 5000);
  }).catch(e => { console.error('❌', e.message); process.exit(1); });

  // ── Step 3: Connect 50 bots ────────────────────────────────────────────
  console.log('\n[3/4] Connecting 50 bots (50ms stagger)...');
  const bots = [];
  let connectedCount = 0;
  let answeredCountTotal = 0;

  const botPromises = [];
  for (let i = 1; i <= 50; i++) {
    await wait(50); // stagger joins

    const botSocket = SocketClient(SERVER);
    const botName  = `Bot_${String(i).padStart(2, '0')}`;
    const botColor = BOT_COLORS[i % BOT_COLORS.length];
    const botAcc   = BOT_ACCESSORIES[i % BOT_ACCESSORIES.length];

    const p = new Promise((resolve) => {
      botSocket.on('connect', () => {
        connectedCount++;
        process.stdout.write(`\r      Bots connected: ${connectedCount}/50  `);
        botSocket.emit('joinRoom', {
          roomId,
          player: {
            name: botName,
            email: `${botName.toLowerCase()}@msscrace.bot`,
            color: botColor,
            accessory: botAcc
          }
        });
        resolve();
      });

      // Handle questions – answer with realistic delay
      botSocket.on('nextQuestion', ({ room: r, questionIndex }) => {
        const q = r.questions[questionIndex];
        if (!q) return;
        const thinkingTime = Math.random() * 6000 + 1000; // 1-7s
        setTimeout(() => {
          // 65% chance correct, 35% chance random wrong
          const isRight = Math.random() > 0.35;
          const ansIdx = isRight
            ? q.correctAnswerIndex
            : Math.floor(Math.random() * (q.options?.length || 4));
          botSocket.emit('submitAnswer', {
            roomId,
            answerIndex: ansIdx,
            answerText: q.options?.[ansIdx] ?? ''
          });
          answeredCountTotal++;
        }, thinkingTime);
      });

      botSocket.on('gameEnded', () => {
        setTimeout(() => botSocket.disconnect(), 3000);
      });
    });

    bots.push(botSocket);
    botPromises.push(p);
  }

  await Promise.all(botPromises);
  console.log('\n      ✅ All 50 bots connected and waiting in lobby!');

  // ── Step 4: Auto-start the game ────────────────────────────────────────
  console.log('\n[4/4] Starting game in 3 seconds...');
  await wait(3000);
  adminSocket.emit('startGame', roomId);
  console.log('      🚀 Game started! Bots are now answering questions...');
  console.log('\n' + '─'.repeat(60));
  console.log('  📊 Live Stats (press Ctrl+C to stop)');
  console.log('─'.repeat(60));

  // ── Live stats ticker ──────────────────────────────────────────────────
  const statsInterval = setInterval(async () => {
    try {
      const res = await fetch(`${SERVER}/api/rooms/${roomId}`);
      const room = await res.json();
      if (!room || room.error) { clearInterval(statsInterval); return; }
      const q = room.currentQuestionIndex + 1;
      const total = room.questions.length;
      const answered = room.players.filter(p => p.answered).length;
      const top3 = [...room.players]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((p, i) => `  ${['🥇','🥈','🥉'][i]} ${p.name}: ${p.score}pts`)
        .join('\n');
      process.stdout.write(
        `\r  Status: ${room.status.toUpperCase()} | Q${q}/${total} | Answered: ${answered}/50 | Total Answers: ${answeredCountTotal}   `
      );
      if (room.status === 'finished') {
        clearInterval(statsInterval);
        console.log('\n\n🏆 GAME FINISHED! Final Leaderboard (Top 3):');
        console.log(top3 || '  (no scores)');
        console.log('\n✅ Load test complete. All bots will disconnect shortly.');
        setTimeout(() => process.exit(0), 5000);
      }
    } catch (_) {}
  }, 1000);
}

main().catch(e => { console.error('\n❌ Fatal error:', e.message); process.exit(1); });
