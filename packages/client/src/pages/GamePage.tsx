import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Game } from '@cohesion/shared';
import { checkWin, CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS } from '@cohesion/shared';
import { Board } from '../components/Board';
import { api } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

      // If we don't have a player assignment for this game yet
      const storedPlayer = sessionStorage.getItem(`game:${id}:player`);
      if (!storedPlayer) {
        if (g.status === 'waiting') {
          // Game is waiting — this visitor needs to join as player 2
          setNeedsJoin(true);
        } else if (g.status === 'active' || g.status === 'completed') {
          // Game already started — spectator mode (no interaction)
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

  // WebSocket
  useEffect(() => {
    if (!id) return;
    connectSocket();
    const socket = getSocket();
    socket.emit('joinGame', id);

    socket.on('moveMade', ({ game: updatedGame }) => {
      setGame(updatedGame);
    });

    socket.on('gameUpdated', (updatedGame) => {
      setGame(updatedGame);
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

  const handleMove = async (column: number) => {
    if (!game || !id || !myPlayer) return;
    setError('');
    try {
      const updatedGame = await api.makeMove(id, column, myPlayer as 1 | 2);
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

  // Join form for Player 2
  if (needsJoin && game.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Connect Four</h1>
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
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:text-slate-400
                         rounded-lg font-semibold text-lg transition-colors"
            >
              {joining ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Game full (someone opened the link but the game already has 2 players and they're not one of them)
  if (!myPlayer && game.status !== 'waiting') {
    // Spectator view
  }

  const isMyTurn = myPlayer ? game.currentTurn === myPlayer : false;
  const isGameOver = game.status === 'completed';
  const isWaiting = game.status === 'waiting';

  // Find winning cells
  let winningCells: [number, number][] = [];
  if (isGameOver && game.winner) {
    winningCells = findWinningCells(game.state.board);
  }

  const myName = myPlayer === 1 ? game.player1Name : myPlayer === 2 ? game.player2Name : null;
  const opponentName = myPlayer === 1 ? game.player2Name : myPlayer === 2 ? game.player1Name : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
      >
        &larr; Home
      </button>

      {/* Status Banner */}
      <div className="mb-6 text-center">
        {isWaiting && (
          <div className="bg-slate-800 rounded-lg px-6 py-4 space-y-3">
            <p className="text-lg text-slate-300">Waiting for opponent to join...</p>
            <div className="flex items-center gap-2 justify-center">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-sm w-64"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Share this link with a friend to start playing</p>
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
                <span className="text-green-400">Your turn!</span>
              ) : (
                <span className="text-slate-300">
                  Waiting for {opponentName || 'opponent'}...
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
                <span className="text-slate-300">It's a draw!</span>
              ) : !myPlayer ? (
                <span className="text-slate-300">
                  {game.winner === 1 ? game.player1Name : game.player2Name} wins!
                </span>
              ) : game.winner === myPlayer ? (
                <span className="text-green-400">You won!</span>
              ) : (
                <span className="text-red-400">You lost!</span>
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
                  ? 'bg-slate-700 ring-2 ring-blue-500'
                  : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${pNum === 1 ? 'bg-red-500' : 'bg-yellow-400'}`} />
              <span className="font-medium">
                {name}
                {pNum === myPlayer && <span className="text-slate-500 text-sm"> (you)</span>}
              </span>
            </div>
          );
        })}
      </div>

      {/* Board */}
      <Board
        board={game.state.board}
        currentPlayer={game.state.currentPlayer}
        isMyTurn={isMyTurn}
        myPlayerNumber={myPlayer as 1 | 2 | null || null}
        onColumnClick={handleMove}
        winningCells={winningCells}
        disabled={isGameOver || isWaiting || !myPlayer}
      />

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {isGameOver && (
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          New Game
        </button>
      )}
    </div>
  );
}

/** Scan the board to find all cells that are part of a 4-in-a-row. */
function findWinningCells(board: import('@cohesion/shared').Board): [number, number][] {
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
