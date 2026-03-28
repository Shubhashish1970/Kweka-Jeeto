import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import * as dataService from '../services/data.service';
import { getFarmerByWaId } from '../data/repositories/farmer.repository';
import { logger } from '../utils/logger';

export const adminRouter = Router();

const JWT_COOKIE_NAME = 'admin_token';
const JWT_EXPIRY = '7d';

// Set ADMIN_AUTH_DISABLED=true to skip auth (e.g. while focusing on functionality); remove to re-enable
const authDisabled = process.env.ADMIN_AUTH_DISABLED === 'true';

const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  if (authDisabled) return next();
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

adminRouter.put('/farmers/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { farmer_name, age, profession, state, district, crop, advisory_start_date, landholding, wa_id } = req.body;

    // Check new wa_id doesn't belong to a different farmer
    if (wa_id) {
      const existing = await getFarmerByWaId(String(wa_id));
      if (existing && String(existing._id) !== req.params.id) {
        res.status(409).json({ error: 'This WhatsApp number is already registered to another farmer.' });
        return;
      }
    }

    const updated = await dataService.updateFarmer(req.params.id, {
      farmer_name, age, profession, state, district, crop,
      advisory_start_date: advisory_start_date ? new Date(advisory_start_date) : undefined,
      landholding: landholding ?? undefined,
      ...(wa_id ? { wa_id: String(wa_id) } : {}),
    });
    if (!updated) {
      res.status(404).json({ error: 'Farmer not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    logger.error('Update farmer error:', err);
    res.status(500).json({ error: 'Failed to update farmer' });
  }
});

adminRouter.delete('/farmers/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    await dataService.deleteFarmer(req.params.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete farmer error:', err);
    res.status(500).json({ error: 'Failed to delete farmer' });
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

// ---------------------------------------------------------------------------
// State-Crops endpoints
// ---------------------------------------------------------------------------

adminRouter.get('/state-crops', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const docs = await dataService.getAllStateCrops();
    res.json(docs);
  } catch (err) {
    logger.error('Get state-crops error:', err);
    res.status(500).json({ error: 'Failed to fetch state crops' });
  }
});

adminRouter.get('/state-crops/:state', verifyAuth, async (req: Request, res: Response) => {
  try {
    const doc = await dataService.getStateCrop(req.params.state);
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Get state-crop error:', err);
    res.status(500).json({ error: 'Failed to fetch state crop' });
  }
});

adminRouter.put('/state-crops/:state', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { stateLabel, crops } = req.body;
    if (!stateLabel || !Array.isArray(crops)) {
      res.status(400).json({ error: 'stateLabel and crops array required' });
      return;
    }
    const doc = await dataService.upsertStateCrop(req.params.state, stateLabel, crops);
    res.json(doc);
  } catch (err) {
    logger.error('Upsert state-crop error:', err);
    res.status(500).json({ error: 'Failed to update state crop' });
  }
});

adminRouter.post('/state-crops/:state/crops', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { id, title, description } = req.body;
    if (!id || !title || !description) {
      res.status(400).json({ error: 'id, title, and description required' });
      return;
    }
    const doc = await dataService.addCropToState(req.params.state, { id, title, description });
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Add crop to state error:', err);
    res.status(500).json({ error: 'Failed to add crop' });
  }
});

adminRouter.put('/state-crops/:state/crops/:cropId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { id, title, description } = req.body;
    const doc = await dataService.updateCropInState(req.params.state, req.params.cropId, { id, title, description });
    if (!doc) {
      res.status(404).json({ error: 'State or crop not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Update crop in state error:', err);
    res.status(500).json({ error: 'Failed to update crop' });
  }
});

adminRouter.delete('/state-crops/:state/crops/:cropId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const doc = await dataService.deleteCropFromState(req.params.state, req.params.cropId);
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Delete crop from state error:', err);
    res.status(500).json({ error: 'Failed to delete crop' });
  }
});

// ---------------------------------------------------------------------------
// Masters — State & District endpoints
// ---------------------------------------------------------------------------

adminRouter.get('/masters/states', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const docs = await dataService.getAllStateMasters();
    res.json(docs);
  } catch (err) {
    logger.error('Get state masters error:', err);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

adminRouter.post('/masters/states', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { state, stateLabel, districts } = req.body;
    if (!state || !stateLabel) {
      res.status(400).json({ error: 'state and stateLabel are required' });
      return;
    }
    const doc = await dataService.createStateMaster(
      String(state).toLowerCase().replace(/\s+/g, '_'),
      String(stateLabel),
      Array.isArray(districts) ? districts : []
    );
    res.status(201).json(doc);
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      res.status(409).json({ error: 'State already exists' });
      return;
    }
    logger.error('Create state master error:', err);
    res.status(500).json({ error: 'Failed to create state' });
  }
});

adminRouter.put('/masters/states/:state', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { stateLabel, active } = req.body;
    const updates: Record<string, unknown> = {};
    if (stateLabel !== undefined) updates.stateLabel = stateLabel;
    if (active !== undefined) updates.active = active;
    const doc = await dataService.updateStateMaster(req.params.state, updates);
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Update state master error:', err);
    res.status(500).json({ error: 'Failed to update state' });
  }
});

