import { Request, Response } from 'express';
import { metaWebhookQueue } from '../queues/metaWebhook.queue';
import { MetaWebhookPayload } from '@omni/types';

export class MetaWebhookController {
  /**
   * Hub Challenge Verification (GET /webhooks/meta)
   * Handshake endpoint required when registering Webhook with Meta WhatsApp Cloud API.
   */
  public static verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === expectedToken) {
        console.log('✅ Meta Webhook Hub Challenge verified successfully');
        res.status(200).send(challenge);
        return;
      }
      console.warn('❌ Meta Webhook Hub Challenge failed: token mismatch');
      res.status(403).json({ error: 'Verification token mismatch' });
      return;
    }

    res.status(400).json({ error: 'Missing hub verification parameters' });
  }

  /**
   * Webhook Ingestion (POST /webhooks/meta)
   * STRICT META ANTI-BAN RULE:
   * 1. Acknowledges HTTP 200 immediately to prevent delivery timeouts.
   * 2. Offloads JSON payload parsing and DB insertion to BullMQ.
   * 3. Prevents duplicate work via Meta message ID idempotency.
   */
  public static async handleIncoming(req: Request, res: Response): Promise<void> {
    // 1. Immediate HTTP 200 acknowledgment
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    try {
      const payload = req.body as MetaWebhookPayload;
      const signature = req.headers['x-hub-signature-256'] as string;

      if (!payload || payload.object !== 'whatsapp_business_account') {
        return;
      }

      // Check first message ID for BullMQ deduplication
      const firstMessage = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

      // Deduplication key: meta_msg_{id} or fallback to timestamp hash
      const jobId = firstMessage?.id
        ? `meta_msg_${firstMessage.id}`
        : `meta_event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await metaWebhookQueue.add(
        'process-meta-event',
        {
          payload,
          signature,
          receivedAt: new Date().toISOString(),
          phoneNumberId,
        },
        {
          jobId,
        }
      );
    } catch (err: any) {
      // Must not throw or crash after responding with 200 OK
      console.error('❌ Failed to enqueue Meta webhook event:', err?.message);
    }
  }
}
