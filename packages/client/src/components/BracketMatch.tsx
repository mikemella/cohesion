import type { TournamentMatch, TournamentParticipant } from '@cohesion/shared';

interface BracketMatchProps {
  match: TournamentMatch;
  participants: TournamentParticipant[];
  myParticipantId: string | null;
  tournamentId: string;
  onStartMatch: (matchId: string) => void;
  starting: boolean;
}

export function BracketMatch({
  match,
  participants,
  myParticipantId,
  tournamentId,
  onStartMatch,
  starting,
}: BracketMatchProps) {
  const p1 = participants.find((p) => p.id === match.player1ParticipantId);
  const p2 = participants.find((p) => p.id === match.player2ParticipantId);
  const winner = participants.find((p) => p.id === match.winnerId);

  const isMyMatch =
    myParticipantId &&
    (match.player1ParticipantId === myParticipantId ||
      match.player2ParticipantId === myParticipantId);

  const canStart =
    isMyMatch &&
    match.status === 'pending' &&
    match.player1ParticipantId &&
    match.player2ParticipantId;

  const borderColor =
    match.status === 'completed'
      ? 'border-slate-600'
      : match.status === 'active'
      ? 'border-blue-500'
      : isMyMatch && match.status === 'pending' && p1 && p2
      ? 'border-purple-500'
      : 'border-slate-700';

  if (match.status === 'bye') {
    return (
      <div className={`bg-slate-800 border ${borderColor} rounded-lg p-3 w-44`}>
        <div className="text-xs text-slate-500 mb-1">BYE</div>
        <div className="text-sm font-medium text-slate-300">{winner?.playerName ?? '—'}</div>
        <div className="text-xs text-green-400 mt-1">Auto-advance</div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 border ${borderColor} rounded-lg p-3 w-44`}>
      <PlayerRow
        name={p1?.playerName ?? 'TBD'}
        isWinner={match.winnerId === match.player1ParticipantId}
        isLoser={match.status === 'completed' && match.winnerId !== match.player1ParticipantId && !!p1}
        isMe={myParticipantId === match.player1ParticipantId}
      />
      <div className="text-xs text-slate-600 text-center my-1">vs</div>
      <PlayerRow
        name={p2?.playerName ?? 'TBD'}
        isWinner={match.winnerId === match.player2ParticipantId}
        isLoser={match.status === 'completed' && match.winnerId !== match.player2ParticipantId && !!p2}
        isMe={myParticipantId === match.player2ParticipantId}
      />
      {match.status === 'active' && match.gameId && (
        <a
          href={`/game/${match.gameId}?tournamentId=${tournamentId}`}
          className="mt-2 block text-center text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1 transition-colors"
        >
          Watch / Rejoin
        </a>
      )}
      {canStart && (
        <button
          onClick={() => onStartMatch(match.id)}
          disabled={starting}
          className="mt-2 w-full text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-slate-400
                     text-white rounded px-2 py-1 transition-colors font-medium"
        >
          {starting ? 'Starting...' : 'Start Match'}
        </button>
      )}
    </div>
  );
}

function PlayerRow({
  name,
  isWinner,
  isLoser,
  isMe,
}: {
  name: string;
  isWinner: boolean;
  isLoser: boolean;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-sm rounded px-1 py-0.5 ${
        isWinner ? 'text-green-400' : isLoser ? 'text-slate-500 line-through' : 'text-slate-200'
      }`}
    >
      {isWinner && <span className="text-xs">🏆</span>}
      <span className="truncate max-w-[110px]">{name}</span>
      {isMe && <span className="text-xs text-slate-500 shrink-0">(you)</span>}
    </div>
  );
}
