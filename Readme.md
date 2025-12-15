text
# 🎮 Connect Four – Real‑Time Multiplayer Game

A production-ready, full-stack real-time Connect Four game with competitive AI bot, live leaderboard, and optional Kafka analytics. Built with Node.js, Socket.IO, PostgreSQL, and deployed on Vercel and Render.

**Live Demo:** https://connect-four-game-sepia.vercel.app/  
**Backend API:** https://connect-four-game-mrsq.onrender.com  
**Health Check:** https://connect-four-game-mrsq.onrender.com/health  

---

## 🌟 Features

### Core gameplay

- Real-time multiplayer (Player vs Player) over WebSockets  
- Competitive AI bot using Minimax with alpha–beta pruning  
- Smart matchmaking (wait 10s for human, then auto-bot fallback)  
- Reconnection handling with 30s grace period  
- Responsive UI for desktop, tablet, and mobile  

### Backend & data

- PostgreSQL persistence for users, games, and moves  
- Live leaderboard (wins, games played, win %)  
- REST API for health and leaderboard  
- Clean separation of game logic, state, and persistence  

### Analytics

- Kafka-based game event streaming in local development  
- Console-based event logging in production (Kafka disabled due to infra/cost constraints)  

### Deployment

- Frontend: Vercel (static hosting, global CDN)  
- Backend: Render (Node.js service)  
- Database: Render PostgreSQL (managed DB)  

---

## 🏗️ Architecture

### Production
<img width="906" height="644" alt="image" src="https://github.com/user-attachments/assets/4995b53d-cc81-4db4-b175-74dee028d98b" />

### Local development

<img width="789" height="235" alt="image" src="https://github.com/user-attachments/assets/3e9ef61d-558f-4734-b785-f588f5476256" />

---

## 🚀 Quick Start (Local)

### 1. Prerequisites

- Node.js v16+  
- PostgreSQL v12+  
- Docker Desktop (for Kafka, optional)  
- Git  

### 2. Backend setup

git clone https://github.com/Guri9368/connect-four-game.git
cd connect-four-game/backend
npm install

text

Create `.env` in `backend/`:

Server
NODE_ENV=development
PORT=3000

PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=connect_four

Kafka (local only, optional)
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=connect-four-game
KAFKA_TOPIC=game-events

text

Initialize database:

psql -U postgres
CREATE DATABASE connect_four;
\q

psql -U postgres -d connect_four -f migrations/init.sql

text

(Optional) start Kafka:

docker-compose up -d

text

Start backend:

npm start

http://localhost:3000
text

### 3. Frontend setup

cd ../frontend

text

Ensure `app.js` points to the correct backend:

const BACKEND_URL =
window.location.hostname === 'localhost'
? 'http://localhost:3000'
: 'https://connect-four-game-mrsq.onrender.com';

text

Serve frontend (pick one):

VS Code Live Server – open index.html with Live Server
OR
python -m http.server 5500

OR
npx http-server -p 5500

text

Open: `http://localhost:5500`

---

## 📊 Kafka Analytics (Local Only)

To view real-time analytics:

cd backend
npm run consumer

text

Metrics:

- Total games played  
- Average game duration  
- Human vs bot win rates  
- Player statistics  
- Games per time window  

In production, Kafka is disabled (no Docker / managed Kafka on free tier). Events are logged to the backend logs instead; all gameplay features remain unchanged.

---

## 📁 Project Structure

<img width="893" height="605" alt="image" src="https://github.com/user-attachments/assets/561d7563-e3cc-4ea2-8e59-e78846b4deee" />


connect-four-game/
│
├── backend/
│ ├── src/
│ │ ├── index.js # Express + Socket.IO server
│ │ ├── gameManager.js # Matchmaking & game lifecycle
│ │ ├── gameLogic.js # Connect Four rules
│ │ ├── botAI.js # Minimax AI
│ │ ├── db.js # PostgreSQL access
│ │ ├── kafka.js # Kafka producer (dev only)
│ │ └── kafkaConsumer.js # Analytics consumer (dev only)
│ ├── migrations/
│ │ └── init.sql # Schema
│ ├── docker-compose.yml # Kafka + Zookeeper
│ ├── package.json
│ └── .env
│
├── frontend/
│ ├── index.html # UI shell
│ ├── app.js # UI + Socket.IO client
│ ├── game.js # Frontend game model
│ ├── styles.css # Responsive styling
│ └── assets/
│
└── README.md

