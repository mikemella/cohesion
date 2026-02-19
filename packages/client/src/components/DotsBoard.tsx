import { useState } from 'react';
import { DOTS_GRID_SIZE, type DotsState } from '@cohesion/shared';

const BOXES = DOTS_GRID_SIZE - 1;

interface DotsBoardProps {
  state: DotsState;
  isMyTurn: boolean;
  myPlayerNumber: 1 | 2 | null;
  onLineClick: (orientation: number, row: number, col: number) => void;
  disabled?: boolean;
}

const PLAYER_COLORS = {
  1: { line: 'bg-blue-500', box: 'bg-blue-500/20', border: 'border-blue-500/40' },
  2: { line: 'bg-rose-500', box: 'bg-rose-500/20', border: 'border-rose-500/40' },
};

export function DotsBoard({ state, isMyTurn, myPlayerNumber, onLineClick, disabled }: DotsBoardProps) {
  const [hoverLine, setHoverLine] = useState<string | null>(null);
  const canClick = isMyTurn && !disabled;

  const hKey = (r: number, c: number) => `h-${r}-${c}`;
  const vKey = (r: number, c: number) => `v-${r}-${c}`;

  // Build the grid: alternating rows of (dot + h-line) and (v-line + box)
  const rows: React.ReactNode[] = [];

  for (let r = 0; r < DOTS_GRID_SIZE; r++) {
    // Dot row: dot, h-line, dot, h-line, ..., dot
    const dotRow: React.ReactNode[] = [];
    for (let c = 0; c < DOTS_GRID_SIZE; c++) {
      // Dot
      dotRow.push(
        <div key={`dot-${r}-${c}`} className="w-4 h-4 rounded-full bg-slate-300 z-10 shrink-0" />
      );
      // Horizontal line (except after last dot in row)
      if (c < BOXES) {
        const placed = state.horizontalLines[r][c];
        const key = hKey(r, c);
        const hovering = hoverLine === key;
        const owner = placed ? getLineOwner(state, 0, r, c) : 0;
        dotRow.push(
          <button
            key={key}
            className={`h-4 flex-1 rounded-sm transition-all duration-150
              ${placed
                ? `${owner ? PLAYER_COLORS[owner as 1 | 2].line : 'bg-slate-400'}`
                : canClick
                  ? `${hovering ? 'bg-slate-500' : 'bg-slate-800'} cursor-pointer hover:bg-slate-500`
                  : 'bg-slate-800 cursor-default'
              }
            `}
            onClick={() => canClick && !placed && onLineClick(0, r, c)}
            onMouseEnter={() => !placed && setHoverLine(key)}
            onMouseLeave={() => setHoverLine(null)}
            disabled={!canClick || placed}
            aria-label={`Horizontal line row ${r}, col ${c}${placed ? ' (placed)' : ''}`}
          />
        );
      }
    }
    rows.push(
      <div key={`drow-${r}`} className="flex items-center gap-0">
        {dotRow}
      </div>
    );

    // Box row: v-line, box, v-line, box, ..., v-line (except after last dot row)
    if (r < BOXES) {
      const boxRow: React.ReactNode[] = [];
      for (let c = 0; c < DOTS_GRID_SIZE; c++) {
        // Vertical line
        const placed = state.verticalLines[r][c];
        const key = vKey(r, c);
        const hovering = hoverLine === key;
        const owner = placed ? getLineOwner(state, 1, r, c) : 0;
        boxRow.push(
          <button
            key={key}
            className={`w-4 shrink-0 rounded-sm transition-all duration-150
              ${placed
                ? `${owner ? PLAYER_COLORS[owner as 1 | 2].line : 'bg-slate-400'}`
                : canClick
                  ? `${hovering ? 'bg-slate-500' : 'bg-slate-800'} cursor-pointer hover:bg-slate-500`
                  : 'bg-slate-800 cursor-default'
              }
            `}
            style={{ height: '2.5rem' }}
            onClick={() => canClick && !placed && onLineClick(1, r, c)}
            onMouseEnter={() => !placed && setHoverLine(key)}
            onMouseLeave={() => setHoverLine(null)}
            disabled={!canClick || placed}
            aria-label={`Vertical line row ${r}, col ${c}${placed ? ' (placed)' : ''}`}
          />
        );

        // Box (except after last vertical line in row)
        if (c < BOXES) {
          const boxOwner = state.boxes[r][c];
          boxRow.push(
            <div
              key={`box-${r}-${c}`}
              className={`flex-1 flex items-center justify-center text-xs font-bold rounded-sm
                ${boxOwner
                  ? `${PLAYER_COLORS[boxOwner].box} ${PLAYER_COLORS[boxOwner].border} border`
                  : 'bg-slate-900/50'
                }
              `}
              style={{ height: '2.5rem' }}
            >
              {boxOwner === 1 && <span className="text-blue-400">1</span>}
              {boxOwner === 2 && <span className="text-rose-400">2</span>}
            </div>
          );
        }
      }
      rows.push(
        <div key={`brow-${r}`} className="flex items-center gap-0">
          {boxRow}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Scores */}
      <div className="flex gap-6 mb-4">
        <div className="text-blue-400 font-bold text-lg">P1: {state.scores[0]}</div>
        <div className="text-rose-400 font-bold text-lg">P2: {state.scores[1]}</div>
      </div>
      <div className="bg-slate-800 p-4 rounded-xl shadow-2xl" style={{ width: 'fit-content' }}>
        <div className="flex flex-col gap-0" style={{ width: `${DOTS_GRID_SIZE * 3.5}rem` }}>
          {rows}
        </div>
      </div>
    </div>
  );
}

/** Determine which player "owns" a placed line (the player who placed it last — approximated by checking adjacent boxes). */
function getLineOwner(state: DotsState, orientation: number, row: number, col: number): 0 | 1 | 2 {
  // Check adjacent boxes to see if this line completed one
  if (orientation === 0) {
    // Horizontal line at (row, col) — touches box above (row-1, col) and below (row, col)
    if (row > 0 && state.boxes[row - 1][col] !== 0) return state.boxes[row - 1][col];
    if (row < BOXES && state.boxes[row][col] !== 0) return state.boxes[row][col];
  } else {
    // Vertical line at (row, col) — touches box left (row, col-1) and right (row, col)
    if (col > 0 && state.boxes[row][col - 1] !== 0) return state.boxes[row][col - 1];
    if (col < BOXES && state.boxes[row][col] !== 0) return state.boxes[row][col];
  }
  return 0;
}
