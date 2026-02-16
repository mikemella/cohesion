# Cohesion - Workplace Gaming Platform

Turn-based games for workplace teams. Think "Game Pigeon for Slack" — challenge coworkers, get notified when it's your turn, and play in the browser.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS v4
- **Backend:** Node.js + Express + TypeScript + Socket.io
- **Database:** PostgreSQL
- **Real-time:** Socket.io for live game updates
- **Monorepo:** npm workspaces with shared game logic

## Project Structure

```
packages/
  shared/     # Shared types & game logic (Connect Four engine)
  server/     # Express API + WebSocket server
  client/     # React frontend (Vite)
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

```bash
createdb cohesion

# Copy env file and edit if needed
cp packages/server/.env.example packages/server/.env

# Run migrations
npm run db:migrate
```

### 3. Build shared types

```bash
npm run build -w packages/shared
```

### 4. Start development

```bash
# Start both frontend and backend concurrently:
npm run dev

# Or start them separately:
npm run dev:server   # Express on :3001
npm run dev:client   # Vite on :5173
```

Open http://localhost:5173 in your browser.

## How to Play

1. Register two accounts (use two browser windows / incognito)
2. User 1: Click **New Connect Four Game** — this creates a game and puts you in the waiting room
3. User 2: The game appears in the lobby — click **Join Game**
4. Take turns dropping pieces — first to connect 4 in a row wins!
5. Moves update in real-time via WebSocket

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/games` | List open/active games |
| GET | `/api/games/:id` | Get game state |
| POST | `/api/games` | Create new game |
| POST | `/api/games/:id/join` | Join a waiting game |
| POST | `/api/games/:id/move` | Make a move `{ column: 0-6 }` |

## What's Next (Phase 2)

- Slack OAuth integration
- Slack notifications ("It's your turn!")
- More games (Tic-tac-toe, Battleship, etc.)
- Game history & stats
- Deployment to Vercel + Railway
