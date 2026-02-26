import { useState } from 'react';
import type { TournamentDetails } from '@cohesion/shared';
import { api } from '../services/api';

interface TournamentLobbyProps {
  details: TournamentDetails;
  myParticipantId: string | null;
  isHost: boolean;
  onLaunched: () => void;
}

const GAME_LABELS: Record<string, string> = {
  'connect-four': 'Connect Four',
  'tic-tac-toe': 'Tic-Tac-Toe',
  'dots': 'Dots & Boxes',
};

export function TournamentLobby({ details, myParticipantId, isHost, onLaunched }: TournamentLobbyProps) {
  const { tournament, participants } = details;
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/tournament/${tournament.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError('');
    try {
      await api.launchTournament(tournament.id);
      onLaunched();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      {/* Tournament header */}
      <div className="text-center mb-6">
        <div className="text-slate-400 text-sm mb-1">{GAME_LABELS[tournament.gameType]}</div>
        <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
            {tournament.format === 'single-elimination' ? 'Single Elimination' : 'Double Elimination'}
          </span>
          <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
            Waiting to start
          </span>
        </div>
      </div>

      {/* Share link */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <p className="text-sm text-slate-400 mb-2">Share this link to invite players:</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 text-sm min-w-0"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200">
            Players ({participants.length})
          </h3>
          {participants.length < 2 && (
            <span className="text-xs text-amber-400">Need at least 2 to start</span>
          )}
        </div>
        <div className="space-y-2">
          {participants.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                p.id === myParticipantId ? 'bg-slate-700' : 'bg-slate-900'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                {i + 1}
              </div>
              <span className="text-slate-200 font-medium">{p.playerName}</span>
              {p.id === myParticipantId && (
                <span className="text-xs text-slate-500">(you)</span>
              )}
              {p.sessionId === tournament.hostSessionId && (
                <span className="ml-auto text-xs text-purple-400">host</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Host controls */}
      {isHost && (
        <div>
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            onClick={handleLaunch}
            disabled={launching || participants.length < 2}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-slate-400
                       rounded-xl font-semibold text-lg transition-colors"
          >
            {launching ? 'Launching...' : 'Launch Tournament'}
          </button>
          {participants.length < 2 && (
            <p className="text-center text-xs text-slate-500 mt-2">
              Waiting for more players to join...
            </p>
          )}
        </div>
      )}

      {!isHost && (
        <p className="text-center text-slate-400 text-sm">
          Waiting for the host to launch the tournament...
        </p>
      )}
    </div>
  );
}
