const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');
const { connectProducer, disconnectProducer } = require('./kafka');
const { getLeaderboard } = require('./db');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS origins - include both development and production
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://connect-four-game-axokdmjp7-gurmeet-singh-rathors-projects.vercel.app',
   'https://connect-four-game-sepia.vercel.app',
  'https://connect-four-game-gurmeet-singh-rathors-projects.vercel.app'
];

// Socket.IO configuration with production CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

const gameManager = new GameManager(io);

app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await getLeaderboard(limit);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeGames: gameManager.games.size,
    waitingPlayers: gameManager.waitingPlayers.length 
  });
});

io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  socket.on('join_queue', async (data) => {
    const { username } = data;

    if (!username || username.trim() === '') {
      socket.emit('error', { message: 'Username is required' });
      return;
    }

    console.log(`👤 ${username} joined matchmaking queue`);
    await gameManager.joinQueue(socket, username.trim());
  });

  socket.on('make_move', async (data) => {
    await gameManager.handleMove(socket, data);
  });

  socket.on('reconnect_to_game', async (data) => {
    await gameManager.handleReconnect(socket, data);
  });

  socket.on('leave_queue', () => {
    gameManager.removeFromQueue(socket);
  });

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
    gameManager.removeFromQueue(socket);
    gameManager.handleDisconnect(socket);
  });
});

async function startServer() {
  try {
    await connectProducer();

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════╗
║   Connect Four Backend Server         ║
║   Running on port ${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectProducer();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await disconnectProducer();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
