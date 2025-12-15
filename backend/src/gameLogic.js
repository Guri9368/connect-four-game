const { ROWS, COLS, EMPTY, WIN_LENGTH } = require('./utils/constants');

/**
 * Creates an empty 6x7 board
 * @returns {Array} 2D array representing board
 */
function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

/**
 
 * @param {Array} board - Game board
 * @param {number} col - Column to play (0-6)
 * @returns {boolean} True if move is valid
 */
function isValidMove(board, col) {
  if (col < 0 || col >= COLS) return false;
  return board[0][col] === EMPTY; // Top row must be empty
}

/**
 * Gets the row where piece will land in given column
 * @param {Array} board - Game board
 * @param {number} col - Column number
 * @returns {number} Row index or -1 if column full
 */
function getLowestRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      return row;
    }
  }
  return -1;
}

/**
 * Executes a move on the board (mutates board)
 * @param {Array} board - Game board
 * @param {number} col - Column to play
 * @param {number} player - Player number (1 or 2)
 * @returns {Object} { success, row } - Result of move
 */
function makeMove(board, col, player) {
  if (!isValidMove(board, col)) {
    return { success: false, row: -1 };
  }

  const row = getLowestRow(board, col);
  board[row][col] = player;

  return { success: true, row };
}

/**
 * Checks if a player has won the game
 * Uses efficient window-based checking in all 4 directions
 * @param {Array} board - Game board
 * @param {number} player - Player to check for win
 * @returns {boolean} True if player has won
 */
function checkWin(board, player) {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WIN_LENGTH; col++) {
      if (board[row][col] === player &&
          board[row][col+1] === player &&
          board[row][col+2] === player &&
          board[row][col+3] === player) {
        return true;
      }
    }
  }

  // Check vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - WIN_LENGTH; row++) {
      if (board[row][col] === player &&
          board[row+1][col] === player &&
          board[row+2][col] === player &&
          board[row+3][col] === player) {
        return true;
      }
    }
  }

  // Check diagonal (bottom-left to top-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WIN_LENGTH; col++) {
      if (board[row][col] === player &&
          board[row-1][col+1] === player &&
          board[row-2][col+2] === player &&
          board[row-3][col+3] === player) {
        return true;
      }
    }
  }

  // Check diagonal (top-left to bottom-right)
  for (let row = 0; row <= ROWS - WIN_LENGTH; row++) {
    for (let col = 0; col <= COLS - WIN_LENGTH; col++) {
      if (board[row][col] === player &&
          board[row+1][col+1] === player &&
          board[row+2][col+2] === player &&
          board[row+3][col+3] === player) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if board is full (draw condition)
 * @param {Array} board - Game board
 * @returns {boolean} True if board is full
 */
function isBoardFull(board) {
  return board[0].every(cell => cell !== EMPTY);
}

/**
 * Gets all valid columns for moves
 * @param {Array} board - Game board
 * @returns {Array} Array of valid column numbers
 */
function getValidMoves(board) {
  const validMoves = [];
  for (let col = 0; col < COLS; col++) {
    if (isValidMove(board, col)) {
      validMoves.push(col);
    }
  }
  return validMoves;
}

/**
 * Deep clone board for simulation (prevents mutation)
 * @param {Array} board - Original board
 * @returns {Array} Cloned board
 */
function cloneBoard(board) {
  return board.map(row => [...row]);
}

module.exports = {
  createBoard,
  isValidMove,
  getLowestRow,
  makeMove,
  checkWin,
  isBoardFull,
  getValidMoves,
  cloneBoard
};
