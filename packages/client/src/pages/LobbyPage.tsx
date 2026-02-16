import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '@cohesion/shared';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export function LobbyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listGames()
      .then(setGames)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const game = await api.createGame();
      navigate(`/game/${game.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      await api.joinGame(gameId);
      navigate(`/game/${gameId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Cohesion</h1>
          <p className="text-slate-400">Workplace Gaming Platform</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">{user?.displayName}</span>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Create Game */}
      <button
        onClick={handleCreateGame}
        disabled={creating}
        className="w-full mb-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-slate-400
                   rounded-xl text-lg font-semibold transition-colors"
      >
        {creating ? 'Creating...' : 'New Connect Four Game'}
      </button>

      {/* Game List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-slate-200">Open Games</h2>

        {loading ? (
          <p className="text-slate-500">Loading games...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl">
            <p className="text-slate-400 text-lg">No games yet</p>
            <p className="text-slate-500 mt-1">Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const isMyGame = game.players.some((p) => p.userId === user?.id);
              const isWaiting = game.status === 'waiting';
              const creator = game.players.find((p) => p.playerNumber === 1);

              return (
                <div
                  key={game.id}
                  className="flex items-center justify-between bg-slate-800 rounded-xl px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-white">
                      Connect Four
                      <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                        {game.status}
                      </span>
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Created by {creator?.displayName || 'Unknown'}
                      {game.players.length === 2 && ` vs ${game.players.find(p => p.playerNumber === 2)?.displayName}`}
                    </p>
                  </div>

                  {isMyGame ? (
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      {game.status === 'active' ? 'Continue' : 'View'}
                    </button>
                  ) : isWaiting ? (
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Join Game
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/game/${game.id}`)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Spectate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
