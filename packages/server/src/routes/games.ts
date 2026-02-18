import { Router, Request, Response } from 'express';
import {
  createInitialState, applyMove, isValidMove,
  createTTTInitialState, applyTTTMove, isTTTValidMove,
} from '@cohesion/shared';
import type { GameType, ConnectFourState, TicTacToeState } from '@cohesion/shared';
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
  const { playerName, gameType = 'connect-four' } = req.body;
  if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
    res.status(400).json({ error: 'playerName is required' });
    return;
  }

  const validTypes: GameType[] = ['connect-four', 'tic-tac-toe'];
  if (!validTypes.includes(gameType)) {
    res.status(400).json({ error: `Invalid gameType. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const initialState = gameType === 'tic-tac-toe' ? createTTTInitialState() : createInitialState();
  const game = store.createGame(playerName.trim(), gameType, initialState);
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
  const { playerNumber } = req.body;

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

  let result: { state: any; isWin: boolean; isDraw: boolean };
  let moveData: Record<string, number>;

  if (game.gameType === 'tic-tac-toe') {
    const { row, col } = req.body;
    if (typeof row !== 'number' || typeof col !== 'number') {
      res.status(400).json({ error: 'row and col are required for tic-tac-toe' });
      return;
    }
    const state = game.state as TicTacToeState;
    if (!isTTTValidMove(state.board, row, col)) {
      res.status(400).json({ error: 'Invalid move' });
      return;
    }
    result = applyTTTMove(state, row, col);
    moveData = { row, col };
  } else {
    const { column } = req.body;
    if (typeof column !== 'number') {
      res.status(400).json({ error: 'column is required for connect-four' });
      return;
    }
    const state = game.state as ConnectFourState;
    if (!isValidMove(state.board, column)) {
      res.status(400).json({ error: 'Invalid move' });
      return;
    }
    result = applyMove(state, column);
    moveData = { column };
  }

  const move = store.recordMove(gameId, playerNumber, moveData);

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
