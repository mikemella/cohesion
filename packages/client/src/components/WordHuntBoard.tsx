import { useState, useEffect, useRef, useCallback } from 'react';
import type { WordHuntState, WordHuntFoundWord } from '@cohesion/shared';
import { isAdjacentPath, pathSpellsWord, getWordHuntScore, WORD_HUNT_DURATION_SECONDS } from '@cohesion/shared';
import wordListRaw from '../word-list.json';

const clientDictionary = new Set<string>(wordListRaw as string[]);

interface WordHuntBoardProps {
  state: WordHuntState;
  myPlayerNumber: 1 | 2 | null;
  gameStatus: 'active' | 'completed' | 'waiting' | 'abandoned';
  onSubmit: (words: Array<{ word: string; path: number[] }>) => void;
  onStartTurn: () => void;
}

export function WordHuntBoard({ state, myPlayerNumber, gameStatus, onSubmit, onStartTurn }: WordHuntBoardProps) {
  const { grid, player1, player2 } = state;

  const myStartedAt = myPlayerNumber === 1 ? state.player1StartedAt : myPlayerNumber === 2 ? state.player2StartedAt : null;
  const myResult = myPlayerNumber === 1 ? player1 : myPlayerNumber === 2 ? player2 : null;
  const opponentResult = myPlayerNumber === 1 ? player2 : myPlayerNumber === 2 ? player1 : null;
  const hasSubmitted = myResult?.submittedAt !== null;

  const [foundWords, setFoundWords] = useState<WordHuntFoundWord[]>([]);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(WORD_HUNT_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(hasSubmitted);

  const cellRefs = useRef<(HTMLDivElement | null)[]>(Array(16).fill(null));
  const foundWordsRef = useRef<WordHuntFoundWord[]>([]);
  foundWordsRef.current = foundWords;
  // Use refs for drag state to avoid stale closures in pointer handlers
  const isDraggingRef = useRef(false);
  const currentPathRef = useRef<number[]>([]);

  // Timer — counts down from myStartedAt
  useEffect(() => {
    if (!myStartedAt || gameStatus !== 'active' || submitted) return;
    const start = new Date(myStartedAt).getTime();

    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, WORD_HUNT_DURATION_SECONDS - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        handleSubmit();
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [myStartedAt, gameStatus, submitted]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(foundWordsRef.current.map(({ word, path }) => ({ word, path })));
  }, [submitted, onSubmit]);

  // Drag word selection — all handlers on the grid container with pointer capture
  const getCellAtPoint = (x: number, y: number): number | null => {
    for (let i = 0; i < 16; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return i;
      }
    }
    return null;
  };

  const handleGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (submitted || gameStatus !== 'active' || !myStartedAt) return;
    const idx = getCellAtPoint(e.clientX, e.clientY);
    if (idx === null) return;
    // Capture pointer so we receive move/up events even outside the grid
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    currentPathRef.current = [idx];
    setCurrentPath([idx]);
  };

  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const idx = getCellAtPoint(e.clientX, e.clientY);
    if (idx === null) return;
    const prev = currentPathRef.current;
    if (prev.includes(idx)) return;
    const candidate = [...prev, idx];
    if (!isAdjacentPath(candidate)) return;
    currentPathRef.current = candidate;
    setCurrentPath(candidate);
  };

  const handleGridPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const path = currentPathRef.current;

    if (path.length >= 3) {
      const word = path.map((i) => grid[i]).join('').toUpperCase();
      if (clientDictionary.has(word) && pathSpellsWord(path, grid, word) && !foundWordsRef.current.find((fw) => fw.word === word)) {
        const score = getWordHuntScore(word.length);
        setFoundWords((prev) => [...prev, { word, path, score }]);
      }
    }

    currentPathRef.current = [];
    setCurrentPath([]);
  }, [grid]);

  const totalScore = foundWords.reduce((sum, fw) => sum + fw.score, 0);
  const timerPct = (timeLeft / WORD_HUNT_DURATION_SECONDS) * 100;
  const timerColor = timerPct > 40 ? 'bg-[#4AE688]' : timerPct > 15 ? 'bg-amber-400' : 'bg-red-500';

  // Results view
  if (gameStatus === 'completed') {
    return (
      <div className="flex flex-col items-center gap-6 max-w-lg w-full">
        <div className="flex gap-6 w-full">
          {[1, 2].map((pNum) => {
            const result = pNum === 1 ? player1 : player2;
            return (
              <div key={pNum} className="flex-1 bg-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">Player {pNum}</p>
                <p className="text-2xl font-bold text-white mb-3">{result.totalScore.toLocaleString()} pts</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.words.length === 0 && (
                    <p className="text-slate-500 text-sm">No valid words</p>
                  )}
                  {result.words.map((fw) => (
                    <div key={fw.word} className="flex justify-between text-sm">
                      <span className="text-slate-300">{fw.word.toLowerCase()}</span>
                      <span className="text-[#4AE688]">+{fw.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini grid showing the letters */}
        <div className="grid grid-cols-4 gap-1">
          {grid.map((letter, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-slate-800 border border-slate-600 rounded flex items-center justify-center text-lg font-bold text-white"
            >
              {letter}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Pre-start lobby: game is active but this player hasn't clicked "Start my turn" yet
  if (!myStartedAt && myPlayerNumber) {
    const opponentDone = opponentResult?.submittedAt !== null;
    return (
      <div className="flex flex-col items-center gap-6">
        {opponentDone && (
          <p className="text-slate-400 text-sm">Opponent finished — your turn!</p>
        )}

        {/* Hidden grid placeholder */}
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-xl border-2 bg-slate-800 border-slate-700"
            />
          ))}
        </div>

        <button
          onClick={onStartTurn}
          className="px-8 py-3 bg-[#4AE688] hover:bg-[#3DD677] text-[#0D1120] rounded-lg font-bold text-lg transition-colors"
        >
          Start my turn
        </button>
        <p className="text-slate-500 text-sm">You'll have {WORD_HUNT_DURATION_SECONDS} seconds once you start</p>
      </div>
    );
  }

  // Spectator / not a player
  if (!myPlayerNumber) {
    return (
      <div className="text-slate-400 text-center py-8">
        Watching — game in progress
      </div>
    );
  }

  if (submitted) {
    const waitingOn = opponentResult?.submittedAt === null ? 'opponent' : null;
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-slate-300 text-lg">
          {waitingOn ? `Words submitted! Waiting for opponent...` : 'Both players done — calculating scores...'}
        </p>
        <p className="text-2xl font-bold text-white">{totalScore.toLocaleString()} pts</p>
        <p className="text-slate-400 text-sm">{foundWords.length} word{foundWords.length !== 1 ? 's' : ''} found</p>
        <div className="flex flex-wrap gap-1 max-w-xs justify-center">
          {foundWords.map((fw) => (
            <span key={fw.word} className="px-2 py-0.5 bg-slate-700 rounded text-sm text-slate-300">
              {fw.word.toLowerCase()} <span className="text-[#4AE688]">+{fw.score}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Timer bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-sm text-slate-400 mb-1">
          <span>{totalScore.toLocaleString()} pts</span>
          <span className={timeLeft <= 10 ? 'text-red-400 font-bold' : ''}>{timeLeft}s</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </div>

      {/* Letter grid — all pointer events on the container for reliable drag capture */}
      <div
        className="grid grid-cols-4 gap-2 touch-none"
        onPointerDown={handleGridPointerDown}
        onPointerMove={handleGridPointerMove}
        onPointerUp={handleGridPointerUp}
        onPointerCancel={handleGridPointerUp}
      >
        {grid.map((letter, i) => {
          const isInPath = currentPath.includes(i);
          const pathIndex = currentPath.indexOf(i);
          return (
            <div
              key={i}
              ref={(el) => { cellRefs.current[i] = el; }}
              className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold cursor-pointer transition-all relative ${
                isInPath
                  ? 'bg-[#4AE688] border-[#4AE688] text-[#0D1120] scale-105'
                  : 'bg-slate-800 border-slate-600 text-white'
              }`}
            >
              {isInPath && pathIndex > 0 && (
                <span className="absolute text-xs text-[#0D1120]/60 font-normal top-1 right-1.5">
                  {pathIndex + 1}
                </span>
              )}
              <span>{letter}</span>
            </div>
          );
        })}
      </div>

      {/* Current word being traced */}
      {currentPath.length > 0 && (
        <div className="text-xl font-bold text-white tracking-widest">
          {currentPath.map((i) => grid[i]).join('').toUpperCase()}
          {currentPath.length >= 3 && (
            <span className="text-[#4AE688] ml-2 text-sm">+{getWordHuntScore(currentPath.length)}</span>
          )}
        </div>
      )}

      {/* Found words list */}
      <div className="w-full max-w-xs">
        <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
          {foundWords.length === 0 && (
            <p className="text-slate-500 text-sm w-full text-center">Drag to trace words</p>
          )}
          {[...foundWords].reverse().map((fw) => (
            <span key={fw.word} className="px-2 py-0.5 bg-slate-700 rounded text-sm text-slate-300">
              {fw.word.toLowerCase()} <span className="text-[#4AE688]">+{fw.score}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Done button */}
      <button
        onClick={handleSubmit}
        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
      >
        Done ({foundWords.length} words)
      </button>
    </div>
  );
}
