import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface OutgoingWhatsAppJobData {
  tenantId: string;
  toPhone: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  caption?: string;
  conversationId?: string;
  senderType?: 'AGENT' | 'BOT';
  senderId?: string;
  senderName?: string;
  metadata?: Record<string, any>;
  enqueuedAt?: string;
}

export const OUTGOING_WHATSAPP_QUEUE_NAME = 'outgoing-whatsapp-messages';

export const outgoingWhatsAppQueue = new Queue<OutgoingWhatsAppJobData>(
  OUTGOING_WHATSAPP_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000, // 3s, 6s, 12s
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 3600, // Keep logs for 24 hours
      },
      removeOnFail: {
        count: 2000,
      },
    },
  }
);
