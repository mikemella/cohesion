import type { TournamentMatch, MatchStatus, BracketSide } from './types.js';

// ---- Helpers ----

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMatch(
  tournamentId: string,
  round: number,
  matchIndex: number,
  bracket: BracketSide,
  p1: string | null,
  p2: string | null,
  status: MatchStatus = 'pending',
  winnerId: string | null = null
): Omit<TournamentMatch, 'id'> {
  return {
    tournamentId,
    gameId: null,
    round,
    matchIndex,
    bracket,
    player1ParticipantId: p1,
    player2ParticipantId: p2,
    winnerId,
    status,
  };
}

// ---- Single Elimination ----

export function generateSingleEliminationBracket(
  tournamentId: string,
  participantIds: string[]
): Omit<TournamentMatch, 'id'>[] {
  const shuffled = shuffle(participantIds);
  const slots = nextPowerOfTwo(shuffled.length);
  const padded: (string | null)[] = [...shuffled];
  while (padded.length < slots) padded.push(null);

  const matches: Omit<TournamentMatch, 'id'>[] = [];
  const totalRounds = Math.log2(slots);

  // Round 1: pair up seeded slots
  for (let i = 0; i < slots; i += 2) {
    const p1 = padded[i];
    const p2 = padded[i + 1];
    const matchIndex = i / 2;

    if (p1 === null || p2 === null) {
      // Bye: the real player auto-advances
      const winner = p1 ?? p2;
      matches.push(makeMatch(tournamentId, 1, matchIndex, 'winners', p1, p2, 'bye', winner));
    } else {
      matches.push(makeMatch(tournamentId, 1, matchIndex, 'winners', p1, p2));
    }
  }

  // Placeholder matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = slots / Math.pow(2, round);
    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      matches.push(makeMatch(tournamentId, round, matchIndex, 'winners', null, null));
    }
  }

  return matches;
}

export function advanceSingleElimination(
  matches: TournamentMatch[],
  completedMatch: TournamentMatch,
  winnerId: string
): TournamentMatch[] {
  const updated = matches.map((m) => {
    if (m.id === completedMatch.id) {
      return { ...m, winnerId, status: 'completed' as MatchStatus };
    }
    return m;
  });

  // Find the next match in the bracket
  const nextRound = completedMatch.round + 1;
  const nextMatchIndex = Math.floor(completedMatch.matchIndex / 2);
  const isPlayer1Slot = completedMatch.matchIndex % 2 === 0;

  const nextMatch = updated.find(
    (m) =>
      m.bracket === 'winners' &&
      m.round === nextRound &&
      m.matchIndex === nextMatchIndex
  );

  if (!nextMatch) {
    // Tournament over (this was the final)
    return updated;
  }

  return updated.map((m) => {
    if (m.id === nextMatch.id) {
      return isPlayer1Slot
        ? { ...m, player1ParticipantId: winnerId }
        : { ...m, player2ParticipantId: winnerId };
    }
    return m;
  });
}

// ---- Double Elimination ----
//
// Schedule for up to 16 players (8-slot winners bracket):
//
// Winners bracket rounds: W1, W2, W3 (final)
// Losers bracket rounds:
//   L1  — W1 losers play each other (pairs within same W1 match group)
//   L2  — L1 winners vs W2 losers (cross-seeded)
//   L3  — L2 winners play each other
//   L4  — L3 winners vs W3 (winners final) loser
//   Grand Final — W-Final winner vs L4 winner
//
// NOTE: Grand final reset is omitted for MVP.

export function generateDoubleEliminationBracket(
  tournamentId: string,
  participantIds: string[]
): Omit<TournamentMatch, 'id'>[] {
  const shuffled = shuffle(participantIds);
  const slots = nextPowerOfTwo(shuffled.length);
  const padded: (string | null)[] = [...shuffled];
  while (padded.length < slots) padded.push(null);

  const matches: Omit<TournamentMatch, 'id'>[] = [];
  const winnersTotalRounds = Math.log2(slots);

  // Winners bracket (same as single elim)
  for (let i = 0; i < slots; i += 2) {
    const p1 = padded[i];
    const p2 = padded[i + 1];
    const matchIndex = i / 2;
    if (p1 === null || p2 === null) {
      const winner = p1 ?? p2;
      matches.push(makeMatch(tournamentId, 1, matchIndex, 'winners', p1, p2, 'bye', winner));
    } else {
      matches.push(makeMatch(tournamentId, 1, matchIndex, 'winners', p1, p2));
    }
  }

  for (let round = 2; round <= winnersTotalRounds; round++) {
    const count = slots / Math.pow(2, round);
    for (let idx = 0; idx < count; idx++) {
      matches.push(makeMatch(tournamentId, round, idx, 'winners', null, null));
    }
  }

  // Losers bracket placeholder matches
  // L-rounds go from 1 to 2*(winnersTotalRounds - 1)
  const losersRounds = 2 * (winnersTotalRounds - 1);
  for (let lRound = 1; lRound <= losersRounds; lRound++) {
    // Number of matches decreases: slots/4 in L1, then halves every 2 losers rounds
    const matchesInRound = Math.max(1, slots / 4 / Math.pow(2, Math.floor((lRound - 1) / 2)));
    for (let idx = 0; idx < matchesInRound; idx++) {
      matches.push(makeMatch(tournamentId, lRound, idx, 'losers', null, null));
    }
  }

  // Grand Final
  matches.push(makeMatch(tournamentId, winnersTotalRounds + 1, 0, 'winners', null, null));

  return matches;
}

