 
// Backend API URL - change for production
// Backend API URL
const BACKEND_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://connect-four-game-mrsq.onrender.com';  



let socket;
let gameState = {
  gameId: null,
  username: null,
  playerNumber: null,
  isMyTurn: false,
  board: [],
  player1: null,
  player2: null,
  gameActive: false
};

function connectSocket() {
  console.log('Connecting to backend:', BACKEND_URL);
  
  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });
  
  socket.on('connect', () => {
    console.log('✓ Connected to server, Socket ID:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    showStatus('Failed to connect to server');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
  });
  
  socket.on('waiting_for_opponent', (data) => {
    console.log('Waiting for opponent...');
    showScreen('waiting-screen');
  });
  
  socket.on('game_started', (data) => {
    console.log('Game started:', data);
    gameState.gameId = data.gameId;
    gameState.player1 = data.player1;
    gameState.player2 = data.player2;
    gameState.board = data.board;
    gameState.playerNumber = data.player1 === gameState.username ? 1 : 2;
    gameState.isMyTurn = data.yourTurn === gameState.playerNumber;
    gameState.gameActive = true;
    startGame(data);
  });
  
  socket.on('move_made', (data) => {
    if (!gameState.gameActive) return;
    gameState.board = data.board;
    updateBoard(data.board);
    updateMoveCount(data.moveCount);
    gameState.isMyTurn = !gameState.isMyTurn;
    updateTurnIndicator();
  });
  
  socket.on('game_over', (data) => {
    gameState.gameActive = false;
    showGameOver(data);
  });
  
  socket.on('game_forfeited', (data) => {
    gameState.gameActive = false;
    showGameOver({
      winner: data.winner,
      message: data.disconnectedPlayer + ' disconnected',
      totalMoves: 0,
      durationSeconds: 0
    });
  });
  
  socket.on('player_disconnected', (data) => {
    showStatus(data.player + ' disconnected. Waiting for reconnection...');
  });
  
  socket.on('player_reconnected', (data) => {
    showStatus(data.player + ' reconnected!');
  });
  
  socket.on('error', (data) => {
    showStatus('Error: ' + data.message);
  });
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showStatus(message) {
  const statusEl = document.getElementById('status-message');
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      statusEl.textContent = '';
    }, 3000);
  }
}

function joinGame() {
  const username = document.getElementById('username-input').value.trim();
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  console.log('Joining game as:', username);
  
  // Reset game state completely
  gameState = {
    gameId: null,
    username: username,
    playerNumber: null,
    isMyTurn: false,
    board: [],
    player1: null,
    player2: null,
    gameActive: false
  };
  
  connectSocket();
  
  // Wait for connection before emitting
  socket.on('connect', () => {
    console.log('Socket connected, joining queue...');
    socket.emit('join_queue', { username });
    showScreen('waiting-screen');
  });
}

function cancelQueue() {
  if (socket) {
    socket.emit('leave_queue');
    socket.disconnect();
  }
  showScreen('username-screen');
}

function startGame(data) {
  showScreen('game-screen');
  document.getElementById('player1-name').textContent = data.player1;
  document.getElementById('player2-name').textContent = data.player2;
  document.getElementById('move-count').textContent = 'Moves: 0';
  createBoard();
  updateBoard(data.board);
  updateTurnIndicator();
}

function createBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  
  for (let col = 0; col < 7; col++) {
    const column = document.createElement('div');
    column.className = 'column';
    column.dataset.col = col;
    column.onclick = () => makeMove(col);
    
    for (let row = 0; row < 6; row++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      column.appendChild(cell);
    }
    board.appendChild(column);
  }
}

function updateBoard(boardData) {
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = document.querySelector('.cell[data-row="' + row + '"][data-col="' + col + '"]');
      if (cell) {
        const value = boardData[row][col];
        cell.className = 'cell';
        if (value === 1) cell.classList.add('player1');
        else if (value === 2) cell.classList.add('player2');
      }
    }
  }
}

