import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { createInitialState, applyMove, isValidMove } from '@cohesion/shared';
import type { Game, GamePlayer, ConnectFourState } from '@cohesion/shared';
import { getIO } from '../websocket/socket.js';

const router = Router();

router.use(authMiddleware);

function buildGameResponse(gameRow: any, participants: any[]): Game {
  const players: GamePlayer[] = participants.map((p) => ({
    userId: p.user_id,
    username: p.username,
    displayName: p.display_name,
    playerNumber: p.player_number,
  }));

  return {
    id: gameRow.id,
    gameType: gameRow.game_type,
    status: gameRow.status,
    players,
    currentTurnUserId: gameRow.current_turn_user_id,
    winnerId: gameRow.winner_id,
    isDraw: gameRow.is_draw,
    state: gameRow.state,
    createdAt: gameRow.created_at,
    updatedAt: gameRow.updated_at,
  };
}

// List games (active + waiting)
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT g.*,
        json_agg(json_build_object(
          'user_id', gp.user_id, 'username', u.username,
          'display_name', u.display_name, 'player_number', gp.player_number
        )) as participants
       FROM games g
       LEFT JOIN game_participants gp ON g.id = gp.game_id
       LEFT JOIN users u ON gp.user_id = u.id
       WHERE g.status IN ('waiting', 'active')
       GROUP BY g.id
       ORDER BY g.updated_at DESC
       LIMIT 50`
    );

    const games = result.rows.map((row) => {
      const participants = row.participants[0]?.user_id ? row.participants : [];
      return buildGameResponse(row, participants);
    });

    res.json(games);
  } catch (err) {
    console.error('List games error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single game
router.get('/:id', async (req: Request, res: Response) => {
  const gameId = req.params.id as string;
  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    if (gameResult.rows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const participantsResult = await pool.query(
      `SELECT gp.*, u.username, u.display_name FROM game_participants gp
       JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1
       ORDER BY gp.player_number`,
      [gameId]
    );

    res.json(buildGameResponse(gameResult.rows[0], participantsResult.rows));
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new game
router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const initialState = createInitialState();
    const gameResult = await client.query(
      `INSERT INTO games (game_type, status, state, current_turn_user_id)
       VALUES ('connect-four', 'waiting', $1, $2)
       RETURNING *`,
      [JSON.stringify(initialState), req.user!.userId]
    );

    const game = gameResult.rows[0];

    await client.query(
      `INSERT INTO game_participants (game_id, user_id, player_number)
       VALUES ($1, $2, 1)`,
      [game.id, req.user!.userId]
    );

    await client.query('COMMIT');

    const participantsResult = await pool.query(
      `SELECT gp.*, u.username, u.display_name FROM game_participants gp
       JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1`,
      [game.id]
    );

    res.status(201).json(buildGameResponse(game, participantsResult.rows));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Join a game
router.post('/:id/join', async (req: Request, res: Response) => {
  const gameId = req.params.id as string;
  const client = await pool.connect();
  try {
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

    const existing = await client.query(
      'SELECT id FROM game_participants WHERE game_id = $1 AND user_id = $2',
      [gameId, req.user!.userId]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Already in this game' });
      return;
    }

    await client.query(
      `INSERT INTO game_participants (game_id, user_id, player_number)
       VALUES ($1, $2, 2)`,
      [gameId, req.user!.userId]
    );

    await client.query(
      `UPDATE games SET status = 'active', updated_at = NOW() WHERE id = $1`,
      [gameId]
    );

    await client.query('COMMIT');

    const updatedGame = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const participants = await pool.query(
      `SELECT gp.*, u.username, u.display_name FROM game_participants gp
       JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1
       ORDER BY gp.player_number`,
      [gameId]
    );

    const game = buildGameResponse(updatedGame.rows[0], participants.rows);

    // Notify via WebSocket
    const io = getIO();
    io.to(`game:${game.id}`).emit('gameUpdated', game);
    io.to(`game:${game.id}`).emit('playerJoined', {
      gameId: game.id,
      player: game.players.find((p) => p.userId === req.user!.userId)!,
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
    const { column } = req.body;
    if (typeof column !== 'number') {
      res.status(400).json({ error: 'column is required and must be a number' });
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

    if (game.current_turn_user_id !== req.user!.userId) {
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

    // Get move count
    const moveCountResult = await client.query(
      'SELECT COUNT(*) as count FROM moves WHERE game_id = $1',
      [gameId]
    );
    const moveNumber = parseInt(moveCountResult.rows[0].count) + 1;

    // Insert move
    const moveResult = await client.query(
      `INSERT INTO moves (game_id, user_id, move_number, move_data)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [gameId, req.user!.userId, moveNumber, JSON.stringify({ column })]
    );

    // Get next player's user_id
    const participants = await client.query(
      `SELECT gp.*, u.username, u.display_name FROM game_participants gp
       JOIN users u ON gp.user_id = u.id WHERE gp.game_id = $1
       ORDER BY gp.player_number`,
      [gameId]
    );

    const nextPlayerNumber = result.state.currentPlayer;
    const nextPlayer = participants.rows.find(
      (p: any) => p.player_number === nextPlayerNumber
    );

    let newStatus = 'active';
    let winnerId = null;

    if (result.isWin) {
      newStatus = 'completed';
      winnerId = req.user!.userId;
    } else if (result.isDraw) {
      newStatus = 'completed';
    }

    await client.query(
      `UPDATE games SET state = $1, status = $2, current_turn_user_id = $3,
       winner_id = $4, is_draw = $5, updated_at = NOW()
       WHERE id = $6`,
      [
        JSON.stringify(result.state),
        newStatus,
        result.isWin || result.isDraw ? null : nextPlayer?.user_id,
        winnerId,
        result.isDraw,
        gameId,
      ]
    );

    await client.query('COMMIT');

    const updatedGame = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const gameResponse = buildGameResponse(updatedGame.rows[0], participants.rows);

    // Notify via WebSocket
    const io = getIO();
    const moveData = {
      id: moveResult.rows[0].id,
      gameId,
      userId: req.user!.userId,
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
        winnerId,
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
