import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface CampaignJobData {
  campaignId: string;
  tenantId: string;
}

export const CAMPAIGN_QUEUE_NAME = 'campaign-broadcast-queue';

export const campaignQueue = new Queue<CampaignJobData>(CAMPAIGN_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 500,
      age: 7 * 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
    },
  },
});
