# 🎮 Connect Four - Real-Time Multiplayer Game

A production-ready, real-time multiplayer Connect Four game with AI bot, built with Node.js, Socket.IO, PostgreSQL, and Kafka.

## 🌟 Features

- ✅ **Real-time multiplayer gameplay** (Player vs Player)
- ✅ **Competitive AI bot** (automatic fallback after 10s)
- ✅ **Reconnection handling** (30-second grace period)
- ✅ **Leaderboard system** (tracks wins, games played, win %)
- ✅ **Kafka analytics** (real-time game event streaming)
- ✅ **PostgreSQL database** (persistent game storage)
- ✅ **Responsive UI** (works on desktop and mobile)

## 🏗️ Architecture

┌─────────────┐ WebSocket ┌──────────────────┐
│ Frontend │◄─────────────────────────►│ Backend Server │
│ (Vanilla) │ │ (Node/Express) │
└─────────────┘ └──────────────────┘
│
┌────────────────────────────────┼──────────────┐
▼ ▼ ▼
┌──────────┐ ┌──────────┐ ┌────────┐
│PostgreSQL│ │ Kafka │ │ Bot AI │
└──────────┘ └──────────┘ └────────┘

text

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Docker Desktop (for Kafka)

### Backend Setup

cd backend

Install dependencies
npm install

Configure environment
cp .env.example .env

Edit .env with your PostgreSQL credentials
Start Kafka
docker-compose up -d

Run database migrations
psql -U postgres -d connect_four -f migrations/init.sql

Start server
npm start

text

Backend runs on [**http://localhost:3000**](http://localhost:3000)

### Frontend Setup

cd frontend

Install dependencies
npm install

Start dev server
npm start

text

Frontend runs on [**http://localhost:8080**](http://localhost:8080)

## 📁 Project Structure

├── backend/
│ ├── src/
│ │ ├── index.js # Main server
│ │ ├── gameManager.js # Game state management
│ │ ├── gameLogic.js # Core game rules
│ │ ├── botAI.js # Competitive bot AI
│ │ ├── kafka.js # Kafka producer
│ │ ├── kafkaConsumer.js # Analytics consumer
│ │ └── db.js # Database operations
│ ├── migrations/
│ │ └── init.sql # Database schema
│ ├── docker-compose.yml # Kafka setup
│ └── package.json
│
└── frontend/
├── index.html # Main HTML
├── app.js # Game logic
├── styles.css # Styling
└── package.json

text

## 🎮 How to Play

### Single Player (vs Bot)
1. Enter your username
2. Click "Join Game"
3. Wait 10 seconds (bot will join automatically)
4. Click columns to drop your disc
5. First to connect 4 wins!

### Multiplayer (Player vs Player)
1. **Player 1**: Enter username, click "Join Game"
2. **Player 2**: Within 10 seconds, enter username and join
3. Both players connect instantly!

## 🛠️ Technology Stack

### Backend
- **Node.js** + **Express** - Web server
- **Socket.IO** - Real-time WebSocket communication
- **PostgreSQL** - Game data persistence
- **Kafka** - Event streaming & analytics
- **Docker** - Kafka containerization

### Frontend
- **Vanilla JavaScript** - No framework needed
- **Socket.IO Client** - Real-time updates
- **CSS3** - Modern, responsive design

## 📊 Game Features

### Bot AI Strategy
1. **Priority 1**: Win immediately if possible
2. **Priority 2**: Block opponent's winning move
3. **Priority 3**: Create threats (3-in-a-row)
4. **Priority 4**: Control center columns

### Analytics Events
- `game_started` - New game begins
- `move_played` - Each player move
- `game_ended` - Game completion with winner
- `player_disconnected` - Disconnection tracking

### Database Schema
- **users** - Player profiles and stats
- **games** - Completed game records
- **moves** - Individual move history

## 🔧 Configuration

### Environment Variables (Backend)

PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=connect_four
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=connect-four-game
KAFKA_TOPIC=game-events

text

## 📈 Analytics Dashboard

Run the Kafka consumer to see real-time analytics:

cd backend
npm run consumer

text

**Metrics tracked:**
- Total games played
- Average game duration
- Win rates (human vs bot)
- Player-specific statistics
- Games per hour/day

## 🚀 Deployment

### Frontend (Vercel)
cd frontend
vercel

text

### Backend (Render/Railway)
- Set environment variables
- Connect PostgreSQL database
- Deploy from GitHub

## 🧪 Testing

### Test Multiplayer
1. Open two browser tabs
2. Join both within 10 seconds
3. Play against yourself!

### Test Bot
1. Open one tab
2. Wait 10 seconds after joining
3. Bot automatically joins

## 📝 API Endpoints

### REST API
- `GET /health` - Server health check
- `GET /api/leaderboard?limit=10` - Get top players

### WebSocket Events
- `join_queue` - Join matchmaking
- `make_move` - Make a game move
- `leave_queue` - Cancel matchmaking
- `reconnect_to_game` - Rejoin after disconnect

## 🤝 Contributing

This is an internship assignment project. Not open for contributions.

## 📄 License

MIT License - Built as a technical assessment.

## 👨‍💻 Author

**Your Name**  
Backend Engineering Intern Assignment

---

**Live Demo**: [Add URL after deployment]  
**Backend API**: [Add URL after deployment]
STEP 2: Initialize Git & Push to GitHub
2.1: Initialize Git
powershell
# Navigate to your main project folder
cd D:\downloads\emritrr

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: Connect Four game with backend and frontend"
