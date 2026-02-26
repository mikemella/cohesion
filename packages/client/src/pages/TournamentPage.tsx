import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { TournamentDetails } from '@cohesion/shared';
import { api } from '../services/api';
import { getSessionId } from '../services/session';
import { connectSocket, getSocket } from '../services/socket';
import { TournamentLobby } from '../components/TournamentLobby';
import { TournamentBracket } from '../components/TournamentBracket';

const GAME_LABELS: Record<string, string> = {
  'connect-four': 'Connect Four',
  'tic-tac-toe': 'Tic-Tac-Toe',
  'dots': 'Dots & Boxes',
};

export function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Join flow state
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const sessionId = getSessionId();

  const goToActiveMatch = useCallback(
    (d: TournamentDetails, participantId: string | null) => {
      if (!participantId) return;
      const activeMatch = d.matches.find(
        (m) =>
          m.status === 'active' &&
          m.gameId &&
          (m.player1ParticipantId === participantId || m.player2ParticipantId === participantId)
      );
      if (activeMatch && activeMatch.gameId) {
        const playerNum = activeMatch.player1ParticipantId === participantId ? '1' : '2';
        sessionStorage.setItem(`game:${activeMatch.gameId}:player`, playerNum);
        navigate(`/game/${activeMatch.gameId}?tournamentId=${d.tournament.id}`);
      }
    },
    [navigate]
  );

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api.getTournament(id);
      setDetails(d);

      // Determine if this session is already a participant
      const myParticipant = d.participants.find((p) => p.sessionId === sessionId);
      if (!myParticipant && d.tournament.status === 'waiting') {
        setNeedsJoin(true);
      } else {
        goToActiveMatch(d, myParticipant?.id ?? null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, sessionId, goToActiveMatch]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // WebSocket subscription
  useEffect(() => {
    if (!id) return;
    connectSocket();
    const socket = getSocket();
    socket.emit('joinTournament', id);

    socket.on('tournamentUpdated', (updatedDetails) => {
      setDetails(updatedDetails);
      const myParticipant = updatedDetails.participants.find((p) => p.sessionId === sessionId);
      goToActiveMatch(updatedDetails, myParticipant?.id ?? null);
    });

    socket.on('participantJoined', ({ participant }) => {
      setDetails((prev) => {
        if (!prev) return prev;
        const already = prev.participants.find((p) => p.id === participant.id);
        if (already) return prev;
        return { ...prev, participants: [...prev.participants, participant] };
      });
    });

    return () => {
      socket.emit('leaveTournament', id);
      socket.off('tournamentUpdated');
      socket.off('participantJoined');
    };
  }, [id, sessionId, goToActiveMatch]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !joinName.trim()) return;

    setJoining(true);
    setJoinError('');
    try {
      await api.joinTournament(id, joinName.trim());
      setNeedsJoin(false);
      fetchDetails();
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-slate-400">Loading tournament...</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-red-400">{error || 'Tournament not found'}</div>
        <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300">
          Go Home
        </button>
      </div>
    );
  }

  const { tournament, participants } = details;
  const myParticipant = participants.find((p) => p.sessionId === sessionId);
  const myParticipantId = myParticipant?.id ?? null;
  const isHost = tournament.hostSessionId === sessionId;

  // Join form for new visitors
  if (needsJoin && tournament.status === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-slate-400 text-sm mb-1">{GAME_LABELS[tournament.gameType]}</div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
            <p className="text-slate-400">
              {participants.length} player{participants.length !== 1 ? 's' : ''} joined so far
            </p>
          </div>
          <form onSubmit={handleJoin} className="bg-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Enter Your Name to Join</h2>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white
                         focus:outline-none focus:border-purple-500 text-center text-lg"
              autoFocus
              maxLength={50}
              required
            />
            {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
            <button
              type="submit"
              disabled={joining || !joinName.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-slate-400
                         rounded-lg font-semibold text-lg transition-colors"
            >
              {joining ? 'Joining...' : 'Join Tournament'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If tournament is waiting but they're already in it (or just joined) → lobby
  // If tournament is active or completed → bracket

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          &larr; Home
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            {GAME_LABELS[tournament.gameType]} Tournament
          </div>
          <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
        </div>
        <div className="ml-auto">
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              tournament.status === 'waiting'
                ? 'bg-yellow-900/50 text-yellow-400'
                : tournament.status === 'active'
                ? 'bg-green-900/50 text-green-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {tournament.status === 'waiting'
              ? 'Waiting'
              : tournament.status === 'active'
              ? 'In Progress'
              : 'Completed'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center">
        {tournament.status === 'waiting' ? (
          <TournamentLobby
            details={details}
            myParticipantId={myParticipantId}
            isHost={isHost}
            onLaunched={fetchDetails}
          />
        ) : (
          <div className="w-full max-w-5xl">
            <TournamentBracket details={details} myParticipantId={myParticipantId} />
          </div>
        )}
      </div>
    </div>
  );
}
