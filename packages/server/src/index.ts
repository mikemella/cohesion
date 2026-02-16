import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import { initSocket } from './websocket/socket.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

initSocket(httpServer, CLIENT_URL);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
