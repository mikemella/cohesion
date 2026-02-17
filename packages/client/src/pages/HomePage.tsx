import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function HomePage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setCreating(true);
    setError('');
    try {
      const game = await api.createGame(playerName.trim());
      // Store player info for this game
      sessionStorage.setItem(`game:${game.id}:player`, '1');
      sessionStorage.setItem(`game:${game.id}:name`, playerName.trim());
      navigate(`/game/${game.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold text-white mb-3">Cohesion</h1>
        <p className="text-slate-400 text-lg mb-12">Workplace Gaming Platform</p>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-semibold transition-colors"
          >
            Create Game
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">Enter Your Name</h2>
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !playerName.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-slate-400
                           rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Start Game'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
