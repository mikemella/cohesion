import { useState, useEffect, useRef } from 'react';
import { CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS, type Board as BoardType, type CellValue } from '@cohesion/shared';

interface BoardProps {
  board: BoardType;
  currentPlayer: 1 | 2;
  isMyTurn: boolean;
  myPlayerNumber: 1 | 2 | null;
  onColumnClick: (col: number) => void;
  winningCells?: [number, number][];
  disabled?: boolean;
}

const PLAYER_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
};

const PLAYER_SHADOWS: Record<number, string> = {
  1: 'shadow-red-500/50',
  2: 'shadow-yellow-400/50',
};

export function Board({ board, currentPlayer, isMyTurn, myPlayerNumber, onColumnClick, winningCells, disabled }: BoardProps) {
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const prevBoardRef = useRef<BoardType>(board);

  // Detect the last placed piece for drop animation
  useEffect(() => {
    const prev = prevBoardRef.current;
    for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
      for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
        if (prev[r][c] === 0 && board[r][c] !== 0) {
          setLastMove([r, c]);
        }
      }
    }
    prevBoardRef.current = board.map(row => [...row]) as BoardType;
  }, [board]);

  const isWinningCell = (r: number, c: number) =>
    winningCells?.some(([wr, wc]) => wr === r && wc === c);

  const canClick = isMyTurn && !disabled;

  return (
    <div className="flex flex-col items-center">
      {/* Column hover indicators */}
      <div className="flex gap-1 mb-1">
        {Array.from({ length: CONNECT_FOUR_COLS }, (_, c) => (
          <div key={c} className="w-12 h-3 sm:w-14 sm:h-4 flex items-center justify-center">
            {hoverCol === c && canClick && myPlayerNumber && (
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${PLAYER_COLORS[myPlayerNumber]} opacity-50`} />
            )}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="bg-blue-700 p-2 rounded-xl shadow-2xl">
        {board.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((cell: CellValue, c: number) => (
              <button
                key={c}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-blue-800 transition-all duration-150
                  ${cell === 0 ? 'bg-slate-900' : `${PLAYER_COLORS[cell]} shadow-lg ${PLAYER_SHADOWS[cell]}`}
                  ${canClick && cell === 0 ? 'cursor-pointer hover:bg-slate-800' : 'cursor-default'}
                  ${isWinningCell(r, c) ? 'animate-win-pulse ring-2 ring-white' : ''}
                  ${lastMove && lastMove[0] === r && lastMove[1] === c ? 'animate-drop' : ''}
                `}
                onClick={() => canClick && onColumnClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                disabled={!canClick}
                aria-label={`Row ${r + 1}, Column ${c + 1}${cell ? `, Player ${cell}` : ', Empty'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
