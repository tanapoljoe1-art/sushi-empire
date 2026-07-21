const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const fs         = require('fs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

// ── เสิร์ฟไฟล์เกม: dist/ ถ้ามีการ build ด้วย Vite, ไม่งั้น fallback ไป public/
// โดยตรง (native ES modules ทำงานได้โดยไม่ต้อง build เลย) พร้อมแก้ MIME type ──
const distDir = path.join(__dirname, 'dist');
const staticDir = fs.existsSync(distDir) ? distDir : path.join(__dirname, 'public');
app.use(express.static(staticDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js'))  res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
  }
}));

// ── เก็บข้อมูลห้องและ leaderboard ──
const rooms = new Map();
let leaderboard = [];          // all-time
let dailyLeaderboard = [];     // current UTC day only
let dailyDayKey = utcDayKey();

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function ensureDailyBoard() {
  const key = utcDayKey();
  if (key !== dailyDayKey) {
    dailyDayKey = key;
    dailyLeaderboard = [];
  }
}

function sanitizeName(name, fallback) {
  return String(name ?? '').trim().slice(0, 20) || fallback;
}

function makeRoomCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += c[Math.floor(Math.random() * c.length)];
  return code;
}

function broadcastRoomList() {
  const list = [];
  rooms.forEach((room, code) => {
    if (room.host) {
      list.push({
        code,
        hostName:       room.snapshot?.playerName || 'เชฟ',
        level:          room.snapshot?.level       || 1,
        served:         room.snapshot?.served      || 0,
        spectatorCount: room.spectators.length,
      });
    }
  });
  io.emit('roomList', list);
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const code = makeRoomCode();
    rooms.set(code, { host: socket.id, hostName: sanitizeName(playerName, 'เชฟ'), spectators: [], snapshot: null });
    socket.join(code);
    socket.roomCode = code;
    socket.isHost   = true;
    socket.emit('roomCreated', { code });
    broadcastRoomList();
  });

  socket.on('gameSnapshot', (snapshot) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;
    room.snapshot = snapshot;
    socket.to(socket.roomCode).emit('snapshot', snapshot);
  });

  socket.on('gameEvent', (event) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host !== socket.id) return;
    socket.to(socket.roomCode).emit('gameEvent', event);
  });

  socket.on('joinRoom', ({ code, viewerName }) => {
    const room = rooms.get(code);
    if (!room) { socket.emit('joinError', 'ไม่พบห้อง ' + code); return; }
    socket.join(code);
    socket.roomCode   = code;
    socket.isHost     = false;
    socket.viewerName = sanitizeName(viewerName, 'ผู้ชม');
    room.spectators.push({ id: socket.id, name: socket.viewerName });
    socket.emit('joinedRoom', { code, hostName: room.hostName, snapshot: room.snapshot, spectators: room.spectators });
    io.to(room.host).emit('spectatorJoined', { name: socket.viewerName, count: room.spectators.length });
    io.to(code).emit('spectatorList', room.spectators);
    broadcastRoomList();
  });

  socket.on('reaction', ({ emoji }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.host === socket.id) return;
    io.to(socket.roomCode).emit('reaction', { name: socket.viewerName || 'ผู้ชม', emoji: emoji || '👏' });
  });

  socket.on('chat', ({ msg }) => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || !msg?.trim()) return;
    const isHost = room.host === socket.id;
    io.to(code).emit('chat', { name: isHost ? room.hostName : (socket.viewerName || 'ผู้ชม'), msg: msg.trim().slice(0, 60), isHost });
  });

  socket.on('submitScore', ({ name, score, level, served, prestige, day }) => {
    const now = Date.now();
    if (socket._lastScoreAt && now - socket._lastScoreAt < 3000) return; // rate limit: 1 submit / 3s
    socket._lastScoreAt = now;

    ensureDailyBoard();
    const cleanName = sanitizeName(name, 'เชฟ');
    const entry = {
      name: cleanName,
      score: Number(score) || 0,
      level: Number(level) || 1,
      served: Number(served) || 0,
      prestige: prestige || 0,
      ts: Date.now(),
      day: day || dailyDayKey,
    };

    // All-time (best score per name wins)
    const prevAll = leaderboard.find(r => r.name === cleanName);
    if (!prevAll || entry.score >= prevAll.score) {
      leaderboard = leaderboard.filter(r => r.name !== cleanName);
      leaderboard.push({ ...entry });
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 50);
    }

    // Daily board — only if client day matches server UTC day
    if (!day || day === dailyDayKey) {
      const prevD = dailyLeaderboard.find(r => r.name === cleanName);
      if (!prevD || entry.score >= prevD.score) {
        dailyLeaderboard = dailyLeaderboard.filter(r => r.name !== cleanName);
        dailyLeaderboard.push({ ...entry, day: dailyDayKey });
        dailyLeaderboard.sort((a, b) => b.score - a.score);
        dailyLeaderboard = dailyLeaderboard.slice(0, 50);
      }
    }

    io.emit('leaderboard', { mode: 'all', rows: leaderboard.slice(0, 20) });
    io.emit('leaderboard', { mode: 'daily', day: dailyDayKey, rows: dailyLeaderboard.slice(0, 20) });
  });

  socket.on('getLeaderboard', (opts = {}) => {
    ensureDailyBoard();
    const mode = opts && opts.mode === 'all' ? 'all' : 'daily';
    if (mode === 'all') {
      socket.emit('leaderboard', { mode: 'all', rows: leaderboard.slice(0, 20) });
    } else {
      socket.emit('leaderboard', { mode: 'daily', day: dailyDayKey, rows: dailyLeaderboard.slice(0, 20) });
    }
  });
  socket.on('getRoomList', () => broadcastRoomList());

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (room.host === socket.id) {
      io.to(code).emit('hostLeft');
      rooms.delete(code);
    } else {
      room.spectators = room.spectators.filter(s => s.id !== socket.id);
      io.to(code).emit('spectatorList', room.spectators);
      if (room.host) io.to(room.host).emit('spectatorLeft', { count: room.spectators.length });
    }
    broadcastRoomList();
  });
});

app.get('/health', (_, res) => {
  ensureDailyBoard();
  res.json({
    ok: true,
    rooms: rooms.size,
    day: dailyDayKey,
    lbAll: leaderboard.length,
    lbDaily: dailyLeaderboard.length,
  });
});

server.listen(PORT, () => console.log(`Sushi Empire server :${PORT}`));
