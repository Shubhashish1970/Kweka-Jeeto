import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { connectDb, disconnectDb } from './data/db';
import { webhookRouter } from './api/webhook';
import { adminRouter } from './api/admin';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = express();

app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());
app.use(cookieParser());

app.use('/webhook', webhookRouter);
app.use('/api/admin', adminRouter);

// Admin static files (optional - when admin is bundled with backend; otherwise use Firebase)
const adminPath = path.join(__dirname, '../admin/dist');
if (env.nodeEnv === 'production' && fs.existsSync(adminPath)) {
  app.use('/admin', express.static(adminPath));
  app.get('/admin/*', (_req, res) => {
    res.sendFile(path.join(adminPath, 'index.html'));
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(env.port, async () => {
  try {
    await connectDb();
    logger.info(`Server running on port ${env.port}`);
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
});

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close();
  await disconnectDb();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