function makeMove(column) {
  if (!gameState.gameActive) {
    showStatus('Game is not active. Please start a new game.');
    return;
  }
  
  if (!gameState.isMyTurn) {
    showStatus('Wait for your turn!');
    return;
  }
  
  socket.emit('make_move', {
    gameId: gameState.gameId,
    column: column
  });
}

function updateTurnIndicator() {
  const indicator = document.getElementById('turn-indicator');
  const p1 = document.getElementById('player1-name');
  const p2 = document.getElementById('player2-name');
  
  p1.classList.remove('active');
  p2.classList.remove('active');
  
  if (!gameState.gameActive) {
    indicator.textContent = 'Game Over';
    document.querySelectorAll('.column').forEach(c => c.classList.add('disabled'));
    return;
  }
  
  if (gameState.isMyTurn) {
    indicator.textContent = 'Your Turn!';
    if (gameState.playerNumber === 1) p1.classList.add('active');
    else p2.classList.add('active');
    document.querySelectorAll('.column').forEach(c => c.classList.remove('disabled'));
  } else {
    const opponent = gameState.playerNumber === 1 ? gameState.player2 : gameState.player1;
    indicator.textContent = opponent + "'s Turn";
    if (gameState.playerNumber === 1) p2.classList.add('active');
    else p1.classList.add('active');
    document.querySelectorAll('.column').forEach(c => c.classList.add('disabled'));
  }
}

function updateMoveCount(count) {
  document.getElementById('move-count').textContent = 'Moves: ' + count;
}

function showGameOver(data) {
  showScreen('gameover-screen');
  const title = document.getElementById('result-title');
  const message = document.getElementById('result-message');
  
  if (data.winner === gameState.username) {
    title.textContent = '🏆 You Won!';
    title.style.color = '#27ae60';
  } else if (data.winner === null) {
    title.textContent = '🤝 Draw!';
    title.style.color = '#f39c12';
  } else {
    title.textContent = '😢 You Lost!';
    title.style.color = '#e74c3c';
  }
  
  message.textContent = data.message || ('Winner: ' + (data.winner || 'Draw'));
  
  const stats = document.getElementById('game-stats');
  stats.innerHTML = 
    '<p><strong>Total Moves:</strong> ' + (data.totalMoves || 0) + '</p>' +
    '<p><strong>Duration:</strong> ' + (data.durationSeconds || 0) + ' seconds</p>';
}

function playAgain() {
  // Disconnect old socket
  if (socket) {
    socket.off();  // Remove all listeners
    socket.disconnect();
  }
  
  // Keep username but reset everything else
  const savedUsername = gameState.username;
  
  gameState = {
    gameId: null,
    username: savedUsername,
    playerNumber: null,
    isMyTurn: false,
    board: [],
    player1: null,
    player2: null,
    gameActive: false
  };
  
  // Reconnect and join queue
  connectSocket();
  
  // Wait for connection then join
  socket.on('connect', () => {
    socket.emit('join_queue', { username: savedUsername });
    showScreen('waiting-screen');
  });
}

async function showLeaderboard() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/leaderboard?limit=10`);
    const data = await response.json();
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    
    if (data.success && data.data.length > 0) {
      data.data.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = 
          '<td>' + (index + 1) + '</td>' +
          '<td>' + player.username + '</td>' +
          '<td>' + player.games_won + '</td>' +
          '<td>' + player.games_played + '</td>' +
          '<td>' + player.win_percentage + '%</td>';
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
    }
    showScreen('leaderboard-screen');
  } catch (error) {
    console.error('Leaderboard error:', error);
    alert('Failed to load leaderboard');
  }
}

function closeLeaderboard() {
  // Always go back to username screen when closing leaderboard after game
  showScreen('username-screen');
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('Connect Four Frontend Ready');
  console.log('Backend URL:', BACKEND_URL);
  
  document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
  });
});
