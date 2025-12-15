-- Connect Four Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    games_won INT DEFAULT 0,
    games_played INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) UNIQUE NOT NULL,
    player1 VARCHAR(50) NOT NULL,
    player2 VARCHAR(50) NOT NULL,
    winner VARCHAR(50),
    total_moves INT,
    game_duration_seconds INT,
    ended_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (player1) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (player2) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS moves (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    player_id VARCHAR(50) NOT NULL,
    column INT NOT NULL,
    move_number INT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner);
CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_games_won ON users(games_won DESC);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);

INSERT INTO users (username, games_won, games_played)
VALUES ('bot', 0, 0)
ON CONFLICT (username) DO NOTHING;
