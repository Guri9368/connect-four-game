const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: `${process.env.KAFKA_CLIENT_ID}-consumer`,
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ 
  groupId: 'game-analytics-group',
  sessionTimeout: 30000
});

// In-memory analytics metrics
const metrics = {
  totalGames: 0,
  totalDuration: 0,
  totalMoves: 0,
  winners: {},
  gamesPerHour: {},
  gamesPerDay: {},
  playerStats: {},
  botWins: 0,
  humanWins: 0,
  draws: 0,
  averageMovesPerGame: 0,
  fastestGame: Infinity,
  longestGame: 0,
  startTime: Date.now()
};

/**
 * Update player-specific statistics
 */
function updatePlayerStats(player, won) {
  if (!metrics.playerStats[player]) {
    metrics.playerStats[player] = {
      gamesPlayed: 0,
      gamesWon: 0,
      totalMoves: 0,
      winRate: 0
    };
  }

  metrics.playerStats[player].gamesPlayed++;
  if (won) {
    metrics.playerStats[player].gamesWon++;
  }
  metrics.playerStats[player].winRate = 
    ((metrics.playerStats[player].gamesWon / metrics.playerStats[player].gamesPlayed) * 100).toFixed(2);
}

/**
 * Display comprehensive analytics dashboard
 */
function displayMetrics() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);

  console.log('\n' + '═'.repeat(60));
  console.log('📊 REAL-TIME ANALYTICS DASHBOARD');
  console.log('═'.repeat(60));

  // Overall Statistics
  console.log('\n🎮 OVERALL GAME STATISTICS:');
  console.log(`   Total Games Played: ${metrics.totalGames}`);
  console.log(`   Total Moves Made: ${metrics.totalMoves}`);
  console.log(`   Average Game Duration: ${metrics.totalGames > 0 ? (metrics.totalDuration / metrics.totalGames).toFixed(2) : 0}s`);
  console.log(`   Average Moves Per Game: ${metrics.totalGames > 0 ? (metrics.totalMoves / metrics.totalGames).toFixed(1) : 0}`);
  console.log(`   Fastest Game: ${metrics.fastestGame === Infinity ? 'N/A' : metrics.fastestGame + 's'}`);
  console.log(`   Longest Game: ${metrics.longestGame === 0 ? 'N/A' : metrics.longestGame + 's'}`);

  // Win Statistics
  console.log('\n🏆 WIN STATISTICS:');
  console.log(`   Human Wins: ${metrics.humanWins} (${metrics.totalGames > 0 ? ((metrics.humanWins / metrics.totalGames) * 100).toFixed(1) : 0}%)`);
  console.log(`   Bot Wins: ${metrics.botWins} (${metrics.totalGames > 0 ? ((metrics.botWins / metrics.totalGames) * 100).toFixed(1) : 0}%)`);
  console.log(`   Draws: ${metrics.draws} (${metrics.totalGames > 0 ? ((metrics.draws / metrics.totalGames) * 100).toFixed(1) : 0}%)`);

  // Most Frequent Winners
  if (Object.keys(metrics.winners).length > 0) {
    console.log('\n👑 TOP WINNERS:');
    const sortedWinners = Object.entries(metrics.winners)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedWinners.forEach(([player, wins], index) => {
      console.log(`   ${index + 1}. ${player}: ${wins} wins`);
    });
  }

  // Games Per Hour
  if (Object.keys(metrics.gamesPerHour).length > 0) {
    console.log('\n⏰ GAMES PER HOUR (Today):');
    const sortedHours = Object.entries(metrics.gamesPerHour)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedHours.forEach(([hour, count]) => {
      const hourFormatted = hour.padStart(2, '0');
      console.log(`   ${hourFormatted}:00 - ${count} game(s)`);
    });
  }

  // Player-Specific Metrics
  if (Object.keys(metrics.playerStats).length > 0) {
    console.log('\n👤 PLAYER-SPECIFIC METRICS:');
    const topPlayers = Object.entries(metrics.playerStats)
      .filter(([player]) => player !== 'bot')
      .sort((a, b) => b[1].gamesWon - a[1].gamesWon)
      .slice(0, 5);

    topPlayers.forEach(([player, stats]) => {
      console.log(`   ${player}:`);
      console.log(`      Games Played: ${stats.gamesPlayed}`);
      console.log(`      Games Won: ${stats.gamesWon}`);
      console.log(`      Win Rate: ${stats.winRate}%`);
    });
  }

  // System Metrics
  console.log('\n⚡ SYSTEM METRICS:');
  console.log(`   Uptime: ${uptime}s`);
  console.log(`   Events Processed: ${metrics.totalGames * 3 + metrics.totalMoves} (approx)`);
  console.log(`   Games Per Minute: ${uptime > 0 ? ((metrics.totalGames / uptime) * 60).toFixed(2) : 0}`);

  console.log('\n' + '═'.repeat(60) + '\n');
}

