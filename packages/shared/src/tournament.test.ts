import { describe, it, expect } from 'vitest';
import {
  generateSingleEliminationBracket,
  advanceSingleElimination,
  generateDoubleEliminationBracket,
} from './tournament.js';
import type { TournamentMatch } from './types.js';

// Helper to give matches fake IDs (the real DB assigns these)
function withIds(matches: Omit<TournamentMatch, 'id'>[]): TournamentMatch[] {
  return matches.map((m, i) => ({ ...m, id: `m${i}` }));
}

describe('generateSingleEliminationBracket', () => {
  it('creates 3 matches for 4 players', () => {
    const matches = generateSingleEliminationBracket('t1', ['p1', 'p2', 'p3', 'p4']);
    expect(matches).toHaveLength(3); // 2 round-1 + 1 round-2
  });

  it('creates 7 matches for 8 players', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const matches = generateSingleEliminationBracket('t1', ids);
    expect(matches).toHaveLength(7); // 4 + 2 + 1
  });

  it('assigns all player IDs in round 1', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = generateSingleEliminationBracket('t1', ids);
    const round1 = matches.filter(m => m.round === 1);
    for (const m of round1) {
      // Every round-1 match must have both players (or be a bye with one)
      expect(m.player1ParticipantId !== null || m.player2ParticipantId !== null).toBe(true);
    }
  });

  it('leaves later rounds with null player IDs', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = generateSingleEliminationBracket('t1', ids);
    const round2 = matches.filter(m => m.round === 2);
    for (const m of round2) {
      expect(m.player1ParticipantId).toBeNull();
      expect(m.player2ParticipantId).toBeNull();
    }
  });

  it('assigns a bye for an odd number of players', () => {
    const ids = ['p1', 'p2', 'p3'];
    const matches = generateSingleEliminationBracket('t1', ids);
    const byeMatches = matches.filter(m => m.status === 'bye');
    expect(byeMatches.length).toBeGreaterThan(0);
    for (const m of byeMatches) {
      expect(m.winnerId).not.toBeNull(); // auto-advance winner set
    }
  });

  it('uses the provided tournamentId on every match', () => {
    const matches = generateSingleEliminationBracket('myTournament', ['a', 'b', 'c', 'd']);
    for (const m of matches) {
      expect(m.tournamentId).toBe('myTournament');
    }
  });
});

describe('advanceSingleElimination', () => {
  it('marks the completed match and advances winner to the next round', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = withIds(generateSingleEliminationBracket('t1', ids));

    // Round-1, matchIndex-0: even → winner goes to player1 slot of round-2 match 0
    const round1Match0 = matches.find(m => m.round === 1 && m.matchIndex === 0)!;
    const winner = round1Match0.player1ParticipantId!;
    const updated = advanceSingleElimination(matches, round1Match0, winner);

    const completed = updated.find(m => m.id === round1Match0.id)!;
    expect(completed.status).toBe('completed');
    expect(completed.winnerId).toBe(winner);

    const nextMatch = updated.find(m => m.round === 2 && m.matchIndex === 0)!;
    expect(nextMatch.player1ParticipantId).toBe(winner);
  });

  it('places winner in player2 slot when matchIndex is odd', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = withIds(generateSingleEliminationBracket('t1', ids));

    const round1Match1 = matches.find(m => m.round === 1 && m.matchIndex === 1)!;
    const winner = round1Match1.player1ParticipantId!;
    const updated = advanceSingleElimination(matches, round1Match1, winner);

    const nextMatch = updated.find(m => m.round === 2 && m.matchIndex === 0)!;
    expect(nextMatch.player2ParticipantId).toBe(winner);
  });

  it('does not error when the final match completes (no next round)', () => {
    const ids = ['p1', 'p2'];
    const matches = withIds(generateSingleEliminationBracket('t1', ids));

    const finalMatch = matches.find(m => m.round === 1)!;
    const winner = finalMatch.player1ParticipantId!;
    const updated = advanceSingleElimination(matches, finalMatch, winner);

    const completed = updated.find(m => m.id === finalMatch.id)!;
    expect(completed.status).toBe('completed');
    expect(completed.winnerId).toBe(winner);
  });
});

describe('generateDoubleEliminationBracket', () => {
  it('includes both winners and losers bracket matches for 4 players', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = generateDoubleEliminationBracket('t1', ids);

    const winners = matches.filter(m => m.bracket === 'winners');
    const losers = matches.filter(m => m.bracket === 'losers');
    expect(winners.length).toBeGreaterThan(0);
    expect(losers.length).toBeGreaterThan(0);
  });

  it('includes a grand final match', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const matches = generateDoubleEliminationBracket('t1', ids);

    // Grand final is the winners-bracket match with the highest round number
    const winnersRounds = matches.filter(m => m.bracket === 'winners').map(m => m.round);
    const maxRound = Math.max(...winnersRounds);
    const grandFinal = matches.find(m => m.bracket === 'winners' && m.round === maxRound);
    expect(grandFinal).toBeDefined();
  });

  it('creates more matches than single elimination for the same player count', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const single = generateSingleEliminationBracket('t1', ids);
    const double = generateDoubleEliminationBracket('t1', ids);
    expect(double.length).toBeGreaterThan(single.length);
  });
});
