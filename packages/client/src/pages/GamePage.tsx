import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Game } from '@cohesion/shared';
import { checkWin, CONNECT_FOUR_ROWS, CONNECT_FOUR_COLS } from '@cohesion/shared';
import { Board } from '../components/Board';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGame = useCallback(async () => {
    if (!id) return;
    try {
      const g = await api.getGame(id);
      setGame(g);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // WebSocket: subscribe to game room
  useEffect(() => {
    if (!id) return;
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

  const handleMove = async (column: number) => {
    if (!game || !id) return;
    setError('');
    try {
      const updatedGame = await api.makeMove(id, column);
      setGame(updatedGame);
    } catch (err: any) {
      setError(err.message);
    }
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-400">{error || 'Game not found'}</div>
      </div>
    );
  }

  const myPlayer = game.players.find((p) => p.userId === user?.id);
  const opponent = game.players.find((p) => p.userId !== user?.id);
  const isMyTurn = game.currentTurnUserId === user?.id;
  const isGameOver = game.status === 'completed';
  const isWaiting = game.status === 'waiting';

  // Find winning cells
  let winningCells: [number, number][] = [];
  if (isGameOver && game.winnerId) {
    winningCells = findWinningCells(game.state.board);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
      >
        &larr; Back to Lobby
      </button>

      {/* Status Banner */}
      <div className="mb-6 text-center">
        {isWaiting && (
          <div className="bg-slate-800 rounded-lg px-6 py-3">
            <p className="text-lg text-slate-300">Waiting for opponent to join...</p>
            <p className="text-sm text-slate-500 mt-1">Share this page's URL with a friend</p>
          </div>
        )}

        {game.status === 'active' && (
          <div className={`rounded-lg px-6 py-3 ${isMyTurn ? 'bg-green-900/50 border border-green-700' : 'bg-slate-800'}`}>
            <p className="text-lg font-semibold">
              {isMyTurn ? (
                <span className="text-green-400">Your turn!</span>
              ) : (
                <span className="text-slate-300">
                  Waiting for {opponent?.displayName || 'opponent'}...
                </span>
              )}
            </p>
          </div>
        )}

        {isGameOver && (
          <div className={`rounded-lg px-6 py-3 ${
            game.isDraw ? 'bg-slate-700' :
            game.winnerId === user?.id ? 'bg-green-900/50 border border-green-700' :
            'bg-red-900/50 border border-red-700'
          }`}>
            <p className="text-xl font-bold">
              {game.isDraw ? (
                <span className="text-slate-300">It's a draw!</span>
              ) : game.winnerId === user?.id ? (
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
        {game.players.map((p) => (
          <div
            key={p.userId}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              game.currentTurnUserId === p.userId && !isGameOver
                ? 'bg-slate-700 ring-2 ring-blue-500'
                : 'bg-slate-800'
            }`}
          >
            <div className={`w-4 h-4 rounded-full ${p.playerNumber === 1 ? 'bg-red-500' : 'bg-yellow-400'}`} />
            <span className="font-medium">
              {p.displayName}
              {p.userId === user?.id && <span className="text-slate-500 text-sm"> (you)</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Board */}
      <Board
        board={game.state.board}
        currentPlayer={game.state.currentPlayer}
        isMyTurn={isMyTurn}
        myPlayerNumber={myPlayer?.playerNumber ?? null}
        onColumnClick={handleMove}
        winningCells={winningCells}
        disabled={isGameOver || isWaiting}
      />

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {isGameOver && (
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
        >
          Back to Lobby
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
        // Re-trace directions to find which cells are part of the win
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
