import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import * as dataService from '../services/data.service';
import { logger } from '../utils/logger';

export const adminRouter = Router();

const JWT_COOKIE_NAME = 'admin_token';
const JWT_EXPIRY = '7d';

const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[JWT_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    jwt.verify(token, env.admin.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

adminRouter.post('/login', async (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const isValid = passwordHash
    ? await bcrypt.compare(password, passwordHash)
    : password === env.admin.password;
  if (!isValid) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  const token = jwt.sign({ admin: true }, env.admin.jwtSecret, { expiresIn: JWT_EXPIRY });
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ success: true });
});

adminRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(JWT_COOKIE_NAME);
  res.json({ success: true });
});

adminRouter.get('/me', verifyAuth, (_req: Request, res: Response) => {
  res.json({ authenticated: true });
});

adminRouter.get('/farmers', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { page, limit, state, crop, search, startDate, endDate } = req.query;
    const filter: Record<string, unknown> = {};
    if (state) filter.state = state;
    if (crop) filter.crop = crop;
    if (search) filter.search = String(search);
    if (startDate) filter.startDate = new Date(String(startDate));
    if (endDate) filter.endDate = new Date(String(endDate));
    const { farmers, total } = await dataService.getFarmers(filter, {
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 50,
    });
    res.json({ farmers, total });
  } catch (err) {
    logger.error('Get farmers error:', err);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

adminRouter.get('/farmers/export', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { state, crop, startDate, endDate } = req.query;
    const filter: Record<string, unknown> = {};
    if (state) filter.state = state;
    if (crop) filter.crop = crop;
    if (startDate) filter.startDate = new Date(String(startDate));
    if (endDate) filter.endDate = new Date(String(endDate));
    const farmers = await dataService.getFarmersForExport(filter);
    const csv = [
      'wa_id,farmer_name,age,profession,state,district,crop,createdAt',
      ...farmers.map((f) =>
        [
          f.wa_id,
          `"${(f.farmer_name || '').replace(/"/g, '""')}"`,
          f.age,
          `"${(f.profession || '').replace(/"/g, '""')}"`,
          f.state,
          `"${(f.district || '').replace(/"/g, '""')}"`,
          f.crop,
          f.createdAt?.toISOString() || '',
        ].join(',')
      ),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=farmers.csv');
    res.send(csv);
  } catch (err) {
    logger.error('Export farmers error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

adminRouter.get('/reports/summary', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const total = await dataService.getFarmerCount();
    const byCrop = await dataService.getFarmersForExport({});
    const cropCounts: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    for (const f of byCrop) {
      cropCounts[f.crop] = (cropCounts[f.crop] || 0) + 1;
      stateCounts[f.state] = (stateCounts[f.state] || 0) + 1;
    }
    res.json({ total, byCrop: cropCounts, byState: stateCounts });
  } catch (err) {
    logger.error('Reports summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

adminRouter.get('/config', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const config = await dataService.getAllConfig();
    res.json(config);
  } catch (err) {
    logger.error('Get config error:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

adminRouter.put('/config', verifyAuth, async (req: Request, res: Response) => {
  try {
    const entries = req.body;
    if (typeof entries !== 'object') {
      res.status(400).json({ error: 'Invalid config' });
      return;
    }
    for (const [key, value] of Object.entries(entries)) {
      await dataService.setConfig(key, value, 'admin');
    }
    await dataService.logAudit('config_update', 'admin', { keys: Object.keys(entries) });
    res.json({ success: true });
  } catch (err) {
    logger.error('Update config error:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});
