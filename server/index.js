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
  timePerQuestion: r.timePerQuestion ?? 30
});

// ── Question timer helpers ──────────────────────────────────────────────
function clearRoomTimers(room) {
  if (room._qTimer) { clearTimeout(room._qTimer); room._qTimer = null; }
  if (room._revealInterval) { clearInterval(room._revealInterval); room._revealInterval = null; }
}

function startQuestionTimer(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;
  clearRoomTimers(room);
  const secs = room.timePerQuestion || 30;
  room.questionStartedAt = Date.now();
  // Emit tick every second so clients can sync
  room._qTimer = setTimeout(() => triggerReveal(roomId), secs * 1000);
}

function triggerReveal(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;
  clearRoomTimers(room);
  // Tell only the HOST to show the 'Reveal Answer' button
  const hostSocket = io.sockets.sockets.get(room.hostId);
  if (hostSocket) {
    hostSocket.emit('readyToReveal', { questionIndex: room.currentQuestionIndex });
  } else {
    // Host not connected — auto-reveal
    broadcastReveal(roomId);
  }
}

function broadcastReveal(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== 'playing') return;
  const question = room.questions[room.currentQuestionIndex];
  io.to(roomId).emit('questionReveal', {
    question,
    correctAnswerIndex: question.correctAnswerIndex,
    correctAnswerText: question.options[question.correctAnswerIndex] ?? question.options[0],
    players: room.players
  });
  let count = 3;
  io.to(roomId).emit('revealCountdown', count);
  room._revealInterval = setInterval(() => {
    count -= 1;
    io.to(roomId).emit('revealCountdown', count);
    if (count <= 0) {
      clearInterval(room._revealInterval);
      room._revealInterval = null;
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

app.get('/api/rooms', (req, res) => res.json(Object.values(rooms).map(roomSummary)));

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// ── Sockets ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('createRoom', ({ roomName, questions, timePerQuestion }) => {
    const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
    rooms[roomId] = {
      id: roomId, name: roomName, status: 'waiting',
      questions: questions || [], timePerQuestion: timePerQuestion || 30,
      currentQuestionIndex: 0, players: [], hostId: socket.id,
      questionStartedAt: null
    };
    socket.join(roomId);
    socket.emit('roomCreated', rooms[roomId]);
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
  });

  socket.on('updateRoomQuestions', ({ roomId, questions }) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
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
      } else if (room.status === 'waiting') {
        room.players.push({ id: socket.id, name: player.name, email: player.email, score: 0, answered: false });
        io.to(roomId).emit('roomStateUpdate', room);
        io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
      } else {
        socket.emit('error', { message: 'Game already started.' });
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
    if (room.status === 'waiting') {
      room.players.push({ id: socket.id, name: player.name, email: player.email, score: 0, answered: false });
      socket.join(roomId);
      io.to(roomId).emit('roomStateUpdate', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    } else {
      socket.emit('error', { message: 'Game already started.' });
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    if (room.questions.length === 0)
      return socket.emit('error', { message: 'Add at least one question before starting.' });
    room.status = 'playing';
    room.currentQuestionIndex = 0;
    room.players.forEach(p => { p.score = 0; p.answered = false; p.lastAnswerCorrect = null; });
    io.to(roomId).emit('gameStarted', room);
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    startQuestionTimer(roomId);
  });

  socket.on('hostRevealAnswer', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id && room.status === 'playing') {
      clearRoomTimers(room);
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
    if (correct) player.score += 1;
    player.answered = true;
    player.lastAnswerCorrect = correct;

    socket.emit('answerResult', {
      correct,
      correctAnswerIndex: question.correctAnswerIndex,
      correctAnswerText: question.options[question.correctAnswerIndex] ?? question.options[0],
      question
    });
    io.to(roomId).emit('roomStateUpdate', room);

    // If ALL players answered early → trigger reveal immediately
    if (room.players.length > 0 && room.players.every(p => p.answered)) {
      triggerReveal(roomId);
    }
  });

  socket.on('endGame', (roomId) => {
    const room = rooms[roomId];
    if (room && room.hostId === socket.id) {
      clearRoomTimers(room);
      room.status = 'finished';
      io.to(roomId).emit('gameEnded', room);
      io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.hostId === socket.id) {
        clearRoomTimers(room);
        room.status = 'finished';
        io.to(roomId).emit('gameEnded', room);
        delete rooms[roomId];
      } else {
        const idx = room.players.findIndex(p => p.id === socket.id);
        if (idx !== -1) { room.players.splice(idx, 1); io.to(roomId).emit('roomStateUpdate', room); }
      }
    }
    io.emit('roomsUpdated', Object.values(rooms).map(roomSummary));
  });
});

httpServer.listen(3001, '0.0.0.0', () => console.log('Server on port 3001'));
