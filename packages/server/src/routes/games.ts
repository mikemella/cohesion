import { Router, Request, Response } from 'express';
import { createInitialState, applyMove, isValidMove } from '@cohesion/shared';
import type { ConnectFourState } from '@cohesion/shared';
import { getIO } from '../websocket/socket.js';
import * as store from '../db/store.js';

const router = Router();

// Get single game
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const game = store.getGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json(game);
});

// Create a new game
router.post('/', async (req: Request, res: Response) => {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const initialState = createInitialState();
  const game = store.createGame(playerName.trim(), initialState);
  res.status(201).json(game);
});

// Join a game
router.post('/:id/join', async (req: Request<{ id: string }>, res: Response) => {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const game = store.joinGame(req.params.id, playerName.trim());
  if (!game) {
    res.status(404).json({ error: 'Game not found or not joinable' });
    return;
  }

  const io = getIO();
  io.to(`game:${game.id}`).emit('gameUpdated', game);
  io.to(`game:${game.id}`).emit('playerJoined', {
    gameId: game.id,
    playerName: playerName.trim(),
  });

  res.json(game);
});

// Make a move
router.post('/:id/move', async (req: Request<{ id: string }>, res: Response) => {
  const gameId = req.params.id;
  const { column, playerNumber } = req.body;

  if (typeof column !== 'number') {
    res.status(400).json({ error: 'column is required and must be a number' });
    return;
  }
  if (playerNumber !== 1 && playerNumber !== 2) {
    res.status(400).json({ error: 'playerNumber must be 1 or 2' });
    return;
  }

  const game = store.getGame(gameId);
  if (!game || game.status !== 'active') {
    res.status(404).json({ error: 'Game not found or not active' });
    return;
  }

  if (game.currentTurn !== playerNumber) {
    res.status(400).json({ error: 'Not your turn' });
    return;
  }

  if (!isValidMove(game.state.board, column)) {
    res.status(400).json({ error: 'Invalid move' });
    return;
  }

  const result = applyMove(game.state, column);
  const move = store.recordMove(gameId, playerNumber, column);

  let newStatus: 'active' | 'completed' = 'active';
  let winner: 1 | 2 | null = null;

  if (result.isWin) {
    newStatus = 'completed';
    winner = playerNumber;
  } else if (result.isDraw) {
    newStatus = 'completed';
  }

  const updatedGame = store.updateGame(gameId, {
    state: result.state,
    status: newStatus,
    currentTurn: result.state.currentPlayer,
    winner,
    isDraw: result.isDraw,
  })!;

  const io = getIO();
  io.to(`game:${gameId}`).emit('moveMade', {
    gameId,
    move,
    game: updatedGame,
  });

  if (result.isWin || result.isDraw) {
    io.to(`game:${gameId}`).emit('gameOver', {
      gameId,
      winner,
      isDraw: result.isDraw,
    });
  }

  res.json(updatedGame);
});

export default router;
