import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const users = [
  { company: 'Mustard Seed Systems Corporation', name: 'Admin', email: 'MSSC', password: 'MSSC@Davao', role: 'admin' }
];
const rooms = {};

const roomSummary = (r) => ({
  id: r.id, name: r.name, status: r.status,
  playerCount: r.players.length, questionCount: r.questions.length,
  timePerQuestion: r.timePerQuestion ?? 30,
  winScore: r.winScore ?? 100,
  usedColors: r.players.map(p => p.color)
});

const DUCK_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#8b5cf6', '#fbbf24', '#94a3b8', '#14b8a6', '#d946ef', '#78350f', '#0f172a', '#f8fafc', '#1e3a8a', '#fb7185'];

function assignColor(room) {
  const used = room.players.map(p => p.color);
  const avail = DUCK_COLORS.filter(c => !used.includes(c));
  return avail.length > 0 ? avail[0] : DUCK_COLORS[Math.floor(Math.random() * DUCK_COLORS.length)];
}

const roomTimers = {};

// ── Question timer helpers ──────────────────────────────────────────────
function clearRoomTimers(roomId) {
  if (roomTimers[roomId]) {
    if (roomTimers[roomId]._qTimer) clearInterval(roomTimers[roomId]._qTimer);
    if (roomTimers[roomId]._revealInterval) clearInterval(roomTimers[roomId]._revealInterval);
    delete roomTimers[roomId];
  }
}

function startQuestionTimer(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;
  clearRoomTimers(roomId);
  roomTimers[roomId] = {};
  room.timeLeft = parseInt(room.timePerQuestion || 30, 10);
  
  // Strict server-side tick to ensure perfect sync
  roomTimers[roomId]._qTimer = setInterval(() => {
    room.timeLeft -= 1;
    io.to(roomId).emit('timerTick', room.timeLeft);
    if (room.timeLeft <= 0) {
      triggerReveal(roomId);
    }
  }, 1000);
}

function triggerReveal(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;
  clearRoomTimers(roomId);
  broadcastReveal(roomId);
}

