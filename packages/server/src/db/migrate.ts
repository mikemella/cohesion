import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const migration = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop old tables from previous auth-based schema
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS game_participants CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(50) NOT NULL DEFAULT 'connect-four',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  player1_name VARCHAR(100),
  player2_name VARCHAR(100),
  current_turn SMALLINT NOT NULL DEFAULT 1,
  winner SMALLINT,
  is_draw BOOLEAN DEFAULT FALSE,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_number SMALLINT NOT NULL,
  move_number INT NOT NULL,
  move_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_moves_game ON moves(game_id);
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(migration);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
