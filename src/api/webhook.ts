import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { processWebhookPayload } from '../services/webhook.service';
import { logger } from '../utils/logger';

export const webhookRouter = Router();

webhookRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsapp.verifyToken) {
    logger.info('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

webhookRouter.post('/', async (req: Request, res: Response) => {
  res.status(200).send('OK');

  try {
    await processWebhookPayload(req.body);
  } catch (err) {
    logger.error('Webhook processing error:', err);
  }
});
