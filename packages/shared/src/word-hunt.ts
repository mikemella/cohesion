import type { WordHuntState, WordHuntFoundWord, WordHuntPlayerResult } from './types.js';
import { WORD_HUNT_SCORES, WORD_HUNT_SCORE_MAX, WORD_HUNT_DURATION_SECONDS } from './types.js';

// Letter pool weighted by Scrabble frequency (more common letters appear more)
const LETTER_POOL = [
  'A','A','A','A','A','A','A','A','A',
  'B','B',
  'C','C',
  'D','D','D','D',
  'E','E','E','E','E','E','E','E','E','E','E','E',
  'F','F',
  'G','G','G',
  'H','H',
  'I','I','I','I','I','I','I','I','I',
  'J',
  'K',
  'L','L','L','L',
  'M','M',
  'N','N','N','N','N','N',
  'O','O','O','O','O','O','O','O',
  'P','P',
  'R','R','R','R','R','R',
  'S','S','S','S',
  'T','T','T','T','T','T',
  'U','U','U','U',
  'V','V',
  'W','W',
  'Y','Y',
];

export function generateWordHuntGrid(): string[] {
  const pool = [...LETTER_POOL];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 16);
}

function emptyPlayerResult(): WordHuntPlayerResult {
  return { words: [], totalScore: 0, submittedAt: null };
}

export function createWordHuntInitialState(): WordHuntState {
  return {
    grid: generateWordHuntGrid(),
    player1: emptyPlayerResult(),
    player2: emptyPlayerResult(),
    player1StartedAt: null,
    player2StartedAt: null,
    currentPlayer: 1,
  };
}

export function getWordHuntScore(length: number): number {
  return WORD_HUNT_SCORES[length] ?? WORD_HUNT_SCORE_MAX;
}

/**
 * Checks that a path through the 4x4 grid is valid:
 * - Each step is adjacent (including diagonals) to the previous
 * - No cell is visited twice
 * - All indices are in range 0-15
 */
export function isAdjacentPath(path: number[]): boolean {
  if (path.length < 1) return false;
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    if (idx < 0 || idx > 15) return false;
    if (seen.has(idx)) return false;
    seen.add(idx);
    if (i > 0) {
      const prev = path[i - 1];
      const pr = Math.floor(prev / 4);
      const pc = prev % 4;
      const cr = Math.floor(idx / 4);
      const cc = idx % 4;
      if (Math.abs(pr - cr) > 1 || Math.abs(pc - cc) > 1) return false;
    }
  }
  return true;
}

/** Checks that the letters at the given path indices spell the given word. */
export function pathSpellsWord(path: number[], grid: string[], word: string): boolean {
  if (path.length !== word.length) return false;
  return path.every((idx, i) => grid[idx].toUpperCase() === word[i].toUpperCase());
}

/** Full client-side validation (path geometry + letter matching). Dictionary check is server-only. */
export function isValidWordHuntPath(word: string, path: number[], grid: string[]): boolean {
  return isAdjacentPath(path) && pathSpellsWord(path, grid, word);
}

/**
 * Applies a Word Hunt submission. Dictionary must be passed in (server-side concern).
 * Returns the updated state and game-end flags.
 */
export function applyWordHuntSubmission(
  state: WordHuntState,
  playerNumber: 1 | 2,
  words: Array<{ word: string; path: number[] }>,
  dictionary: Set<string>
): { state: WordHuntState; isWin: boolean; isDraw: boolean } {
  const playerKey = playerNumber === 1 ? 'player1' : 'player2';
  const otherKey = playerNumber === 1 ? 'player2' : 'player1';

  const validatedWords: WordHuntFoundWord[] = [];
  const seenWords = new Set<string>();

  for (const { word, path } of words) {
    const normalized = word.toUpperCase();
    if (seenWords.has(normalized)) continue;
    if (normalized.length < 3) continue;
    if (!isValidWordHuntPath(normalized, path, state.grid)) continue;
    if (!dictionary.has(normalized)) continue;
    seenWords.add(normalized);
    const score = getWordHuntScore(normalized.length);
    validatedWords.push({ word: normalized, path, score });
  }

  const totalScore = validatedWords.reduce((sum, w) => sum + w.score, 0);

  const newPlayerResult: WordHuntPlayerResult = {
    words: validatedWords,
    totalScore,
    submittedAt: new Date().toISOString(),
  };

  const newState: WordHuntState = {
    ...state,
    [playerKey]: newPlayerResult,
    currentPlayer: playerNumber === 1 ? 2 : 1,
  };

  const bothSubmitted = newState[otherKey].submittedAt !== null;

  if (!bothSubmitted) {
    return { state: newState, isWin: false, isDraw: false };
  }

  const p1Score = newState.player1.totalScore;
  const p2Score = newState.player2.totalScore;

  if (p1Score === p2Score) {
    return { state: newState, isWin: false, isDraw: true };
  }

  // Set currentPlayer to the winner so the server can read it for winner assignment
  newState.currentPlayer = p1Score > p2Score ? 1 : 2;
  return { state: newState, isWin: true, isDraw: false };
}

/** Checks if submission deadline has passed (server-side guard). */
export function isSubmissionExpired(startedAt: string): boolean {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return elapsed > WORD_HUNT_DURATION_SECONDS + 10; // 10s grace period
}
