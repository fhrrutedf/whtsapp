import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { MetaWebhookPayload } from '@omni/types';

export interface MetaWebhookJobData {
  payload: MetaWebhookPayload;
  signature?: string;
  receivedAt: string;
  phoneNumberId?: string;
}

export const META_WEBHOOK_QUEUE_NAME = 'meta-webhook-ingestion';

export const metaWebhookQueue = new Queue<MetaWebhookJobData>(META_WEBHOOK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s, 8s, 16s
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // keep 24 hours
    },
    removeOnFail: {
      count: 5000,
    },
  },
});
