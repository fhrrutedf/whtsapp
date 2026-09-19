import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

export function verifyMetaSignature(
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): void {
  // In development, if explicitly opted out, skip signature check
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_META_SIGNATURE === 'true') {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    console.error('[CRITICAL] META_APP_SECRET environment variable is not defined');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  if (!signature) {
    console.warn('[Security] Webhook received with missing x-hub-signature-256');
    res.status(401).json({ error: 'Missing webhook signature' });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    console.error('[Security] Raw body buffer not available on request');
    res.status(500).json({ error: 'Raw body buffer missing' });
    return;
  }

  const hmac = crypto.createHmac('sha256', appSecret);
  const digest = `sha256=${hmac.update(rawBody).digest('hex')}`;

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const digestBuffer = Buffer.from(digest, 'utf8');

  if (
    signatureBuffer.length !== digestBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
  ) {
    console.warn('[Security] Meta HMAC signature mismatch');
    res.status(403).json({ error: 'Invalid HMAC signature' });
    return;
  }

  next();
}
