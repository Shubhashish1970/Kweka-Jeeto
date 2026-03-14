import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { connectDb, disconnectDb } from './data/db';
import { webhookRouter } from './api/webhook';
import { adminRouter } from './api/admin';
import { cronRouter } from './api/cron';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = express();

app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());
app.use(cookieParser());

app.use('/webhook', webhookRouter);
app.use('/api/admin', adminRouter);
app.use('/internal', cronRouter);

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

// Cloud Run: must listen on 0.0.0.0 (all interfaces), not 127.0.0.1 — see Cloud Run troubleshooting
const server = app.listen(env.port, '0.0.0.0', () => {
  logger.info(`Server listening on port ${env.port}`);
  connectDb().catch((err) => {
    logger.error('MongoDB connect failed (server still up):', err);
  });
});

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close();
  await disconnectDb();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
