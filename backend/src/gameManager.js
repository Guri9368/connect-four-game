const { v4: uuidv4 } = require('uuid');
const { createBoard, makeMove, checkWin, isBoardFull, isValidMove } = require('./gameLogic');
const { getBotMove } = require('./botAI');
const { publishEvent } = require('./kafka');
const { saveGame, ensureUser } = require('./db');
const { MATCHMAKING_TIMEOUT, RECONNECTION_TIMEOUT, PLAYER_1, PLAYER_2 } = require('./utils/constants');

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map();
    this.waitingPlayers = [];
    this.playerToGame = new Map();
    this.usernameToSocket = new Map();
  }

  async joinQueue(socket, username) {
    await ensureUser(username);

    this.usernameToSocket.set(username, socket.id);

    if (this.waitingPlayers.length > 0) {
      const opponent = this.waitingPlayers.shift();

      if (opponent.botTimeout) {
        clearTimeout(opponent.botTimeout);
      }

      this.startGame(opponent.socket, opponent.username, socket, username);
    } else {
      const playerData = {
        socket,
        username,
        botTimeout: setTimeout(() => {
          console.log(`⏰ No opponent found for ${username}, starting bot game`);
          this.startGameWithBot(socket, username);

          const index = this.waitingPlayers.findIndex(p => p.username === username);
          if (index !== -1) {
            this.waitingPlayers.splice(index, 1);
          }
        }, MATCHMAKING_TIMEOUT)
      };

      this.waitingPlayers.push(playerData);
      socket.emit('waiting_for_opponent', { message: 'Searching for opponent...' });
    }
  }

  async startGame(socket1, username1, socket2, username2) {
    const gameId = uuidv4();

    const game = {
      gameId,
      board: createBoard(),
      players: {
        [PLAYER_1]: { username: username1, socketId: socket1.id },
        [PLAYER_2]: { username: username2, socketId: socket2.id }
      },
      currentTurn: PLAYER_1,
      status: 'active',
      moveCount: 0,
      startTime: Date.now(),
      disconnectedAt: null,
      reconnectionTimeout: null
    };

    this.games.set(gameId, game);
    this.playerToGame.set(socket1.id, gameId);
    this.playerToGame.set(socket2.id, gameId);

    socket1.join(gameId);
    socket2.join(gameId);

    this.io.to(gameId).emit('game_started', {
      gameId,
      player1: username1,
      player2: username2,
      yourTurn: PLAYER_1,
      board: game.board
    });

    console.log(`🎮 Game started: ${gameId} - ${username1} vs ${username2}`);

    await publishEvent('game_started', {
      gameId,
      player1: username1,
      player2: username2
    });
  }

  async startGameWithBot(socket, username) {
    const gameId = uuidv4();

    const game = {
      gameId,
      board: createBoard(),
      players: {
        [PLAYER_1]: { username, socketId: socket.id },
        [PLAYER_2]: { username: 'bot', socketId: null }
      },
      currentTurn: PLAYER_1,
      status: 'active',
      moveCount: 0,
      startTime: Date.now(),
      disconnectedAt: null,
      reconnectionTimeout: null
    };

    this.games.set(gameId, game);
    this.playerToGame.set(socket.id, gameId);
    socket.join(gameId);

    socket.emit('game_started', {
      gameId,
      player1: username,
      player2: 'bot',
      yourTurn: PLAYER_1,
      board: game.board
    });

    console.log(`🤖 Bot game started: ${gameId} - ${username} vs bot`);

    await publishEvent('game_started', {
      gameId,
      player1: username,
      player2: 'bot'
    });
  }

  async handleMove(socket, data) {
    const { gameId, column } = data;
    const game = this.games.get(gameId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (game.status !== 'active') {
      socket.emit('error', { message: 'Game is not active' });
      return;
    }

    const playerNum = game.players[PLAYER_1].socketId === socket.id ? PLAYER_1 : PLAYER_2;

    if (game.currentTurn !== playerNum) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    if (!isValidMove(game.board, column)) {
      socket.emit('error', { message: 'Invalid move' });
      return;
    }

    const result = makeMove(game.board, column, playerNum);
    if (!result.success) {
      socket.emit('error', { message: 'Move failed' });
      return;
    }

    game.moveCount++;
    const username = game.players[playerNum].username;

    console.log(`🎲 Move ${game.moveCount}: ${username} played column ${column}`);

    this.io.to(gameId).emit('move_made', {
      player: username,
      column,
      row: result.row,
      board: game.board,
      moveCount: game.moveCount
    });

    await publishEvent('move_played', {
      gameId,
      player: username,
      column,
      moveNumber: game.moveCount
    });

    if (checkWin(game.board, playerNum)) {
      await this.endGame(gameId, username);
      return;
    }

    if (isBoardFull(game.board)) {
      await this.endGame(gameId, null);
      return;
    }

    game.currentTurn = game.currentTurn === PLAYER_1 ? PLAYER_2 : PLAYER_1;

    if (game.players[game.currentTurn].username === 'bot') {
      setTimeout(() => this.executeBotMove(gameId), 500);
    }
  }

  async executeBotMove(gameId) {
    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') return;

    try {
      const botPlayerNum = game.players[PLAYER_2].username === 'bot' ? PLAYER_2 : PLAYER_1;
      const column = getBotMove(game.board, botPlayerNum);

      const result = makeMove(game.board, column, botPlayerNum);
      game.moveCount++;

      this.io.to(gameId).emit('move_made', {
        player: 'bot',
        column,
        row: result.row,
        board: game.board,
        moveCount: game.moveCount
      });

      await publishEvent('move_played', {
        gameId,
        player: 'bot',
        column,
        moveNumber: game.moveCount
      });

      if (checkWin(game.board, botPlayerNum)) {
        await this.endGame(gameId, 'bot');
        return;
      }

      if (isBoardFull(game.board)) {
        await this.endGame(gameId, null);
        return;
      }

      game.currentTurn = botPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;

    } catch (error) {
      console.error('Bot move error:', error);
    }
  }

  async endGame(gameId, winner) {
    const game = this.games.get(gameId);
    if (!game) return;

    game.status = 'completed';
    const durationSeconds = Math.floor((Date.now() - game.startTime) / 1000);

    this.io.to(gameId).emit('game_over', {
      winner,
      totalMoves: game.moveCount,
      durationSeconds,
      board: game.board
    });

    console.log(`🏁 Game ${gameId} ended - Winner: ${winner || 'Draw'}`);

    await saveGame({
      gameId,
      player1: game.players[PLAYER_1].username,
      player2: game.players[PLAYER_2].username,
      winner,
      totalMoves: game.moveCount,
      durationSeconds
    });

    await publishEvent('game_ended', {
      gameId,
      winner,
      totalMoves: game.moveCount,
      durationSeconds
    });

    this.playerToGame.delete(game.players[PLAYER_1].socketId);
    if (game.players[PLAYER_2].socketId) {
      this.playerToGame.delete(game.players[PLAYER_2].socketId);
    }

    setTimeout(() => {
      this.games.delete(gameId);
      console.log(`🗑️  Game ${gameId} removed from memory`);
    }, 300000);
  }

  handleDisconnect(socket) {
    const gameId = this.playerToGame.get(socket.id);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') return;

    let disconnectedPlayer = null;
    for (const [playerNum, playerData] of Object.entries(game.players)) {
      if (playerData.socketId === socket.id) {
        disconnectedPlayer = playerData.username;
        break;
      }
    }

    if (!disconnectedPlayer || disconnectedPlayer === 'bot') return;

    console.log(`⚠️  Player ${disconnectedPlayer} disconnected from game ${gameId}`);

    game.disconnectedAt = Date.now();

    this.io.to(gameId).emit('player_disconnected', {
      player: disconnectedPlayer,
      reconnectionTime: RECONNECTION_TIMEOUT / 1000
    });

    publishEvent('player_disconnected', {
      gameId,
      player: disconnectedPlayer
    });

    game.reconnectionTimeout = setTimeout(async () => {
      console.log(`❌ Player ${disconnectedPlayer} failed to reconnect. Game forfeited.`);

      const winner = game.players[PLAYER_1].username === disconnectedPlayer 
        ? game.players[PLAYER_2].username 
        : game.players[PLAYER_1].username;

      game.status = 'forfeited';

      this.io.to(gameId).emit('game_forfeited', {
        disconnectedPlayer,
        winner: winner === 'bot' ? 'bot' : winner
      });

      await this.endGame(gameId, winner);
    }, RECONNECTION_TIMEOUT);
  }

  async handleReconnect(socket, data) {
    const { username, gameId } = data;

    const game = this.games.get(gameId);

    if (!game) {
      socket.emit('reconnect_failed', { message: 'Game not found' });
      return;
    }

    let playerNum = null;
    for (const [num, playerData] of Object.entries(game.players)) {
      if (playerData.username === username) {
        playerNum = parseInt(num);
        break;
      }
    }

    if (!playerNum) {
      socket.emit('reconnect_failed', { message: 'Player not in this game' });
      return;
    }

    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
    }

    game.players[playerNum].socketId = socket.id;
    this.playerToGame.set(socket.id, gameId);
    this.usernameToSocket.set(username, socket.id);

    socket.join(gameId);

    socket.emit('reconnect_success', {
      gameId,
      board: game.board,
      currentTurn: game.currentTurn,
      moveCount: game.moveCount,
      player1: game.players[PLAYER_1].username,
      player2: game.players[PLAYER_2].username,
      yourPlayerNum: playerNum
    });

    this.io.to(gameId).emit('player_reconnected', {
      player: username
    });

    console.log(`✓ Player ${username} reconnected to game ${gameId}`);
  }

  removeFromQueue(socket) {
    const index = this.waitingPlayers.findIndex(p => p.socket.id === socket.id);
    if (index !== -1) {
      const player = this.waitingPlayers[index];
      if (player.botTimeout) {
        clearTimeout(player.botTimeout);
      }
      this.waitingPlayers.splice(index, 1);
      console.log(`Removed ${player.username} from matchmaking queue`);
    }
  }
}

module.exports = GameManager;
