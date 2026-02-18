import { TIC_TAC_TOE_SIZE, type TicTacToeBoard as BoardType } from '@cohesion/shared';

interface TicTacToeBoardProps {
  board: BoardType;
  currentPlayer: 1 | 2;
  isMyTurn: boolean;
  myPlayerNumber: 1 | 2 | null;
  onCellClick: (row: number, col: number) => void;
  winningCells?: [number, number][];
  disabled?: boolean;
}

export function TicTacToeBoard({ board, isMyTurn, myPlayerNumber, onCellClick, winningCells, disabled }: TicTacToeBoardProps) {
  const canClick = isMyTurn && !disabled;

  const isWinningCell = (r: number, c: number) =>
    winningCells?.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-slate-800 p-3 rounded-xl shadow-2xl">
        {Array.from({ length: TIC_TAC_TOE_SIZE }, (_, r) => (
          <div key={r} className="flex">
            {Array.from({ length: TIC_TAC_TOE_SIZE }, (_, c) => {
              const cell = board[r][c];
              const winning = isWinningCell(r, c);
              const empty = cell === 0;
              const clickable = canClick && empty;

              return (
                <button
                  key={c}
                  className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-5xl sm:text-6xl font-bold
                    border-2 border-slate-600 transition-all duration-150
                    ${empty ? 'bg-slate-900' : 'bg-slate-850'}
                    ${clickable ? 'cursor-pointer hover:bg-slate-700' : 'cursor-default'}
                    ${winning ? 'animate-win-pulse bg-slate-700 ring-2 ring-white' : ''}
                    ${r === 0 ? 'border-t-0' : ''} ${r === TIC_TAC_TOE_SIZE - 1 ? 'border-b-0' : ''}
                    ${c === 0 ? 'border-l-0' : ''} ${c === TIC_TAC_TOE_SIZE - 1 ? 'border-r-0' : ''}
                    ${r === 0 && c === 0 ? 'rounded-tl-lg' : ''}
                    ${r === 0 && c === TIC_TAC_TOE_SIZE - 1 ? 'rounded-tr-lg' : ''}
                    ${r === TIC_TAC_TOE_SIZE - 1 && c === 0 ? 'rounded-bl-lg' : ''}
                    ${r === TIC_TAC_TOE_SIZE - 1 && c === TIC_TAC_TOE_SIZE - 1 ? 'rounded-br-lg' : ''}
                  `}
                  onClick={() => clickable && onCellClick(r, c)}
                  disabled={!clickable}
                  aria-label={`Row ${r + 1}, Column ${c + 1}${cell === 1 ? ', X' : cell === 2 ? ', O' : ', Empty'}`}
                >
                  {cell === 1 && <span className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">X</span>}
                  {cell === 2 && <span className="text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]">O</span>}
                  {empty && clickable && myPlayerNumber && (
                    <span className="opacity-0 hover:opacity-20 text-slate-400">
                      {myPlayerNumber === 1 ? 'X' : 'O'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
