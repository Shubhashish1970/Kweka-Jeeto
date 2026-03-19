/**
 * WhatsApp Flows Data Exchange Endpoint
 * Modelled exactly on Meta's official server.js from WhatsApp-Flows-Tools.
 *
 * Route: POST /flow/endpoint
 * Security: X-Hub-Signature-256 validation + RSA+AES-128-GCM decryption
 */
import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { decryptRequest, encryptResponse, FlowEndpointException } from '../utils/flow-crypto';
import { getNextScreen } from '../services/flow-endpoint.service';
import { logger } from '../utils/logger';

export const flowEndpointRouter = Router();

// Capture raw body for signature verification — same pattern as Meta's server.js
flowEndpointRouter.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);

function isRequestSignatureValid(req: Request & { rawBody?: Buffer }): boolean {
  const appSecret = env.whatsapp.appSecret;
  if (!appSecret) {
    // Dev mode: skip validation (matching Meta's example behaviour)
    logger.warn('Flow endpoint: APP_SECRET not set — skipping signature validation (dev mode)');
    return true;
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    logger.warn('Flow endpoint: missing X-Hub-Signature-256 header');
    return false;
  }

  const rawBody = req.rawBody;
  if (!rawBody) return false;

  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  // Timing-safe comparison prevents timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

flowEndpointRouter.post('/', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  // 1. Validate signature
  if (!isRequestSignatureValid(req)) {
    logger.warn('Flow endpoint: invalid signature — returning 432');
    res.status(432).send('Invalid signature');
    return;
  }

  try {
    const body = req.body as Record<string, unknown>;

    // 2. Handle unencrypted health check (Flow Builder test panel)
    if (!body.encrypted_flow_data) {
      if (body.action === 'ping') {
        res.json({ data: { status: 'active' } });
        return;
      }
      logger.warn('Flow endpoint: received unencrypted non-ping request');
      res.status(400).json({ error: 'Expected encrypted payload' });
      return;
    }

    const privateKey = env.whatsapp.flowPrivateKey;
    if (!privateKey) {
      logger.error('Flow endpoint: FLOW_PRIVATE_KEY not configured');
      res.status(500).send('Server configuration error');
      return;
    }

    // 3. Decrypt
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(
      body as { encrypted_aes_key: string; encrypted_flow_data: string; initial_vector: string },
      privateKey,
      env.whatsapp.flowPrivateKeyPassphrase || undefined
    );

    logger.info('Flow endpoint: action=%s screen=%s token=%s',
      decryptedBody.action,
      decryptedBody.screen ?? '-',
      String(decryptedBody.flow_token ?? '').slice(0, 20) + '...'
    );

    // 4. Route to business logic
    const screenResponse = await getNextScreen(decryptedBody);

    logger.info('Flow endpoint: → screen=%s', (screenResponse as Record<string, unknown>).screen ?? 'data');

    // 5. Encrypt and return (text/plain base64 — matching Meta's server.js)
    res.set('Content-Type', 'text/plain');
    res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));

  } catch (err) {
    if (err instanceof FlowEndpointException) {
      logger.error('Flow endpoint exception:', err.message, 'status:', err.statusCode);
      res.status(err.statusCode).send(err.message);
      return;
    }
    logger.error('Flow endpoint unexpected error:', err);
    res.status(500).send('Internal server error');
  }
});

// GET — health info (matching Meta's server.js)
flowEndpointRouter.get('/', (_req: Request, res: Response) => {
  res.send('WhatsApp Flows endpoint is running. See README for setup instructions.');
});
