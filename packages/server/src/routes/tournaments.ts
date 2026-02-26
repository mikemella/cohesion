import { Router, Request, Response } from 'express';
import type { GameType, TournamentFormat } from '@cohesion/shared';
import {
  createInitialState,
  createTTTInitialState,
  createDotsInitialState,
} from '@cohesion/shared';
import { getIO } from '../websocket/socket.js';
import * as store from '../db/store.js';
import * as tournamentStore from '../db/tournament-store.js';

const router = Router();

// Create tournament
router.post('/', async (req: Request, res: Response) => {
  const { hostName, tournamentName, gameType, format } = req.body;
  const sessionId = req.headers['x-session-id'] as string;

  if (!hostName || typeof hostName !== 'string' || !hostName.trim()) {
    res.status(400).json({ error: 'hostName is required' });
    return;
  }
  if (!tournamentName || typeof tournamentName !== 'string' || !tournamentName.trim()) {
    res.status(400).json({ error: 'tournamentName is required' });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: 'X-Session-Id header is required' });
    return;
  }

  const validTypes: GameType[] = ['connect-four', 'tic-tac-toe', 'dots'];
  if (!validTypes.includes(gameType)) {
    res.status(400).json({ error: `Invalid gameType. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const validFormats: TournamentFormat[] = ['single-elimination', 'double-elimination'];
  if (!validFormats.includes(format)) {
    res.status(400).json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
    return;
  }

  try {
    const tournament = await tournamentStore.createTournament(
      tournamentName.trim(),
      gameType as GameType,
      format as TournamentFormat,
      sessionId
    );

    // Add the host as the first participant
    const participant = await tournamentStore.addParticipant(
      tournament.id,
      hostName.trim(),
      sessionId
    );

    res.status(201).json({ tournament, participant });
  } catch (err) {
    console.error('Failed to create tournament:', err);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get tournament details
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const details = await tournamentStore.getTournamentWithDetails(req.params.id);
    if (!details) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    res.json(details);
  } catch (err) {
    console.error('Failed to get tournament:', err);
    res.status(500).json({ error: 'Failed to get tournament' });
  }
});

// Join tournament
router.post('/:id/join', async (req: Request<{ id: string }>, res: Response) => {
  const { playerName } = req.body;
  const sessionId = req.headers['x-session-id'] as string;

  if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: 'X-Session-Id header is required' });
    return;
  }

  try {
    const details = await tournamentStore.getTournamentWithDetails(req.params.id);
    if (!details) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (details.tournament.status !== 'waiting') {
      res.status(400).json({ error: 'Tournament has already started' });
      return;
    }

    // Check if already joined
    const existing = await tournamentStore.getParticipantBySession(req.params.id, sessionId);
    if (existing) {
      res.json({ participant: existing, tournament: details.tournament });
      return;
    }

    const participant = await tournamentStore.addParticipant(
      req.params.id,
      playerName.trim(),
      sessionId
    );

    const io = getIO();
    io.to(`tournament:${req.params.id}`).emit('participantJoined', {
      tournamentId: req.params.id,
      participant,
    });

    res.status(201).json({ participant, tournament: details.tournament });
  } catch (err) {
    console.error('Failed to join tournament:', err);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Launch tournament (host only)
router.post('/:id/launch', async (req: Request<{ id: string }>, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;

  if (!sessionId) {
    res.status(400).json({ error: 'X-Session-Id header is required' });
    return;
  }

  try {
    const tournament = await tournamentStore.getTournament(req.params.id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.hostSessionId !== sessionId) {
      res.status(403).json({ error: 'Only the host can launch the tournament' });
      return;
    }
    if (tournament.status !== 'waiting') {
      res.status(400).json({ error: 'Tournament has already been launched' });
      return;
    }

    const details = await tournamentStore.getTournamentWithDetails(req.params.id);
    if (!details || details.participants.length < 2) {
      res.status(400).json({ error: 'At least 2 participants are required to launch' });
      return;
    }

    const launched = await tournamentStore.launchTournament(req.params.id);

    const io = getIO();
    io.to(`tournament:${req.params.id}`).emit('tournamentUpdated', launched);

    res.json(launched);
  } catch (err) {
    console.error('Failed to launch tournament:', err);
    res.status(500).json({ error: 'Failed to launch tournament' });
  }
});

// Start a specific match (create the game)
router.post(
  '/:id/matches/:matchId/start',
  async (req: Request<{ id: string; matchId: string }>, res: Response) => {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      res.status(400).json({ error: 'X-Session-Id header is required' });
      return;
    }

    try {
      const match = await tournamentStore.getMatch(req.params.matchId);
      if (!match || match.tournamentId !== req.params.id) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }
      if (match.status !== 'pending') {
        // Already started — return existing game if there is one
        if (match.gameId) {
          const game = store.getGame(match.gameId);
          res.json({ match, game });
          return;
        }
        res.status(400).json({ error: 'Match is not in a startable state' });
        return;
      }
      if (!match.player1ParticipantId || !match.player2ParticipantId) {
        res.status(400).json({ error: 'Both players must be assigned before starting a match' });
        return;
      }

      // Verify the requester is one of the participants
      const details = await tournamentStore.getTournamentWithDetails(req.params.id);
      if (!details) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      const myParticipant = details.participants.find((p) => p.sessionId === sessionId);
      const isPlayer =
        myParticipant &&
        (myParticipant.id === match.player1ParticipantId ||
          myParticipant.id === match.player2ParticipantId);

      if (!isPlayer) {
        res.status(403).json({ error: 'You are not a player in this match' });
        return;
      }

      const player1 = details.participants.find((p) => p.id === match.player1ParticipantId)!;
      const player2 = details.participants.find((p) => p.id === match.player2ParticipantId)!;

      const initialState =
        details.tournament.gameType === 'tic-tac-toe'
          ? createTTTInitialState()
          : details.tournament.gameType === 'dots'
          ? createDotsInitialState()
          : createInitialState();

      const game = store.createGame(
        player1.playerName,
        details.tournament.gameType,
        initialState
      );

      // Atomically set game_id on the match (prevents race condition)
      const updatedMatch = await tournamentStore.startMatch(match.id, game.id);
      if (!updatedMatch) {
        // Another request already started it — find and return the existing game
        const existingMatch = await tournamentStore.getMatch(match.id);
        if (existingMatch?.gameId) {
          const existingGame = store.getGame(existingMatch.gameId);
          res.json({ match: existingMatch, game: existingGame });
          return;
        }
        res.status(409).json({ error: 'Match was already started by another request' });
        return;
      }

      // Auto-join player2 to the game
      store.joinGame(game.id, player2.playerName);

      const updatedDetails = await tournamentStore.getTournamentWithDetails(req.params.id);
      const io = getIO();
      io.to(`tournament:${req.params.id}`).emit('tournamentUpdated', updatedDetails!);

      res.status(201).json({ match: updatedMatch, game: store.getGame(game.id) });
    } catch (err) {
      console.error('Failed to start match:', err);
      res.status(500).json({ error: 'Failed to start match' });
    }
  }
);

export default router;