function broadcastReveal(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;

  // Apply pending scores and reveal correctness
  const winScore = room.winScore || 100;
  room.players.forEach(p => {
    if (p.answered) {
      p.score = Math.max(0, (p.score || 0) + (p.pendingScore || 0));
      p.lastAnswerCorrect = p.pendingCorrect ?? false;
      delete p.pendingScore;
      delete p.pendingCorrect;
    }
  });

  // Check if any player has reached the win score
  const winner = room.players.find(p => p.score >= winScore);
  if (winner) {
    clearRoomTimers(roomId);
    room.status = 'finished';
    io.to(roomId).emit('questionReveal', {
      question: room.questions[room.currentQuestionIndex],
      correctAnswerIndex: room.questions[room.currentQuestionIndex]?.correctAnswerIndex,
      correctAnswerText: room.questions[room.currentQuestionIndex]?.options?.[room.questions[room.currentQuestionIndex]?.correctAnswerIndex] ?? '',
      players: room.players,
      winnerReached: true,
      winnerName: winner.name,
      winScore
    });
    io.to(roomId).emit('roomStateUpdate', room);
    setTimeout(() => {
      io.to(roomId).emit('gameEnded', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    }, 3000);
    return;
  }

  const question = room.questions[room.currentQuestionIndex];
  io.to(roomId).emit('questionReveal', {
    question,
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerText: question.options[question.correctAnswerIndex] ?? question.options[0],
    players: room.players
  });
  
  io.to(roomId).emit('roomStateUpdate', room);
  let count = 3;
  io.to(roomId).emit('revealCountdown', count);
  
  if (!roomTimers[roomId]) roomTimers[roomId] = {};
  roomTimers[roomId]._revealInterval = setInterval(() => {
    count -= 1;
    io.to(roomId).emit('revealCountdown', count);
    if (count <= 0) {
      if (roomTimers[roomId] && roomTimers[roomId]._revealInterval) {
        clearInterval(roomTimers[roomId]._revealInterval);
        roomTimers[roomId]._revealInterval = null;
      }
      advanceQuestion(roomId);
    }
  }, 1000);
}

function advanceQuestion(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.currentQuestionIndex += 1;
  room.players.forEach(p => { p.answered = false; p.lastAnswerCorrect = null; });
  if (room.currentQuestionIndex >= room.questions.length) {
    room.status = 'finished';
    io.to(roomId).emit('gameEnded', room);
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
  } else {
    io.to(roomId).emit('nextQuestion', { room, questionIndex: room.currentQuestionIndex });
    io.to(roomId).emit('roomStateUpdate', room);
    startQuestionTimer(roomId);
  }
}

// ── REST ───────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { company, name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Full name is required.' });
  const email = name.trim().toLowerCase().replace(/\s+/g, '.');
  if (users.find(u => u.email === email))
    return res.status(400).json({ error: 'A player with this name already exists.' });
  const newUser = { company: company || '', name: name.trim(), email, password: '', role: 'player' };
  users.push(newUser);
  res.json({ success: true, user: { name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
});

app.get('/api/users', (req, res) => {
  res.json(users.filter(u => u.role === 'player').map(u => ({
    name: u.name,
    email: u.email,
    company: u.company,
    role: u.role
  })));
});

app.get('/api/rooms', (req, res) => res.json(Object.values(rooms).map(roomSummary)));

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// ── Sockets ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('createRoom', ({ roomName, questions, timePerQuestion, winScore }) => {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
    rooms[roomId] = {
      id: roomId, name: roomName, status: 'waiting',
      questions: questions || [], timePerQuestion: timePerQuestion || 30,
      winScore: winScore || 100,
      currentQuestionIndex: 0, players: [], hostId: socket.id,
      questionStartedAt: null
    };
    socket.join(roomId);
    socket.emit('roomCreated', rooms[roomId]);
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
  });

  socket.on('updateRoomQuestions', ({ roomId, questions }) => {
    const room = rooms[roomId];
    if (room) {
      room.questions = questions;
      io.to(roomId).emit('roomStateUpdate', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    }
  });

  socket.on('rejoinRoom', ({ roomId, isAdmin, player }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    socket.join(roomId);
    if (isAdmin) {
      room.hostId = socket.id;
      socket.emit('roomStateUpdate', room);
    } else if (player) {
      const existing = room.players.find(p => p.email === player.email);
      if (existing) {
        existing.id = socket.id;
        socket.emit('roomStateUpdate', room);
      } else if (room.status === 'waiting' || room.status === 'playing') {
        room.players.push({ id: socket.id, name: player.name, email: player.email, score: 0, answered: false, color: player.color || assignColor(room), accessory: player.accessory || 'none' });
        io.to(roomId).emit('roomStateUpdate', room);
        io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
        if (room.status === 'playing') {
          socket.emit('gameStarted', room);
          socket.emit('nextQuestion', { room, questionIndex: room.currentQuestionIndex });
        }
      } else {
        socket.emit('error', { message: 'Game already finished.' });
      }
    }
  });

  socket.on('joinRoom', ({ roomId, player }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    const existing = room.players.find(p => p.email === player.email);
    if (existing) {
      existing.id = socket.id; socket.join(roomId);
      socket.emit('roomStateUpdate', room); return;
    }
    if (room.status === 'waiting' || room.status === 'playing') {
      room.players.push({ id: socket.id, name: player.name, email: player.email, score: 0, answered: false, color: player.color || assignColor(room), accessory: player.accessory || 'none' });
      socket.join(roomId);
      io.to(roomId).emit('roomStateUpdate', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
      if (room.status === 'playing') {
        socket.emit('gameStarted', room);
        socket.emit('nextQuestion', { room, questionIndex: room.currentQuestionIndex });
      }
    } else {
      socket.emit('error', { message: 'Game already finished.' });
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.questions.length === 0)
      return socket.emit('error', { message: 'Add at least one question before starting.' });
    room.status = 'playing';
    room.currentQuestionIndex = 0;
    room.players.forEach(p => { p.score = 0; p.answered = false; p.lastAnswerCorrect = null; });
    io.to(roomId).emit('gameStarted', room);
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    startQuestionTimer(roomId);
  });

  socket.on('skipToNextQuestion', (roomId) => {
    const room = rooms[roomId];
    if (room && room.status === 'playing') {
      clearRoomTimers(roomId);
      advanceQuestion(roomId);
    }
  });

  socket.on('hostRevealAnswer', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id && room.status === 'playing') {
      clearRoomTimers(roomId);
      broadcastReveal(roomId);
    }
  });

  socket.on('submitAnswer', ({ roomId, answerIndex, answerText }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.answered) return;
    const question = room.questions[room.currentQuestionIndex];
    if (!question) return;

    let correct = false;
    if (question.type === 'multiple') {
      correct = answerIndex === question.correctAnswerIndex;
    } else {
      const ua = (answerText || '').trim().toLowerCase();
      const ca = (question.options[question.correctAnswerIndex] ?? question.options[0] ?? '').trim().toLowerCase();
      correct = ua === ca;
    }
    player.answered = true;
    player.pendingCorrect = correct;
    const questionPoints = question.points || 10;
    const deductionPoints = Math.max(1, Math.floor(questionPoints * 0.2)); // 20% deduction, min 1
    player.pendingScore = correct ? questionPoints : -deductionPoints;

    socket.emit('answerAck', true);
    io.to(roomId).emit('roomStateUpdate', room);

    // If ALL players answered early → trigger reveal immediately
    if (room.players.length > 0 && room.players.every(p => p.answered)) {
      triggerReveal(roomId);
    }
  });

  socket.on('endGame', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      clearRoomTimers(roomId);
      room.status = 'finished';
      io.to(roomId).emit('gameEnded', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    }
  });

  socket.on('replayRoom', ({ roomId, keepPlayers }) => {
    const room = rooms[roomId];
    if (room && room.status === 'finished') {
      clearRoomTimers(roomId);
      room.currentQuestionIndex = 0;
      if (!keepPlayers) {
        room.status = 'waiting';
        room.players = [];
        io.to(roomId).emit('roomStateUpdate', room);
        io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
      } else {
        room.status = 'playing';
        room.players.forEach(p => { p.score = 0; p.answered = false; p.lastAnswerCorrect = null; });
        io.to(roomId).emit('gameStarted', room);
        io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
        startQuestionTimer(roomId);
      }
    }
  });

  socket.on('deleteRoom', (roomId) => {
    const room = rooms[roomId];
    if (room) {
      clearRoomTimers(roomId);
      io.to(roomId).emit('gameEnded', room);
      delete rooms[roomId];
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.hostId === socket.id) {
        // Do nothing. Allow admin to refresh and rejoin. Room is only deleted via manual delete.
      } else {
        const idx = room.players.findIndex(p => p.id === socket.id);
        if (idx !== -1) { room.players.splice(idx, 1); io.to(roomId).emit('roomStateUpdate', room); }
      }
    }
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