export function advanceDoubleElimination(
  matches: TournamentMatch[],
  completedMatch: TournamentMatch,
  winnerId: string
): TournamentMatch[] {
  const loserId =
    completedMatch.player1ParticipantId === winnerId
      ? completedMatch.player2ParticipantId
      : completedMatch.player1ParticipantId;

  let updated = matches.map((m) => {
    if (m.id === completedMatch.id) {
      return { ...m, winnerId, status: 'completed' as MatchStatus };
    }
    return m;
  });

  const slots = nextPowerOfTwo(
    matches.filter((m) => m.bracket === 'winners' && m.round === 1).length * 2
  );
  const winnersTotalRounds = Math.log2(slots);

  if (completedMatch.bracket === 'winners') {
    // Advance winner in winners bracket
    const nextWRound = completedMatch.round + 1;
    const nextWIdx = Math.floor(completedMatch.matchIndex / 2);
    const isGrandFinal = completedMatch.round === winnersTotalRounds;

    if (!isGrandFinal) {
      const nextWMatch = updated.find(
        (m) => m.bracket === 'winners' && m.round === nextWRound && m.matchIndex === nextWIdx
      );
      if (nextWMatch) {
        const slot = completedMatch.matchIndex % 2 === 0 ? 'player1' : 'player2';
        updated = updated.map((m) =>
          m.id === nextWMatch.id
            ? { ...m, [`${slot}ParticipantId`]: winnerId }
            : m
        );
      }

      // Route loser to losers bracket
      // L-round corresponding to W-round r: lRound = 2*(r-1) + 1 for W-round 1, 2*(r-1) for W-round r>1
      if (loserId) {
        const lRound = completedMatch.round === 1
          ? 1
          : 2 * (completedMatch.round - 1);

        // For L-round 1 (from W-round 1 losers), matchIndex mirrors W match index
        // For later drop-ins, cross-seed into the appropriate slot
        const lMatchIdx = completedMatch.round === 1
          ? Math.floor(completedMatch.matchIndex / 2)
          : 0; // simplified: all later drop-ins go to slot 0 of the relevant L-round

        const lMatch = updated.find(
          (m) => m.bracket === 'losers' && m.round === lRound && m.matchIndex === lMatchIdx
        );
        if (lMatch) {
          const slot = lMatch.player1ParticipantId === null ? 'player1' : 'player2';
          updated = updated.map((m) =>
            m.id === lMatch.id
              ? { ...m, [`${slot}ParticipantId`]: loserId }
              : m
          );
        }
      }
    } else {
      // Winners final completed: advance to grand final as player1
      const grandFinal = updated.find(
        (m) => m.bracket === 'winners' && m.round === winnersTotalRounds + 1
      );
      if (grandFinal) {
        updated = updated.map((m) =>
          m.id === grandFinal.id ? { ...m, player1ParticipantId: winnerId } : m
        );
      }
      // Loser of winners final drops to losers bracket final
      if (loserId) {
        const lFinal = updated.find(
          (m) => m.bracket === 'losers' && m.round === 2 * (winnersTotalRounds - 1)
        );
        if (lFinal) {
          updated = updated.map((m) =>
            m.id === lFinal.id
              ? { ...m, player2ParticipantId: loserId }
              : m
          );
        }
      }
    }
  } else {
    // Losers bracket: advance winner within losers bracket
    const losersRounds = 2 * (winnersTotalRounds - 1);
    const isLosersFinal = completedMatch.round === losersRounds;

    if (!isLosersFinal) {
      const nextLRound = completedMatch.round + 1;
      const nextLIdx = Math.floor(completedMatch.matchIndex / 2);
      const nextLMatch = updated.find(
        (m) => m.bracket === 'losers' && m.round === nextLRound && m.matchIndex === nextLIdx
      );
      if (nextLMatch) {
        const slot = completedMatch.matchIndex % 2 === 0 ? 'player1' : 'player2';
        updated = updated.map((m) =>
          m.id === nextLMatch.id
            ? { ...m, [`${slot}ParticipantId`]: winnerId }
            : m
        );
      }
    } else {
      // Losers final winner advances to grand final as player2
      const grandFinal = updated.find(
        (m) => m.bracket === 'winners' && m.round === winnersTotalRounds + 1
      );
      if (grandFinal) {
        updated = updated.map((m) =>
          m.id === grandFinal.id ? { ...m, player2ParticipantId: winnerId } : m
        );
      }
    }
  }

  return updated;
}
