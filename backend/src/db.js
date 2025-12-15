const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000
});

async function ensureUser(username) {
  const query = `
    INSERT INTO users (username, games_won, games_played)
    VALUES ($1, 0, 0)
    ON CONFLICT (username) DO NOTHING
    RETURNING *;
  `;

  try {
    await pool.query(query, [username]);
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  } catch (error) {
    console.error('Error ensuring user:', error);
    throw error;
  }
}

async function saveGame(gameData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gameQuery = `
      INSERT INTO games (game_id, player1, player2, winner, total_moves, game_duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query(gameQuery, [
      gameData.gameId,
      gameData.player1,
      gameData.player2,
      gameData.winner,
      gameData.totalMoves,
      gameData.durationSeconds
    ]);

    if (gameData.winner && gameData.winner !== 'bot') {
      await client.query(
        'UPDATE users SET games_won = games_won + 1, games_played = games_played + 1 WHERE username = $1',
        [gameData.winner]
      );
    }

    const loser = gameData.player1 === gameData.winner ? gameData.player2 : gameData.player1;
    if (loser !== 'bot') {
      await client.query(
        'UPDATE users SET games_played = games_played + 1 WHERE username = $1',
        [loser]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving game:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getLeaderboard(limit = 10) {
  const query = `
    SELECT username, games_won, games_played,
           CASE WHEN games_played > 0 
                THEN ROUND((games_won::numeric / games_played::numeric) * 100, 2)
                ELSE 0 
           END as win_percentage
    FROM users
    WHERE games_played > 0
    ORDER BY games_won DESC, win_percentage DESC
    LIMIT $1
  `;

  try {
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

module.exports = {
  pool,
  ensureUser,
  saveGame,
  getLeaderboard
};