adminRouter.delete('/masters/states/:state', verifyAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await dataService.deleteStateMaster(req.params.state);
    if (!deleted) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete state master error:', err);
    res.status(500).json({ error: 'Failed to delete state' });
  }
});

adminRouter.get('/masters/states/:state/districts', verifyAuth, async (req: Request, res: Response) => {
  try {
    const districts = await dataService.getDistrictsByState(req.params.state);
    res.json({ districts });
  } catch (err) {
    logger.error('Get districts error:', err);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

adminRouter.post('/masters/states/:state/districts', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { district } = req.body;
    if (!district) {
      res.status(400).json({ error: 'district name required' });
      return;
    }
    const doc = await dataService.addDistrict(req.params.state, String(district));
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Add district error:', err);
    res.status(500).json({ error: 'Failed to add district' });
  }
});

adminRouter.delete('/masters/states/:state/districts/:district', verifyAuth, async (req: Request, res: Response) => {
  try {
    const doc = await dataService.removeDistrict(
      req.params.state,
      decodeURIComponent(req.params.district)
    );
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Remove district error:', err);
    res.status(500).json({ error: 'Failed to remove district' });
  }
});

adminRouter.put('/masters/states/:state/districts', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { districts } = req.body;
    if (!Array.isArray(districts)) {
      res.status(400).json({ error: 'districts array required' });
      return;
    }
    const doc = await dataService.replaceDistricts(req.params.state, districts);
    if (!doc) {
      res.status(404).json({ error: 'State not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Replace districts error:', err);
    res.status(500).json({ error: 'Failed to replace districts' });
  }
});

// ─── Occupation Masters ───────────────────────────────────────────────────────

adminRouter.get('/masters/occupations', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const docs = await dataService.getAllOccupationsAdmin();
    res.json(docs);
  } catch (err) {
    logger.error('Get occupations error:', err);
    res.status(500).json({ error: 'Failed to get occupations' });
  }
});

adminRouter.post('/masters/occupations', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { id, label, order } = req.body;
    if (!id || !label) {
      res.status(400).json({ error: 'id and label required' });
      return;
    }
    const doc = await dataService.createOccupation(String(id), String(label), Number(order ?? 0));
    res.status(201).json(doc);
  } catch (err) {
    logger.error('Create occupation error:', err);
    res.status(500).json({ error: 'Failed to create occupation' });
  }
});

adminRouter.put('/masters/occupations/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { label, active, order } = req.body;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = String(label);
    if (active !== undefined) updates.active = Boolean(active);
    if (order !== undefined) updates.order = Number(order);
    const doc = await dataService.updateOccupation(req.params.id, updates);
    if (!doc) {
      res.status(404).json({ error: 'Occupation not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Update occupation error:', err);
    res.status(500).json({ error: 'Failed to update occupation' });
  }
});

adminRouter.delete('/masters/occupations/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await dataService.deleteOccupation(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Occupation not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete occupation error:', err);
    res.status(500).json({ error: 'Failed to delete occupation' });
  }
});

// ─── Landholding Unit Masters ─────────────────────────────────────────────────

adminRouter.get('/masters/landholding-units', verifyAuth, async (_req: Request, res: Response) => {
  try {
    const docs = await dataService.getAllLandholdingUnitsAdmin();
    res.json(docs);
  } catch (err) {
    logger.error('Get landholding units error:', err);
    res.status(500).json({ error: 'Failed to get landholding units' });
  }
});

adminRouter.post('/masters/landholding-units', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { id, label, conversion_factor, order } = req.body;
    if (!id || !label || conversion_factor == null) {
      res.status(400).json({ error: 'id, label and conversion_factor required' });
      return;
    }
    const doc = await dataService.createLandholdingUnit(String(id), String(label), Number(conversion_factor), Number(order ?? 0));
    res.status(201).json(doc);
  } catch (err) {
    logger.error('Create landholding unit error:', err);
    res.status(500).json({ error: 'Failed to create landholding unit' });
  }
});

adminRouter.put('/masters/landholding-units/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { label, conversion_factor, active, order } = req.body;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = String(label);
    if (conversion_factor !== undefined) updates.conversion_factor = Number(conversion_factor);
    if (active !== undefined) updates.active = Boolean(active);
    if (order !== undefined) updates.order = Number(order);
    const doc = await dataService.updateLandholdingUnit(req.params.id, updates);
    if (!doc) {
      res.status(404).json({ error: 'Landholding unit not found' });
      return;
    }
    res.json(doc);
  } catch (err) {
    logger.error('Update landholding unit error:', err);
    res.status(500).json({ error: 'Failed to update landholding unit' });
  }
});

adminRouter.delete('/masters/landholding-units/:id', verifyAuth, async (req: Request, res: Response) => {
  try {
    const deleted = await dataService.deleteLandholdingUnit(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Landholding unit not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete landholding unit error:', err);
    res.status(500).json({ error: 'Failed to delete landholding unit' });
  }
});
