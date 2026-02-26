import { useState } from 'react';
import type { TournamentDetails } from '@cohesion/shared';
import { BracketMatch } from './BracketMatch';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface TournamentBracketProps {
  details: TournamentDetails;
  myParticipantId: string | null;
}

export function TournamentBracket({ details, myParticipantId }: TournamentBracketProps) {
  const { tournament, matches, participants } = details;
  const navigate = useNavigate();
  const [startingMatchId, setStartingMatchId] = useState<string | null>(null);

  const handleStartMatch = async (matchId: string) => {
    setStartingMatchId(matchId);
    try {
      const { game } = await api.startMatch(tournament.id, matchId);
      navigate(`/game/${game.id}?tournamentId=${tournament.id}`);
    } catch (err: any) {
      console.error('Failed to start match:', err);
    } finally {
      setStartingMatchId(null);
    }
  };

  // Separate winners and losers bracket matches
  const winnersMatches = matches.filter((m) => m.bracket === 'winners');
  const losersMatches = matches.filter((m) => m.bracket === 'losers');

  const maxWinnersRound = Math.max(...winnersMatches.map((m) => m.round), 0);
  const maxLosersRound = Math.max(...losersMatches.map((m) => m.round), 0);

  const winnersRounds = Array.from({ length: maxWinnersRound }, (_, i) => i + 1).map((round) =>
    winnersMatches.filter((m) => m.round === round).sort((a, b) => a.matchIndex - b.matchIndex)
  );

  const losersRounds = Array.from({ length: maxLosersRound }, (_, i) => i + 1).map((round) =>
    losersMatches.filter((m) => m.round === round).sort((a, b) => a.matchIndex - b.matchIndex)
  );

  const isCompleted = tournament.status === 'completed';
  const overallWinner = isCompleted
    ? participants.find((p) => {
        const finalMatch = winnersMatches.find((m) => m.round === maxWinnersRound);
        return finalMatch && finalMatch.winnerId === p.id;
      })
    : null;

  return (
    <div className="w-full">
      {isCompleted && overallWinner && (
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-2xl font-bold text-yellow-400">{overallWinner.playerName} wins!</p>
          <p className="text-slate-400 mt-1">Tournament complete</p>
        </div>
      )}

      {/* Winners Bracket */}
      <div>
        {tournament.format === 'double-elimination' && (
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Winners Bracket
          </h3>
        )}
        <div className="flex gap-8 overflow-x-auto pb-4">
          {winnersRounds.map((roundMatches, idx) => {
            const round = idx + 1;
            const isGrandFinal = tournament.format === 'double-elimination' && round === maxWinnersRound;
            return (
              <div key={round} className="flex flex-col shrink-0">
                <div className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
                  {isGrandFinal
                    ? 'Grand Final'
                    : round === maxWinnersRound && tournament.format === 'single-elimination'
                    ? 'Final'
                    : `Round ${round}`}
                </div>
                <div
                  className="flex flex-col gap-4"
                  style={{ marginTop: `${(Math.pow(2, idx) - 1) * 28}px` }}
                >
                  {roundMatches.map((match) => (
                    <div key={match.id} style={{ marginBottom: `${(Math.pow(2, idx) - 1) * 28}px` }}>
                      <BracketMatch
                        match={match}
                        participants={participants}
                        myParticipantId={myParticipantId}
                        tournamentId={tournament.id}
                        onStartMatch={handleStartMatch}
                        starting={startingMatchId === match.id}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Losers Bracket (double elimination only) */}
      {losersRounds.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Losers Bracket
          </h3>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {losersRounds.map((roundMatches, idx) => {
              const round = idx + 1;
              return (
                <div key={round} className="flex flex-col shrink-0">
                  <div className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
                    {round === maxLosersRound ? 'Losers Final' : `L-Round ${round}`}
                  </div>
                  <div className="flex flex-col gap-4">
                    {roundMatches.map((match) => (
                      <BracketMatch
                        key={match.id}
                        match={match}
                        participants={participants}
                        myParticipantId={myParticipantId}
                        tournamentId={tournament.id}
                        onStartMatch={handleStartMatch}
                        starting={startingMatchId === match.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