/**
 * Process incoming Kafka events and update metrics
 */
async function processEvent(event) {
  const data = JSON.parse(event.value.toString());

  switch (data.eventType) {
    case 'game_started':
      console.log(`📊 [Analytics] Game started: ${data.gameId} - ${data.player1} vs ${data.player2}`);

      // Track players
      if (data.player1 !== 'bot') updatePlayerStats(data.player1, false);
      if (data.player2 !== 'bot') updatePlayerStats(data.player2, false);
      break;

    case 'move_played':
      console.log(`📊 [Analytics] Move ${data.moveNumber} in game ${data.gameId} by ${data.player}`);

      // Track total moves
      metrics.totalMoves++;

      // Update player move count
      if (data.player !== 'bot' && metrics.playerStats[data.player]) {
        metrics.playerStats[data.player].totalMoves++;
      }
      break;

    case 'game_ended':
      console.log(`📊 [Analytics] Game ${data.gameId} ended - Winner: ${data.winner || 'Draw'} in ${data.totalMoves} moves`);

      // Update overall metrics
      metrics.totalGames++;
      metrics.totalDuration += data.durationSeconds;

      // Track fastest/longest games
      if (data.durationSeconds < metrics.fastestGame) {
        metrics.fastestGame = data.durationSeconds;
      }
      if (data.durationSeconds > metrics.longestGame) {
        metrics.longestGame = data.durationSeconds;
      }

      // Track winners
      if (data.winner) {
        metrics.winners[data.winner] = (metrics.winners[data.winner] || 0) + 1;

        // Update player stats
        if (data.winner === 'bot') {
          metrics.botWins++;
        } else {
          metrics.humanWins++;
          updatePlayerStats(data.winner, true);
        }
      } else {
        metrics.draws++;
      }

      // Track games per hour
      const now = new Date();
      const hour = now.getHours();
      const day = now.toISOString().split('T')[0];

      metrics.gamesPerHour[hour] = (metrics.gamesPerHour[hour] || 0) + 1;
      metrics.gamesPerDay[day] = (metrics.gamesPerDay[day] || 0) + 1;

      // Calculate average moves per game
      metrics.averageMovesPerGame = metrics.totalMoves / metrics.totalGames;

      // Display updated dashboard every game
      displayMetrics();
      break;

    case 'player_disconnected':
      console.log(`📊 [Analytics] Player ${data.player} disconnected from game ${data.gameId}`);
      break;

    default:
      console.log(`📊 [Analytics] Unknown event type: ${data.eventType}`);
  }
}

/**
 * Start the Kafka consumer
 */
async function runConsumer() {
  try {
    await consumer.connect();
    console.log('✓ Kafka consumer connected');
    console.log('📊 Analytics dashboard initializing...\n');

    await consumer.subscribe({ 
      topic: process.env.KAFKA_TOPIC || 'game-events',
      fromBeginning: false 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await processEvent(message);
      }
    });
  } catch (error) {
    console.error('Consumer error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📊 Final Analytics Report:');
  displayMetrics();
  await consumer.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📊 Final Analytics Report:');
  displayMetrics();
  await consumer.disconnect();
  process.exit(0);
});

// Start consumer if run directly
if (require.main === module) {
  runConsumer();
}

module.exports = { runConsumer };