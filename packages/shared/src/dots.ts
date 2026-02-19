import { DotsState, DOTS_GRID_SIZE } from './types';

const BOXES = DOTS_GRID_SIZE - 1; // 4x4 boxes

export function createDotsInitialState(): DotsState {
  return {
    horizontalLines: Array.from({ length: DOTS_GRID_SIZE }, () =>
      Array.from({ length: BOXES }, () => false)
    ),
    verticalLines: Array.from({ length: BOXES }, () =>
      Array.from({ length: DOTS_GRID_SIZE }, () => false)
    ),
    boxes: Array.from({ length: BOXES }, () =>
      Array.from({ length: BOXES }, () => 0 as const)
    ),
    scores: [0, 0],
    currentPlayer: 1,
  };
}

/** orientation: 0 = horizontal, 1 = vertical */
export function isDotsValidMove(
  state: DotsState,
  orientation: number,
  row: number,
  col: number
): boolean {
  if (orientation === 0) {
    // Horizontal line
    if (row < 0 || row >= DOTS_GRID_SIZE || col < 0 || col >= BOXES) return false;
    return !state.horizontalLines[row][col];
  } else {
    // Vertical line
    if (row < 0 || row >= BOXES || col < 0 || col >= DOTS_GRID_SIZE) return false;
    return !state.verticalLines[row][col];
  }
}

function isAllLinesDone(state: DotsState): boolean {
  for (const row of state.horizontalLines) {
    if (row.some(v => !v)) return false;
  }
  for (const row of state.verticalLines) {
    if (row.some(v => !v)) return false;
  }
  return true;
}

/** Check which boxes were completed by placing a line, and claim them. Returns count. */
function claimBoxes(state: DotsState, player: 1 | 2): number {
  let claimed = 0;
  for (let r = 0; r < BOXES; r++) {
    for (let c = 0; c < BOXES; c++) {
      if (state.boxes[r][c] !== 0) continue;
      // A box at (r,c) needs: top=h[r][c], bottom=h[r+1][c], left=v[r][c], right=v[r][c+1]
      const top = state.horizontalLines[r][c];
      const bottom = state.horizontalLines[r + 1][c];
      const left = state.verticalLines[r][c];
      const right = state.verticalLines[r][c + 1];
      if (top && bottom && left && right) {
        state.boxes[r][c] = player;
        claimed++;
      }
    }
  }
  return claimed;
}

export function applyDotsMove(
  state: DotsState,
  orientation: number,
  row: number,
  col: number
): { state: DotsState; isWin: boolean; isDraw: boolean } {
  // Deep copy
  const hLines = state.horizontalLines.map(r => [...r]);
  const vLines = state.verticalLines.map(r => [...r]);
  const boxes = state.boxes.map(r => [...r]) as (0 | 1 | 2)[][];
  const scores: [number, number] = [...state.scores];
  const player = state.currentPlayer;

  const newState: DotsState = {
    horizontalLines: hLines,
    verticalLines: vLines,
    boxes,
    scores,
    currentPlayer: player,
  };

  // Place the line
  if (orientation === 0) {
    if (hLines[row][col]) throw new Error('Line already placed');
    hLines[row][col] = true;
  } else {
    if (vLines[row][col]) throw new Error('Line already placed');
    vLines[row][col] = true;
  }

  // Check if any boxes were completed
  const claimed = claimBoxes(newState, player);
  scores[player - 1] += claimed;

  const allDone = isAllLinesDone(newState);

  if (allDone) {
    // Game over — player with more boxes wins
    const isWin = scores[0] !== scores[1]; // someone won (not a draw)
    const isDraw = scores[0] === scores[1];
    // Keep currentPlayer as the winner for the server to read
    newState.currentPlayer = scores[0] > scores[1] ? 1 : scores[1] > scores[0] ? 2 : player;
    return { state: newState, isWin, isDraw };
  }

  // If player claimed a box, they go again; otherwise, switch turns
  if (claimed === 0) {
    newState.currentPlayer = player === 1 ? 2 : 1;
  }

  return { state: newState, isWin: false, isDraw: false };
}
