import { pool } from './pool.js';
import type {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  TournamentDetails,
  TournamentFormat,
  TournamentStatus,
  MatchStatus,
  BracketSide,
  GameType,
} from '@cohesion/shared';
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  advanceSingleElimination,
  advanceDoubleElimination,
} from '@cohesion/shared';

// ---- Row mappers ----

function rowToTournament(row: Record<string, unknown>): Tournament {
  return {
    id: row.id as string,
    name: row.name as string,
    gameType: row.game_type as GameType,
    format: row.format as TournamentFormat,
    status: row.status as TournamentStatus,
    hostSessionId: row.host_session_id as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

function rowToParticipant(row: Record<string, unknown>): TournamentParticipant {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    playerName: row.player_name as string,
    sessionId: row.session_id as string,
    seed: row.seed as number | null,
    joinedAt: (row.joined_at as Date).toISOString(),
  };
}

function rowToMatch(row: Record<string, unknown>): TournamentMatch {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    gameId: row.game_id as string | null,
    round: row.round as number,
    matchIndex: row.match_index as number,
    player1ParticipantId: row.player1_participant_id as string | null,
    player2ParticipantId: row.player2_participant_id as string | null,
    winnerId: row.winner_id as string | null,
    status: row.status as MatchStatus,
    bracket: row.bracket as BracketSide,
  };
}

// ---- Tournament CRUD ----

