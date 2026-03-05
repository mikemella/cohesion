import type {
  BattleshipState,
  BattleshipShip,
  ShotCell,
} from './types.js';
import { BATTLESHIP_GRID_SIZE, BATTLESHIP_TOTAL_SHIP_CELLS } from './types.js';

export const BATTLESHIP_SHIPS: { id: BattleshipShip['id']; size: number }[] = [
  { id: 'carrier', size: 5 },
  { id: 'battleship', size: 4 },
  { id: 'cruiser', size: 3 },
  { id: 'submarine', size: 3 },
  { id: 'destroyer', size: 2 },
];

function emptyGrid(): ShotCell[][] {
  return Array.from({ length: BATTLESHIP_GRID_SIZE }, () =>
    Array(BATTLESHIP_GRID_SIZE).fill(0)
  );
}

export function createBattleshipInitialState(): BattleshipState {
  return {
    phase: 'placing',
    shots1: emptyGrid(),
    shots2: emptyGrid(),
    sunkShips1: [],
    sunkShips2: [],
    player1Ready: false,
    player2Ready: false,
    currentPlayer: 1,
    hits1: 0,
    hits2: 0,
  };
}

/** Returns all grid cells occupied by a ship. */
export function getShipCells(ship: BattleshipShip): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < ship.size; i++) {
    if (ship.direction === 'h') {
      cells.push([ship.row, ship.col + i]);
    } else {
      cells.push([ship.row + i, ship.col]);
    }
  }
  return cells;
}

/**
 * Checks whether a single ship can be placed at its position given already-placed ships.
 * Used during interactive placement (before all 5 ships are placed).
 */
export function canPlaceShip(ship: BattleshipShip, existingShips: BattleshipShip[]): boolean {
  const expectedSize = BATTLESHIP_SHIPS.find((s) => s.id === ship.id)?.size;
  if (!expectedSize || ship.size !== expectedSize) return false;

  const cells = getShipCells(ship);
  const occupied = new Set<string>();
  for (const existing of existingShips) {
    for (const [r, c] of getShipCells(existing)) {
      occupied.add(`${r},${c}`);
    }
  }

  for (const [r, c] of cells) {
    if (r < 0 || r >= BATTLESHIP_GRID_SIZE || c < 0 || c >= BATTLESHIP_GRID_SIZE) return false;
    if (occupied.has(`${r},${c}`)) return false;
  }
  return true;
}

/** Validates that all ships fit within bounds and don't overlap each other. */
export function isValidPlacement(ships: BattleshipShip[]): boolean {
  if (ships.length !== BATTLESHIP_SHIPS.length) return false;

  // Check each ship ID appears exactly once
  const ids = new Set(ships.map((s) => s.id));
  if (ids.size !== BATTLESHIP_SHIPS.length) return false;

  const occupied = new Set<string>();

  for (const ship of ships) {
    const expectedSize = BATTLESHIP_SHIPS.find((s) => s.id === ship.id)?.size;
    if (!expectedSize || ship.size !== expectedSize) return false;

    const cells = getShipCells(ship);
    for (const [r, c] of cells) {
      if (r < 0 || r >= BATTLESHIP_GRID_SIZE || c < 0 || c >= BATTLESHIP_GRID_SIZE) return false;
      const key = `${r},${c}`;
      if (occupied.has(key)) return false;
      occupied.add(key);
    }
  }

  return true;
}

/** Returns true if the shot coordinates are valid (in bounds, not already shot). */
export function isValidShot(
  state: BattleshipState,
  shooterPlayer: 1 | 2,
  row: number,
  col: number
): boolean {
  if (row < 0 || row >= BATTLESHIP_GRID_SIZE || col < 0 || col >= BATTLESHIP_GRID_SIZE) return false;
  const shots = shooterPlayer === 1 ? state.shots1 : state.shots2;
  return shots[row][col] === 0;
}

/** Applies a shot to the game state. Requires the target player's private ship data. */
export function applyShot(
  state: BattleshipState,
  shooterPlayer: 1 | 2,
  row: number,
  col: number,
  targetShips: BattleshipShip[]
): { state: BattleshipState; isHit: boolean; sunkShip: BattleshipShip | null; isWin: boolean; isDraw: false } {
  const newState: BattleshipState = {
    ...state,
    shots1: state.shots1.map((r) => [...r]),
    shots2: state.shots2.map((r) => [...r]),
    sunkShips1: [...state.sunkShips1],
    sunkShips2: [...state.sunkShips2],
  };

  // Check if shot hits a ship
  let isHit = false;
  let sunkShip: BattleshipShip | null = null;

  for (const ship of targetShips) {
    const cells = getShipCells(ship);
    const hitCell = cells.find(([r, c]) => r === row && c === col);
    if (hitCell) {
      isHit = true;

      if (shooterPlayer === 1) {
        newState.shots1[row][col] = 2;
        newState.hits1++;
      } else {
        newState.shots2[row][col] = 2;
        newState.hits2++;
      }

      // Check if this ship is now sunk (all cells hit)
      const shotsGrid = shooterPlayer === 1 ? newState.shots1 : newState.shots2;
      const isSunk = cells.every(([r, c]) => shotsGrid[r][c] === 2);
      if (isSunk) {
        sunkShip = ship;
        if (shooterPlayer === 1) {
          newState.sunkShips2.push(ship);
        } else {
          newState.sunkShips1.push(ship);
        }
      }

      // On a hit, the shooter goes again (keep currentPlayer)
      break;
    }
  }

  if (!isHit) {
    if (shooterPlayer === 1) {
      newState.shots1[row][col] = 1;
    } else {
      newState.shots2[row][col] = 1;
    }
    // On a miss, flip turn
    newState.currentPlayer = shooterPlayer === 1 ? 2 : 1;
  }

  const isWin =
    (shooterPlayer === 1 && newState.hits1 >= BATTLESHIP_TOTAL_SHIP_CELLS) ||
    (shooterPlayer === 2 && newState.hits2 >= BATTLESHIP_TOTAL_SHIP_CELLS);

  return { state: newState, isHit, sunkShip, isWin, isDraw: false };
}
