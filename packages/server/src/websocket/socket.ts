import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@cohesion/shared';

let io: Server<ClientToServerEvents, ServerToClientEvents>;

export function initSocket(httpServer: HttpServer, clientUrl: string) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('joinGame', (gameId) => {
      socket.join(`game:${gameId}`);
    });

    socket.on('leaveGame', (gameId) => {
      socket.leave(`game:${gameId}`);
    });

    socket.on('joinTournament', (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on('leaveTournament', (tournamentId) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