export async function createTournament(
  name: string,
  gameType: GameType,
  format: TournamentFormat,
  hostSessionId: string
): Promise<Tournament> {
  const result = await pool.query(
    `INSERT INTO tournaments (name, game_type, format, host_session_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, gameType, format, hostSessionId]
  );
  return rowToTournament(result.rows[0]);
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return rowToTournament(result.rows[0]);
}

export async function getTournamentWithDetails(id: string): Promise<TournamentDetails | null> {
  const tournament = await getTournament(id);
  if (!tournament) return null;

  const [pResult, mResult] = await Promise.all([
    pool.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = $1 ORDER BY joined_at',
      [id]
    ),
    pool.query(
      'SELECT * FROM tournament_matches WHERE tournament_id = $1 ORDER BY bracket, round, match_index',
      [id]
    ),
  ]);

  return {
    tournament,
    participants: pResult.rows.map(rowToParticipant),
    matches: mResult.rows.map(rowToMatch),
  };
}

// ---- Participants ----

export async function addParticipant(
  tournamentId: string,
  playerName: string,
  sessionId: string
): Promise<TournamentParticipant> {
  const result = await pool.query(
    `INSERT INTO tournament_participants (tournament_id, player_name, session_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [tournamentId, playerName, sessionId]
  );
  return rowToParticipant(result.rows[0]);
}

export async function getParticipantBySession(
  tournamentId: string,
  sessionId: string
): Promise<TournamentParticipant | null> {
  const result = await pool.query(
    'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND session_id = $2',
    [tournamentId, sessionId]
  );
  if (result.rows.length === 0) return null;
  return rowToParticipant(result.rows[0]);
}

// ---- Launch ----

export async function launchTournament(tournamentId: string): Promise<TournamentDetails> {
  // Get tournament and participants
  const details = await getTournamentWithDetails(tournamentId);
  if (!details) throw new Error('Tournament not found');

  const { tournament, participants } = details;

  // Assign seeds randomly
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const participantIds = shuffled.map((p) => p.id);

  // Update seeds in DB
  await Promise.all(
    shuffled.map((p, i) =>
      pool.query(
        'UPDATE tournament_participants SET seed = $1 WHERE id = $2',
        [i + 1, p.id]
      )
    )
  );

  // Generate bracket
  const matchTemplates =
    tournament.format === 'single-elimination'
      ? generateSingleEliminationBracket(tournamentId, participantIds)
      : generateDoubleEliminationBracket(tournamentId, participantIds);

  // Bulk insert matches
  for (const m of matchTemplates) {
    await pool.query(
      `INSERT INTO tournament_matches
         (tournament_id, round, match_index, bracket, player1_participant_id, player2_participant_id, winner_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        m.tournamentId,
        m.round,
        m.matchIndex,
        m.bracket,
        m.player1ParticipantId,
        m.player2ParticipantId,
        m.winnerId,
        m.status,
      ]
    );
  }

  // Set tournament status to active
  await pool.query(
    `UPDATE tournaments SET status = 'active', updated_at = NOW() WHERE id = $1`,
    [tournamentId]
  );

  // Auto-advance all bye matches so next-round player slots are populated immediately
  const launched = await getTournamentWithDetails(tournamentId);
  if (launched) {
    for (const match of launched.matches) {
      if (match.status === 'bye' && match.winnerId) {
        await advanceBracket(match, match.winnerId);
      }
    }
  }

  return (await getTournamentWithDetails(tournamentId))!;
}

// ---- Match Management ----

export async function getMatchByGameId(gameId: string): Promise<TournamentMatch | null> {
  const result = await pool.query(
    'SELECT * FROM tournament_matches WHERE game_id = $1',
    [gameId]
  );
  if (result.rows.length === 0) return null;
  return rowToMatch(result.rows[0]);
}

export async function startMatch(matchId: string, gameId: string): Promise<TournamentMatch | null> {
  // Atomic: only set game_id if it's still null (prevents duplicate game creation)
  const result = await pool.query(
    `UPDATE tournament_matches SET game_id = $1, status = 'active'
     WHERE id = $2 AND game_id IS NULL RETURNING *`,
    [gameId, matchId]
  );
  if (result.rows.length === 0) return null;
  return rowToMatch(result.rows[0]);
}

export async function getMatch(matchId: string): Promise<TournamentMatch | null> {
  const result = await pool.query('SELECT * FROM tournament_matches WHERE id = $1', [matchId]);
  if (result.rows.length === 0) return null;
  return rowToMatch(result.rows[0]);
}

export async function completeTournamentIfDone(tournamentId: string): Promise<void> {
  const mResult = await pool.query(
    `SELECT * FROM tournament_matches WHERE tournament_id = $1`,
    [tournamentId]
  );
  const matches = mResult.rows.map(rowToMatch);
  const allDone = matches.every((m) => m.status === 'completed' || m.status === 'bye');
  if (allDone) {
    await pool.query(
      `UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [tournamentId]
    );
  }
}

// ---- Bracket Advancement ----

export async function advanceBracket(
  completedMatch: TournamentMatch,
  winnerId: string
): Promise<TournamentDetails> {
  const details = await getTournamentWithDetails(completedMatch.tournamentId);
  if (!details) throw new Error('Tournament not found');

  const { tournament, matches } = details;

  // Attach IDs to in-memory matches (they already have IDs from DB)
  const updatedMatches =
    tournament.format === 'single-elimination'
      ? advanceSingleElimination(matches, completedMatch, winnerId)
      : advanceDoubleElimination(matches, completedMatch, winnerId);

  // Persist changes: update any matches that changed
  for (const match of updatedMatches) {
    const original = matches.find((m) => m.id === match.id);
    if (!original) continue;

    const changed =
      original.status !== match.status ||
      original.winnerId !== match.winnerId ||
      original.player1ParticipantId !== match.player1ParticipantId ||
      original.player2ParticipantId !== match.player2ParticipantId;

    if (changed) {
      await pool.query(
        `UPDATE tournament_matches
         SET status = $1, winner_id = $2, player1_participant_id = $3, player2_participant_id = $4
         WHERE id = $5`,
        [
          match.status,
          match.winnerId,
          match.player1ParticipantId,
          match.player2ParticipantId,
          match.id,
        ]
      );
    }
  }

  await completeTournamentIfDone(completedMatch.tournamentId);

  return (await getTournamentWithDetails(completedMatch.tournamentId))!;
}
