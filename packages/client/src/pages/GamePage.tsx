import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import type { Game, ConnectFourState, TicTacToeState, DotsState } from '@cohesion/shared';
import { checkWin, CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS, checkTTTWin, TIC_TAC_TOE_SIZE } from '@cohesion/shared';
import { Board } from '../components/Board';
import { TicTacToeBoard } from '../components/TicTacToeBoard';
import { DotsBoard } from '../components/DotsBoard';
import { LogoMark } from '../components/Logo';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

const GAME_LABELS: Record<string, string> = {
  'connect-four': 'Connect Four',
  'tic-tac-toe': 'Tic-Tac-Toe',
  'dots': 'Dots & Boxes',
};

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get('tournamentId');
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Join flow state
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);

  // Which player am I? Stored per-game in sessionStorage
  const myPlayer = id ? Number(sessionStorage.getItem(`game:${id}:player`)) as 1 | 2 | 0 : 0;

  const fetchGame = useCallback(async () => {
    if (!id) return;
    try {
      const g = await api.getGame(id);
      setGame(g);

      const storedPlayer = sessionStorage.getItem(`game:${id}:player`);
      if (!storedPlayer) {
        if (g.status === 'waiting') {
          setNeedsJoin(true);
        } else if (g.status === 'active' || g.status === 'completed') {
          setNeedsJoin(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Request notification permission once we know which player we are
  useEffect(() => {
    if (myPlayer && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [myPlayer]);

  // WebSocket
  useEffect(() => {
    if (!id) return;
    connectSocket();
    const socket = getSocket();
    socket.emit('joinGame', id);

    socket.on('moveMade', ({ game: updatedGame }) => {
      setGame(updatedGame);
      if (myPlayer && updatedGame.currentTurn === myPlayer && Notification.permission === 'granted') {
        new Notification('Your move.', {
          body: 'Your opponent made their move — go play!',
          icon: '/favicon.svg',
        });
      }
    });

    socket.on('gameUpdated', (updatedGame) => {
      setGame(updatedGame);
      if (myPlayer && updatedGame.currentTurn === myPlayer && Notification.permission === 'granted') {
        new Notification('Your move.', {
          body: 'Your opponent made their move — go play!',
          icon: '/favicon.svg',
        });
      }
    });

    socket.on('playerJoined', () => {
      fetchGame();
    });

    return () => {
      socket.emit('leaveGame', id);
      socket.off('moveMade');
      socket.off('gameUpdated');
      socket.off('playerJoined');
    };
  }, [id, fetchGame]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !joinName.trim()) return;

    setJoining(true);
    setError('');
    try {
      const g = await api.joinGame(id, joinName.trim());
      sessionStorage.setItem(`game:${id}:player`, '2');
      sessionStorage.setItem(`game:${id}:name`, joinName.trim());
      setGame(g);
      setNeedsJoin(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleConnectFourMove = async (column: number) => {
    if (!game || !id || !myPlayer) return;
    setError('');
    try {
      const updatedGame = await api.makeMove(id, myPlayer as 1 | 2, { column });
      setGame(updatedGame);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTicTacToeMove = async (row: number, col: number) => {
    if (!game || !id || !myPlayer) return;
    setError('');
    try {
      const updatedGame = await api.makeMove(id, myPlayer as 1 | 2, { row, col });
      setGame(updatedGame);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDotsMove = async (orientation: number, row: number, col: number) => {
    if (!game || !id || !myPlayer) return;
    setError('');
    try {
      const updatedGame = await api.makeMove(id, myPlayer as 1 | 2, { orientation, row, col });
      setGame(updatedGame);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-slate-400">Loading game...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-red-400">{error || 'Game not found'}</div>
        <button
          onClick={() => navigate('/')}
          className="text-blue-400 hover:text-blue-300"
        >
          Go Home
        </button>
      </div>
    );
  }

  const gameLabel = GAME_LABELS[game.gameType] || game.gameType;

  // Join form for Player 2
  if (needsJoin && game.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{gameLabel}</h1>
            <p className="text-slate-400">
              {game.player1Name} is waiting for an opponent
            </p>
          </div>
          <form onSubmit={handleJoin} className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Enter Your Name</h2>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white
                         focus:outline-none focus:border-blue-500 text-center text-lg"
              autoFocus
              maxLength={50}
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={joining || !joinName.trim()}
              className="w-full py-3 bg-[#4AE688] hover:bg-[#3DD677] disabled:bg-[#4AE688]/30 disabled:text-[#0D1120]/40
                         text-[#0D1120] rounded-lg font-semibold text-lg transition-colors"
            >
              {joining ? 'Joining...' : 'Accept challenge'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isMyTurn = myPlayer ? game.currentTurn === myPlayer : false;
  const isGameOver = game.status === 'completed';
  const isWaiting = game.status === 'waiting';

  // Find winning cells
  let winningCells: [number, number][] = [];
  if (isGameOver && game.winner) {
    if (game.gameType === 'connect-four') {
      winningCells = findConnectFourWinningCells((game.state as ConnectFourState).board);
    } else if (game.gameType === 'tic-tac-toe') {
      winningCells = findTicTacToeWinningCells((game.state as TicTacToeState).board);
    }
  }

  const myName = myPlayer === 1 ? game.player1Name : myPlayer === 2 ? game.player2Name : null;
  const opponentName = myPlayer === 1 ? game.player2Name : myPlayer === 2 ? game.player1Name : null;

  // Player piece labels
  const playerPiece = (pNum: number) => {
    if (game.gameType === 'tic-tac-toe') {
      return pNum === 1
        ? <span className="text-blue-400 font-bold">X</span>
        : <span className="text-rose-400 font-bold">O</span>;
    }
    if (game.gameType === 'dots') {
      return <div className={`w-4 h-4 rounded ${pNum === 1 ? 'bg-blue-500' : 'bg-rose-500'}`} />;
    }
    return <div className={`w-4 h-4 rounded-full ${pNum === 1 ? 'bg-red-500' : 'bg-yellow-400'}`} />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 transition-opacity hover:opacity-70"
        aria-label="Home"
      >
        <LogoMark size={32} />
      </button>

      {/* Status Banner */}
      <div className="mb-6 text-center">
        {isWaiting && (
          <div className="bg-slate-800 rounded-lg px-6 py-4 space-y-3">
            <p className="text-lg text-slate-300">Waiting for someone to accept...</p>
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-sm w-64"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#4AE688] hover:bg-[#3DD677] text-[#0D1120] rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Send the challenge'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Share this link to start playing</p>
          </div>
        )}

        {game.status === 'active' && (
          <div className={`rounded-lg px-6 py-3 ${isMyTurn ? 'bg-green-900/50 border border-green-700' : 'bg-slate-800'}`}>
            <p className="text-lg font-semibold">
              {!myPlayer ? (
                <span className="text-slate-300">
                  {game.currentTurn === 1 ? game.player1Name : game.player2Name}'s turn
                </span>
              ) : isMyTurn ? (
                <span className="text-[#4AE688]">Your move.</span>
              ) : (
                <span className="text-slate-300">
                  Waiting on {opponentName || 'opponent'}...
                </span>
              )}
            </p>
          </div>
        )}

        {isGameOver && (
          <div className={`rounded-lg px-6 py-3 ${
            game.isDraw ? 'bg-slate-700' :
            game.winner === myPlayer ? 'bg-green-900/50 border border-green-700' :
            !myPlayer ? 'bg-slate-700' :
            'bg-red-900/50 border border-red-700'
          }`}>
            <p className="text-xl font-bold">
              {game.isDraw ? (
                <span className="text-slate-300">Nobody wins. Nobody loses. Play again.</span>
              ) : !myPlayer ? (
                <span className="text-slate-300">
                  {game.winner === 1 ? game.player1Name : game.player2Name} wins!
                </span>
              ) : game.winner === myPlayer ? (
                <span className="text-[#4AE688]">GG. You win.</span>
              ) : (
                <span className="text-red-400">Rough. Rematch?</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Player Labels */}
      <div className="flex items-center gap-8 mb-4">
        {[1, 2].map((pNum) => {
          const name = pNum === 1 ? game.player1Name : game.player2Name;
          if (!name) return null;
          return (
            <div
              key={pNum}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                game.currentTurn === pNum && !isGameOver
                  ? 'bg-slate-700 ring-2 ring-[#4AE688]'
                  : 'bg-slate-800'
              }`}
            >
              {playerPiece(pNum)}
              <span className="font-medium">
                {name}
                {pNum === myPlayer && <span className="text-slate-500 text-sm"> (you)</span>}
                {game.gameType === 'dots' && (
                  <span className="text-slate-400 text-sm ml-1">
                    — {(game.state as DotsState).scores[pNum - 1]} boxes
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Board — render the right one for the game type */}
      {game.gameType === 'connect-four' && (
        <Board
          board={(game.state as ConnectFourState).board}
          currentPlayer={(game.state as ConnectFourState).currentPlayer}
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayer as 1 | 2 | null || null}
          onColumnClick={handleConnectFourMove}
          winningCells={winningCells}
          disabled={isGameOver || isWaiting || !myPlayer}
        />
      )}

      {game.gameType === 'tic-tac-toe' && (
        <TicTacToeBoard
          board={(game.state as TicTacToeState).board}
          currentPlayer={(game.state as TicTacToeState).currentPlayer}
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayer as 1 | 2 | null || null}
          onCellClick={handleTicTacToeMove}
          winningCells={winningCells}
          disabled={isGameOver || isWaiting || !myPlayer}
        />
      )}

      {game.gameType === 'dots' && (
        <DotsBoard
          state={game.state as DotsState}
          isMyTurn={isMyTurn}
          myPlayerNumber={myPlayer as 1 | 2 | null || null}
          onLineClick={handleDotsMove}
          disabled={isGameOver || isWaiting || !myPlayer}
        />
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {isGameOver && (
        tournamentId ? (
          <button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            Return to Tournament
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-2 bg-[#4AE688] hover:bg-[#3DD677] text-[#0D1120] rounded-lg font-medium transition-colors"
          >
            Play again
          </button>
        )
      )}
    </div>
  );
}

/** Scan the board to find all cells that are part of a 4-in-a-row. */
function findConnectFourWinningCells(board: import('@cohesion/shared').Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < CONNECT_FOUR_ROWS; r++) {
    for (let c = 0; c < CONNECT_FOUR_COLS; c++) {
      if (board[r][c] !== 0 && checkWin(board, r, c)) {
        const player = board[r][c];
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
          const line: [number, number][] = [[r, c]];
          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr < 0 || nr >= CONNECT_FOUR_ROWS || nc < 0 || nc >= CONNECT_FOUR_COLS) break;
            if (board[nr][nc] !== player) break;
            line.push([nr, nc]);
          }
          for (let i = 1; i < 4; i++) {
            const nr = r - dr * i, nc = c - dc * i;
            if (nr < 0 || nr >= CONNECT_FOUR_ROWS || nc < 0 || nc >= CONNECT_FOUR_COLS) break;
            if (board[nr][nc] !== player) break;
            line.push([nr, nc]);
          }
          if (line.length >= 4) {
            for (const cell of line) {
              if (!cells.some(([cr, cc]) => cr === cell[0] && cc === cell[1])) {
                cells.push(cell);
              }
            }
          }
        }
      }
    }
  }
  return cells;
}

/** Find winning cells for tic-tac-toe (a complete row, column, or diagonal). */
function findTicTacToeWinningCells(board: import('@cohesion/shared').TicTacToeBoard): [number, number][] {
  for (let r = 0; r < TIC_TAC_TOE_SIZE; r++) {
    for (let c = 0; c < TIC_TAC_TOE_SIZE; c++) {
      if (board[r][c] !== 0 && checkTTTWin(board, r, c)) {
        const player = board[r][c];
        // Check which line(s) won
        const cells: [number, number][] = [];

        // Row
        if (board[r].every(cell => cell === player)) {
          for (let i = 0; i < TIC_TAC_TOE_SIZE; i++) cells.push([r, i]);
        }
        // Column
        if (board.every(row => row[c] === player)) {
          for (let i = 0; i < TIC_TAC_TOE_SIZE; i++) {
            if (!cells.some(([cr, cc]) => cr === i && cc === c)) cells.push([i, c]);
          }
        }
        // Main diagonal
        if (r === c && board.every((row, i) => row[i] === player)) {
          for (let i = 0; i < TIC_TAC_TOE_SIZE; i++) {
            if (!cells.some(([cr, cc]) => cr === i && cc === i)) cells.push([i, i]);
          }
        }
        // Anti-diagonal
        if (r + c === TIC_TAC_TOE_SIZE - 1 && board.every((row, i) => row[TIC_TAC_TOE_SIZE - 1 - i] === player)) {
          for (let i = 0; i < TIC_TAC_TOE_SIZE; i++) {
            const ac = TIC_TAC_TOE_SIZE - 1 - i;
            if (!cells.some(([cr, cc]) => cr === i && cc === ac)) cells.push([i, ac]);
          }
        }

        if (cells.length > 0) return cells;
      }
    }
  }
  return [];
}
