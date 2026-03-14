import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { runDailyAdvisory } from '../services/daily-advisory.service';

const router = Router();

function getCronSecret(req: Request): string {
  const header = req.header('X-Cron-Secret') ?? req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  return header ?? '';
}

/** POST /internal/daily-advisory — run daily crop advisory send (call from Cloud Scheduler or cron) */
router.post('/daily-advisory', async (req: Request, res: Response) => {
  if (!env.cronSecret) {
    res.status(503).json({ error: 'Cron not configured (CRON_SECRET not set)' });
    return;
  }
  if (getCronSecret(req) !== env.cronSecret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await runDailyAdvisory();
    res.json({ ok: true, sent: result.sent, failed: result.failed });
  } catch (err) {
    res.status(500).json({ error: 'Daily advisory run failed', details: String(err) });
  }
});

export const cronRouter = router;
