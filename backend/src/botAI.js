const { cloneBoard, makeMove, checkWin, getValidMoves, getLowestRow } = require('./gameLogic');
const { PLAYER_1, PLAYER_2 } = require('./utils/constants');

/**
 * COMPETITIVE BOT STRATEGY (Interview-ready explanation):
 * 
 * Priority 1: WIN IMMEDIATELY
 * - If bot can win in one move, take it
 * 
 * Priority 2: BLOCK OPPONENT WIN
 * - If opponent can win next turn, block them
 * 
 * Priority 3: CREATE THREATS
 * - Prefer moves that create multiple winning opportunities
 * - Build connected pieces (3-in-a-row with empty space)
 * 
 * Priority 4: CENTER CONTROL
 * - Center columns (3,4) are strategically superior
 * - More potential winning lines pass through center
 */

/**
 * Evaluates a move by simulating it and checking for immediate win/block
 * @param {Array} board - Current board state
 * @param {number} col - Column to evaluate
 * @param {number} player - Player making the move
 * @returns {string|null} 'win', 'block', or null
 */
function evaluateMove(board, col, player) {
  const testBoard = cloneBoard(board);
  const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  // Check if this move wins
  makeMove(testBoard, col, player);
  if (checkWin(testBoard, player)) {
    return 'win';
  }

  // Check if this move blocks opponent's win
  const blockBoard = cloneBoard(board);
  const blockResult = makeMove(blockBoard, col, opponent);
  if (blockResult.success && checkWin(blockBoard, opponent)) {
    return 'block';
  }

  return null;
}

/**
 * Counts how many 3-in-a-row patterns a move creates
 * @param {Array} board - Board state after simulated move
 * @param {number} row - Row of placed piece
 * @param {number} col - Column of placed piece
 * @param {number} player - Player who made the move
 * @returns {number} Count of 3-in-a-row patterns created
 */
function countThreats(board, row, col, player) {
  let threats = 0;
  const directions = [
    [[0, 1], [0, 2], [0, 3]],
    [[0, -1], [0, -2], [0, -3]],
    [[1, 0], [2, 0], [3, 0]],
    [[1, 1], [2, 2], [3, 3]],
    [[1, -1], [2, -2], [3, -3]],
    [[-1, 1], [-2, 2], [-3, 3]],
    [[-1, -1], [-2, -2], [-3, -3]]
  ];

  for (const dir of directions) {
    let count = 1;
    let empty = 0;

    for (const [dr, dc] of dir) {
      const r = row + dr;
      const c = col + dc;

      if (r >= 0 && r < 6 && c >= 0 && c < 7) {
        if (board[r][c] === player) {
          count++;
        } else if (board[r][c] === 0) {
          empty++;
        } else {
          break;
        }
      }
    }

    if (count === 3 && empty >= 1) {
      threats++;
    }
  }

  return threats;
}

/**
 * Scores a column based on strategic value
 * @param {number} col - Column number (0-6)
 * @returns {number} Strategic score
 */
function getPositionalScore(col) {
  const centerDistance = Math.abs(col - 3);
  return 10 - centerDistance * 2;
}

/**
 * Bot decision-making function
 * @param {Array} board - Current game board
 * @param {number} botPlayer - Bot's player number (1 or 2)
 * @returns {number} Column to play (0-6)
 */
function getBotMove(board, botPlayer) {
  const validMoves = getValidMoves(board);

  if (validMoves.length === 0) {
    throw new Error('No valid moves available');
  }

  const opponent = botPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  // Step 1: Check for immediate wins
  for (const col of validMoves) {
    const evaluation = evaluateMove(board, col, botPlayer);
    if (evaluation === 'win') {
      console.log(`🤖 Bot choosing column ${col}: WINNING MOVE`);
      return col;
    }
  }

  // Step 2: Check for blocks
  for (const col of validMoves) {
    const evaluation = evaluateMove(board, col, botPlayer);
    if (evaluation === 'block') {
      console.log(`🤖 Bot choosing column ${col}: BLOCKING opponent win`);
      return col;
    }
  }

  // Step 3: Choose best strategic move
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  for (const col of validMoves) {
    const testBoard = cloneBoard(board);
    const result = makeMove(testBoard, col, botPlayer);

    if (result.success) {
      const threatScore = countThreats(testBoard, result.row, col, botPlayer) * 50;
      const positionScore = getPositionalScore(col);
      const totalScore = threatScore + positionScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMove = col;
      }
    }
  }

  console.log(`🤖 Bot choosing column ${bestMove}: Strategic move (score: ${bestScore})`);
  return bestMove;
}

module.exports = {
  getBotMove
};
