import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { createInitialState, applyMove, isValidMove } from '@cohesion/shared';
import type { Game, ConnectFourState } from '@cohesion/shared';
import { getIO } from '../websocket/socket.js';

const router = Router();

function buildGameResponse(row: any): Game {
  return {
    id: row.id,
    gameType: row.game_type,
    status: row.status,
    player1Name: row.player1_name,
    player2Name: row.player2_name,
    currentTurn: row.current_turn,
    winner: row.winner,
    isDraw: row.is_draw,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Get single game
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(buildGameResponse(result.rows[0]));
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new game
router.post('/', async (req: Request, res: Response) => {
  try {
    const { playerName } = req.body;
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      res.status(400).json({ error: 'playerName is required' });
      return;
    }

    const initialState = createInitialState();
    const result = await pool.query(
      `INSERT INTO games (game_type, status, player1_name, current_turn, state)
       VALUES ('connect-four', 'waiting', $1, 1, $2)
       RETURNING *`,
      [playerName.trim(), JSON.stringify(initialState)]
    );

    res.status(201).json(buildGameResponse(result.rows[0]));
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a game
router.post('/:id/join', async (req: Request, res: Response) => {
  const gameId = req.params.id;
  const client = await pool.connect();
  try {
    const { playerName } = req.body;
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      res.status(400).json({ error: 'playerName is required' });
      return;
    }

    await client.query('BEGIN');

    const gameResult = await client.query(
      'SELECT * FROM games WHERE id = $1 AND status = $2 FOR UPDATE',
      [gameId, 'waiting']
    );

    if (gameResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Game not found or not joinable' });
      return;
    }

    await client.query(
      `UPDATE games SET player2_name = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
      [playerName.trim(), gameId]
    );

    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const game = buildGameResponse(updated.rows[0]);

    const io = getIO();
    io.to(`game:${game.id}`).emit('gameUpdated', game);
    io.to(`game:${game.id}`).emit('playerJoined', {
      gameId: game.id,
      playerName: playerName.trim(),
    });

    res.json(game);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Join game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Make a move
router.post('/:id/move', async (req: Request, res: Response) => {
  const gameId = req.params.id as string;
  const client = await pool.connect();
  try {
    const { column, playerNumber } = req.body;
    if (typeof column !== 'number') {
      res.status(400).json({ error: 'column is required and must be a number' });
      return;
    }
    if (playerNumber !== 1 && playerNumber !== 2) {
      res.status(400).json({ error: 'playerNumber must be 1 or 2' });
      return;
    }

    await client.query('BEGIN');

    const gameResult = await client.query(
      'SELECT * FROM games WHERE id = $1 AND status = $2 FOR UPDATE',
      [gameId, 'active']
    );

    if (gameResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Game not found or not active' });
      return;
    }

    const game = gameResult.rows[0];

    if (game.current_turn !== playerNumber) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Not your turn' });
      return;
    }

    const state = game.state as ConnectFourState;

    if (!isValidMove(state.board, column)) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Invalid move' });
      return;
    }

    const result = applyMove(state, column);

    const moveCountResult = await client.query(
      'SELECT COUNT(*) as count FROM moves WHERE game_id = $1',
      [gameId]
    );
    const moveNumber = parseInt(moveCountResult.rows[0].count) + 1;

    const moveResult = await client.query(
      `INSERT INTO moves (game_id, player_number, move_number, move_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [gameId, playerNumber, moveNumber, JSON.stringify({ column })]
    );

    let newStatus = 'active';
    let winner: number | null = null;

    if (result.isWin) {
      newStatus = 'completed';
      winner = playerNumber;
    } else if (result.isDraw) {
      newStatus = 'completed';
    }

    await client.query(
      `UPDATE games SET state = $1, status = $2, current_turn = $3,
       winner = $4, is_draw = $5, updated_at = NOW()
       WHERE id = $6`,
      [
        JSON.stringify(result.state),
        newStatus,
        result.state.currentPlayer,
        winner,
        result.isDraw,
        gameId,
      ]
    );

    await client.query('COMMIT');

    const updatedGame = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const gameResponse = buildGameResponse(updatedGame.rows[0]);

    const io = getIO();
    const moveData = {
      id: moveResult.rows[0].id,
      gameId,
      playerNumber: playerNumber as 1 | 2,
      moveNumber,
      moveData: { column },
      createdAt: moveResult.rows[0].created_at,
    };

    io.to(`game:${gameId}`).emit('moveMade', {
      gameId,
      move: moveData,
      game: gameResponse,
    });

    if (result.isWin || result.isDraw) {
      io.to(`game:${gameId}`).emit('gameOver', {
        gameId,
        winner: winner as 1 | 2 | null,
        isDraw: result.isDraw,
      });
    }

    res.json(gameResponse);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Move error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
