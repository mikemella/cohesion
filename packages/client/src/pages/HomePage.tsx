import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType } from '@cohesion/shared';
import { api } from '../services/api';

interface GameInfo {
  type: GameType;
  name: string;
  description: string;
  players: string;
  preview: React.ReactNode;
}

const GAMES: GameInfo[] = [
  {
    type: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Classic X and O — get three in a row to win',
    players: '2 players',
    preview: <TicTacToePreview />,
  },
  {
    type: 'connect-four',
    name: 'Connect Four',
    description: 'Drop pieces and connect four in a row to win',
    players: '2 players',
    preview: <ConnectFourPreview />,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSelectGame = (gameType: GameType) => {
    setSelectedGame(gameType);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !selectedGame) return;

    setCreating(true);
    setError('');
    try {
      const game = await api.createGame(playerName.trim(), selectedGame);
      sessionStorage.setItem(`game:${game.id}:player`, '1');
      sessionStorage.setItem(`game:${game.id}:name`, playerName.trim());
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedInfo = GAMES.find(g => g.type === selectedGame);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-3">Cohesion</h1>
          <p className="text-slate-400 text-lg">Workplace Gaming Platform</p>
        </div>

        {!selectedGame ? (
          <>
            <h2 className="text-xl font-semibold text-slate-300 text-center mb-6">Choose a game</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GAMES.map((game) => (
                <button
                  key={game.type}
                  onClick={() => handleSelectGame(game.type)}
                  className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500
                             rounded-xl p-6 text-left transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <div className="flex justify-center mb-4">
                    {game.preview}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-2">{game.description}</p>
                  <span className="text-xs text-slate-500">{game.players}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => { setSelectedGame(null); setError(''); }}
              className="text-slate-400 hover:text-white transition-colors mb-6 flex items-center gap-1"
            >
              &larr; Back to games
            </button>

            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">{selectedInfo?.preview}</div>
              <h2 className="text-2xl font-bold text-white">{selectedInfo?.name}</h2>
            </div>

            <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-center">Enter Your Name</h3>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
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
                disabled={creating || !playerName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-slate-400
                           rounded-lg font-semibold text-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Start Game'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function TicTacToePreview() {
  // A small 3x3 preview board with some pieces placed
  const preview = [
    [1, 0, 2],
    [0, 1, 0],
    [2, 0, 1],
  ];

  return (
    <div className="grid grid-cols-3 gap-0.5 w-20 h-20">
      {preview.flat().map((cell, i) => (
        <div
          key={i}
          className="bg-slate-900 border border-slate-700 rounded-sm flex items-center justify-center text-xs font-bold"
        >
          {cell === 1 && <span className="text-blue-400">X</span>}
          {cell === 2 && <span className="text-rose-400">O</span>}
        </div>
      ))}
    </div>
  );
}

function ConnectFourPreview() {
  // A small 4x5 preview of a connect four board
  const preview = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 2, 0, 0],
    [0, 1, 1, 2, 1],
  ];

  return (
    <div className="bg-blue-700 p-1 rounded-md">
      <div className="grid grid-cols-5 gap-0.5">
        {preview.flat().map((cell, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full ${
              cell === 0 ? 'bg-slate-900' : cell === 1 ? 'bg-red-500' : 'bg-yellow-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
