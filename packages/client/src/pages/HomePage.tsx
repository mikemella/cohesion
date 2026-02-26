import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType, TournamentFormat } from '@cohesion/shared';
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
  {
    type: 'dots',
    name: 'Dots & Boxes',
    description: 'Draw lines to claim boxes — most boxes wins',
    players: '2 players',
    preview: <DotsPreview />,
  },
];

type GameMode = '1v1' | 'tournament';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState<TournamentFormat>('single-elimination');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSelectGame = (gameType: GameType) => {
    setSelectedGame(gameType);
    setSelectedMode(null);
    setError('');
  };

  const handleBack = () => {
    if (selectedMode) {
      setSelectedMode(null);
      setError('');
    } else {
      setSelectedGame(null);
      setError('');
    }
  };

  const handleCreate1v1 = async (e: React.FormEvent) => {
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

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !tournamentName.trim() || !selectedGame) return;

    setCreating(true);
    setError('');
    try {
      const { tournament } = await api.createTournament(
        playerName.trim(),
        tournamentName.trim(),
        selectedGame,
        tournamentFormat
      );
      navigate(`/tournament/${tournament.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedInfo = GAMES.find(g => g.type === selectedGame);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-3">Cohesion</h1>
          <p className="text-slate-400 text-lg">Workplace Gaming Platform</p>
        </div>

        {!selectedGame ? (
          <>
            <h2 className="text-xl font-semibold text-slate-300 text-center mb-6">Choose a game</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <p className="text-slate-400 text-sm">{game.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-sm mx-auto">
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-white transition-colors mb-6 flex items-center gap-1"
            >
              &larr; {selectedMode ? 'Back' : 'Back to games'}
            </button>

            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">{selectedInfo?.preview}</div>
              <h2 className="text-2xl font-bold text-white">{selectedInfo?.name}</h2>
            </div>

            {!selectedMode ? (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedMode('1v1')}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500
                             rounded-xl p-5 text-left transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⚔️</div>
                    <div>
                      <div className="font-semibold text-white text-lg">Play 1v1</div>
                      <div className="text-slate-400 text-sm">Quick match — challenge a friend</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedMode('tournament')}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500
                             rounded-xl p-5 text-left transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="font-semibold text-white text-lg">Create Tournament</div>
                      <div className="text-slate-400 text-sm">Invite multiple players — build a bracket</div>
                    </div>
                  </div>
                </button>
              </div>
            ) : selectedMode === '1v1' ? (
              <form onSubmit={handleCreate1v1} className="bg-slate-800 rounded-xl p-6 space-y-4">
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
            ) : (
              <form onSubmit={handleCreateTournament} className="bg-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-center">Create Tournament</h3>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tournament Name</label>
                  <input
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="e.g. Friday Office Cup"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white
                               focus:outline-none focus:border-purple-500 text-lg"
                    autoFocus
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white
                               focus:outline-none focus:border-purple-500 text-lg"
                    maxLength={50}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['single-elimination', 'double-elimination'] as TournamentFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setTournamentFormat(fmt)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          tournamentFormat === fmt
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {fmt === 'single-elimination' ? 'Single Elim' : 'Double Elim'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {tournamentFormat === 'single-elimination'
                      ? "One loss and you're out. Fast-paced bracket."
                      : 'Two losses to eliminate. More chances to come back.'}
                  </p>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={creating || !playerName.trim() || !tournamentName.trim()}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-slate-400
                             rounded-lg font-semibold text-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Tournament'}
                </button>
              </form>
            )}
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

function DotsPreview() {
  // Mini dots-and-boxes: 3x3 dots (2x2 boxes) with some lines and a claimed box
  // h[row][col], v[row][col], boxes[row][col]
  const hLines = [[true, true], [false, true], [true, true]];
  const vLines = [[true, false], [true, true]];
  const boxes = [[1, 0], [0, 0]];

  const dotSize = 'w-1.5 h-1.5';
  const hLineW = 'w-5';
  const vLineH = 'h-5';

  return (
    <div className="flex flex-col gap-0 items-center">
      {[0, 1, 2].map(r => (
        <div key={`r${r}`}>
          {/* Dot row */}
          <div className="flex items-center gap-0">
            {[0, 1, 2].map(c => (
              <div key={`d${r}${c}`} className="flex items-center">
                <div className={`${dotSize} rounded-full bg-slate-300`} />
                {c < 2 && (
                  <div className={`${hLineW} h-1 rounded-sm ${hLines[r][c] ? 'bg-slate-300' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
          {/* Vertical + box row */}
          {r < 2 && (
            <div className="flex items-center gap-0">
              {[0, 1, 2].map(c => (
                <div key={`v${r}${c}`} className="flex items-center">
                  <div className={`w-1.5 ${vLineH} rounded-sm ${vLines[r][c] ? 'bg-slate-300' : 'bg-slate-700'}`} />
                  {c < 2 && (
                    <div className={`${hLineW} ${vLineH} rounded-sm text-[8px] font-bold flex items-center justify-center ${
                      boxes[r][c] === 1 ? 'bg-blue-500/20' : boxes[r][c] === 2 ? 'bg-rose-500/20' : ''
                    }`}>
                      {boxes[r][c] === 1 && <span className="text-blue-400">1</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
