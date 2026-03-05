import { createRequire } from 'module';
import { Router, Request, Response } from 'express';
import {
  createInitialState, applyMove, isValidMove,
  createTTTInitialState, applyTTTMove, isTTTValidMove,
  createDotsInitialState, applyDotsMove, isDotsValidMove,
  createBattleshipInitialState, isValidPlacement, isValidShot, applyShot,
  createWordHuntInitialState, applyWordHuntSubmission, isSubmissionExpired,
} from '@cohesion/shared';
import type {
  GameType,
  ConnectFourState,
  TicTacToeState,
  DotsState,
  BattleshipState,
  BattleshipShip,
  WordHuntState,
} from '@cohesion/shared';
import { getIO } from '../websocket/socket.js';
import * as store from '../db/store.js';
import * as tournamentStore from '../db/tournament-store.js';

// Load English dictionary at startup using createRequire (JSON package in ESM context)
const _require = createRequire(import.meta.url);
const wordList: string[] = _require('an-array-of-english-words');
const dictionary = new Set(wordList.map((w) => w.toUpperCase()));

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

  const validTypes: GameType[] = ['connect-four', 'tic-tac-toe', 'dots', 'battleship', 'word-hunt'];
  if (!validTypes.includes(gameType)) {
    res.status(400).json({ error: `Invalid gameType. Must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const initialState =
    gameType === 'tic-tac-toe' ? createTTTInitialState() :
    gameType === 'dots' ? createDotsInitialState() :
    gameType === 'battleship' ? createBattleshipInitialState() :
    gameType === 'word-hunt' ? createWordHuntInitialState() :
    createInitialState();

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

// Place Battleship fleet (separate from /move — simultaneous, data-heavy)
router.post('/:id/place', async (req: Request<{ id: string }>, res: Response) => {
  const gameId = req.params.id;
  const { playerNumber, ships } = req.body;

  if (playerNumber !== 1 && playerNumber !== 2) {
    res.status(400).json({ error: 'playerNumber must be 1 or 2' });
    return;
  }

  const game = store.getGame(gameId);
  if (!game || game.status !== 'active') {
    res.status(404).json({ error: 'Game not found or not active' });
    return;
  }

  if (game.gameType !== 'battleship') {
    res.status(400).json({ error: 'This endpoint is only for battleship games' });
    return;
  }

  const state = game.state as BattleshipState;
  if (state.phase !== 'placing') {
    res.status(400).json({ error: 'Fleet has already been placed' });
    return;
  }

  const playerReady = playerNumber === 1 ? state.player1Ready : state.player2Ready;
  if (playerReady) {
    res.status(400).json({ error: 'You have already placed your fleet' });
    return;
  }

  if (!Array.isArray(ships) || !isValidPlacement(ships as BattleshipShip[])) {
    res.status(400).json({ error: 'Invalid fleet placement' });
    return;
  }

  store.saveBattleshipPlacement(gameId, playerNumber, ships as BattleshipShip[]);

  const newState: BattleshipState = {
    ...state,
    player1Ready: playerNumber === 1 ? true : state.player1Ready,
    player2Ready: playerNumber === 2 ? true : state.player2Ready,
  };

  if (newState.player1Ready && newState.player2Ready) {
    newState.phase = 'playing';
    newState.currentPlayer = 1;
  }

  const updatedGame = store.updateGame(gameId, { state: newState })!;

  const io = getIO();
  io.to(`game:${gameId}`).emit('gameUpdated', updatedGame);

  res.json(updatedGame);
});

// Word Hunt: start a player's personal turn timer
router.post('/:id/start-turn', async (req: Request<{ id: string }>, res: Response) => {
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

  if (game.gameType !== 'word-hunt') {
    res.status(400).json({ error: 'This endpoint is only for word-hunt games' });
    return;
  }

  const state = game.state as WordHuntState;
  const alreadyStarted = playerNumber === 1 ? state.player1StartedAt : state.player2StartedAt;
  if (alreadyStarted) {
    res.status(400).json({ error: 'Turn already started' });
    return;
  }

  const newState: WordHuntState = {
    ...state,
    player1StartedAt: playerNumber === 1 ? new Date().toISOString() : state.player1StartedAt,
    player2StartedAt: playerNumber === 2 ? new Date().toISOString() : state.player2StartedAt,
  };

  const updatedGame = store.updateGame(gameId, { state: newState })!;
  const io = getIO();
  io.to(`game:${gameId}`).emit('gameUpdated', updatedGame);

  res.json(updatedGame);
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

  // Word Hunt is simultaneous — skip turn guard
  const isTurnBased = game.gameType !== 'word-hunt';
  if (isTurnBased && game.currentTurn !== playerNumber) {
    res.status(400).json({ error: 'Not your turn' });
    return;
  }

  let result: { state: any; isWin: boolean; isDraw: boolean };
  let moveData: Record<string, number>;

  if (game.gameType === 'battleship') {
    const { row, col } = req.body;
    if (typeof row !== 'number' || typeof col !== 'number') {
      res.status(400).json({ error: 'row and col are required for battleship' });
      return;
    }

    const state = game.state as BattleshipState;
    if (state.phase !== 'playing') {
      res.status(400).json({ error: 'Game is still in placement phase' });
      return;
    }

    if (!isValidShot(state, playerNumber, row, col)) {
      res.status(400).json({ error: 'Invalid shot' });
      return;
    }

    const placements = store.getBattleshipPlacements(gameId);
    if (!placements) {
      res.status(500).json({ error: 'Ship placements not found' });
      return;
    }

    const targetShips = playerNumber === 1 ? placements.player2 : placements.player1;
    if (!targetShips) {
      res.status(400).json({ error: 'Opponent has not placed their fleet yet' });
      return;
    }

    const shotResult = applyShot(state, playerNumber, row, col, targetShips);
    result = { state: shotResult.state, isWin: shotResult.isWin, isDraw: false };
    moveData = { row, col };

  } else if (game.gameType === 'word-hunt') {
    const { words } = req.body;
    if (!Array.isArray(words)) {
      res.status(400).json({ error: 'words array required for word-hunt' });
      return;
    }

    const state = game.state as WordHuntState;

    const playerResult = playerNumber === 1 ? state.player1 : state.player2;
    if (playerResult.submittedAt !== null) {
      res.status(400).json({ error: 'Already submitted' });
      return;
    }

    const playerStartedAt = playerNumber === 1 ? state.player1StartedAt : state.player2StartedAt;
    if (!playerStartedAt) {
      res.status(400).json({ error: 'You have not started your turn yet' });
      return;
    }
    if (isSubmissionExpired(playerStartedAt)) {
      res.status(400).json({ error: 'Submission window has closed' });
      return;
    }

    const submissionResult = applyWordHuntSubmission(state, playerNumber, words, dictionary);
    result = submissionResult;
    const playerRes = playerNumber === 1 ? submissionResult.state.player1 : submissionResult.state.player2;
    moveData = {
      playerNumber,
      wordCount: playerRes.words.length,
      score: playerRes.totalScore,
    };

  } else if (game.gameType === 'dots') {
    const { orientation, row, col } = req.body;
    if (typeof orientation !== 'number' || typeof row !== 'number' || typeof col !== 'number') {
      res.status(400).json({ error: 'orientation, row, and col are required for dots' });
      return;
    }
    const state = game.state as DotsState;
    if (!isDotsValidMove(state, orientation, row, col)) {
      res.status(400).json({ error: 'Invalid move' });
      return;
    }
    const dotsResult = applyDotsMove(state, orientation, row, col);
    result = dotsResult;
    moveData = { orientation, row, col };

  } else if (game.gameType === 'tic-tac-toe') {
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
    if (game.gameType === 'dots') {
      winner = result.state.currentPlayer;
    } else if (game.gameType === 'word-hunt') {
      winner = result.state.currentPlayer; // set to winner in applyWordHuntSubmission
    } else {
      winner = playerNumber;
    }
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

    // Tournament bracket advancement hook
    if (result.isWin && winner !== null) {
      try {
        const match = await tournamentStore.getMatchByGameId(gameId);
        if (match) {
          const winnerParticipantId =
            winner === 1 ? match.player1ParticipantId : match.player2ParticipantId;
          if (winnerParticipantId) {
            const updatedDetails = await tournamentStore.advanceBracket(match, winnerParticipantId);
            io.to(`tournament:${match.tournamentId}`).emit('tournamentUpdated', updatedDetails);
          }
        }
      } catch (err) {
        console.error('Tournament bracket advancement failed:', err);
      }
    }
  }

  res.json(updatedGame);
});

export default router;