text

---

## 🎮 How to Play

### Single Player (vs Bot)

1. Enter a username and click **Join Game**.  
2. If no human joins in 10 seconds, the bot auto-joins.  
3. Click a column to drop a disc.  
4. First to connect four (horizontally, vertically, or diagonally) wins.  

### Multiplayer (Player vs Player)

1. Player 1 joins the queue.  
2. Player 2 joins within 10 seconds.  
3. Turns alternate in real time via WebSockets.  

### Leaderboard

After a game, click **View Leaderboard** to see:

- Top players  
- Games won  
- Total games played  
- Win percentage  

---

## 🤖 Bot AI

The bot uses Minimax with alpha–beta pruning and a heuristic tailored to Connect Four.

**Priority:**

1. Win immediately if possible.  
2. Block opponent’s immediate win.  
3. Create 3‑in‑a‑row threats.  
4. Prefer center columns.  
5. Look ahead a few plies while keeping move time under ~100 ms.

---

## 🗄️ Database Schema (Simplified)

**users**

id SERIAL PRIMARY KEY,
username VARCHAR(50) UNIQUE NOT NULL,
games_played INT DEFAULT 0,
games_won INT DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW()

text

**games**

id VARCHAR(50) PRIMARY KEY,
player1 VARCHAR(50) NOT NULL,
player2 VARCHAR(50) NOT NULL,
winner VARCHAR(50),
total_moves INT,
duration_seconds INT,
ended_at TIMESTAMP DEFAULT NOW()

text

**moves**

id SERIAL PRIMARY KEY,
game_id VARCHAR(50) REFERENCES games(id),
player VARCHAR(50),
column_index INT,
move_number INT,
created_at TIMESTAMP DEFAULT NOW()

text

---

## 📝 API Overview

**REST**

- `GET /health` – service + basic game state health  
- `GET /api/leaderboard?limit=10` – top players  

**WebSocket (client → server)**

- `join_queue` – `{ username }`  
- `make_move` – `{ gameId, col }`  
- `leave_queue` – `{}`  
- `reconnect_to_game` – `{ gameId, username }`  

**WebSocket (server → client)**

- `game_start` – initial game state and whose turn  
- `move_made` – updated board, move info, winner (if any)  
- `waiting` – waiting for opponent  
- `opponent_disconnected` – with reconnect timeout  
- `game_over` – winner + reason  

---

## 🌍 Deployment (Current)

### Frontend – Vercel

- URL: `https://connect-four-game-sepia.vercel.app/`  
- Root: `frontend/`  

### Backend – Render

- URL: `https://connect-four-game-mrsq.onrender.com`  
- Root directory: `backend`  
- Build command: `npm install`  
- Start command: `npm start`  
- Env vars:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `DATABASE_URL=<internal Render Postgres URL>`

### Database – Render PostgreSQL

- Managed PostgreSQL instance  
- Schema initialized with `migrations/init.sql`  

---

## 📞 Author & Links

**Author:** Gurmeet Singh Rathor  
Backend‑leaning Full‑Stack Developer  

- Email: [gurigurmeet1234567@gmail.com](mailto:gurigurmeet1234567@gmail.com)  
- LinkedIn: https://www.linkedin.com/in/gurmeet-singh-rathor-1bbbaa270  
- LeetCode: https://leetcode.com/u/gurmeet_s_r9/  
- Phone: +91‑9368797308  

**Project**

- Live game: https://connect-four-game-sepia.vercel.app/  
- Backend API: https://connect-four-game-mrsq.onrender.com  
- GitHub: https://github.com/Guri9368/connect-four-game  

---

## 📄 License

MIT License. Free to use for learning and personal projects.
