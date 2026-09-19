import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { CAMPAIGN_QUEUE_NAME, CampaignJobData } from '../queues/campaign.queue';
import { whatsAppManager } from '../services/whatsapp.service';
import { prisma } from '@omni/database';
import { getSocketGateway } from '../sockets/socketGateway';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates a jittered anti-ban delay between 10 to 20 seconds
 * (10000ms - 20000ms) to evade Meta spam and mass-messaging detection.
 */
function getAntiBanDripDelayMs(): number {
  const minMs = 10000; // 10s
  const maxMs = 20000; // 20s
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export function startCampaignWorker(): Worker<CampaignJobData> {
  const worker = new Worker<CampaignJobData>(
    CAMPAIGN_QUEUE_NAME,
    async (job: Job<CampaignJobData>) => {
      const { campaignId, tenantId } = job.data;
      console.log(`[CampaignWorker] 🚀 Starting Broadcast Campaign #${campaignId} for Tenant: ${tenantId}`);

      // 1. Fetch Campaign and pending recipients
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          recipients: {
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!campaign) {
        console.error(`[CampaignWorker] ❌ Campaign #${campaignId} not found.`);
        return;
      }

      if (campaign.status === 'CANCELLED') {
        console.log(`[CampaignWorker] 🛑 Campaign #${campaignId} was cancelled. Halting.`);
        return;
      }

      // Update status to PROCESSING
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'PROCESSING' },
      });

      const gateway = getSocketGateway();
      if (gateway) {
        (gateway as any).to(`tenant:${tenantId}`).emit('campaign:updated', {
          campaignId,
          status: 'PROCESSING',
        });
      }

      let sentCount = campaign.sentCount;
      let failedCount = campaign.failedCount;

      console.log(`[CampaignWorker] 📋 Campaign has ${campaign.recipients.length} pending recipient(s).`);

      // 2. Process recipients sequentially with strict Anti-Ban Drip Delay
      for (let i = 0; i < campaign.recipients.length; i++) {
        const recipient = campaign.recipients[i];

        // Check if campaign was cancelled during execution
        const checkStatus = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });
        if (checkStatus?.status === 'CANCELLED') {
          console.log(`[CampaignWorker] 🛑 Campaign #${campaignId} was cancelled mid-run.`);
          break;
        }

        const phone = recipient.phoneNumber;

        // Anti-Ban Filter: Check if contact is opted out
        const isOptedOut = await whatsAppManager.isContactOptedOut(tenantId, phone);
        if (isOptedOut) {
          console.warn(`[CampaignWorker] ⛔ Skipping opted-out contact ${phone} for campaign #${campaignId}`);
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'SKIPPED_OPTED_OUT',
              error: 'Contact opted out from receiving messages',
            },
          });
          continue;
        }

        try {
          // Send via WhatsApp Manager with human typing simulation
          await whatsAppManager.simulateTypingAndSend(
            tenantId,
            phone,
            campaign.messageText,
            {
              senderType: 'AGENT',
              senderName: `Broadcast (${campaign.name})`,
              bypassOptOutCheck: true, // Already verified above
            }
          );

          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });

          sentCount++;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount },
          });

          console.log(`[CampaignWorker] ✅ [${i + 1}/${campaign.recipients.length}] Sent to ${phone}`);

          if (gateway) {
            (gateway as any).to(`tenant:${tenantId}`).emit('campaign:progress', {
              campaignId,
              sentCount,
              failedCount,
              totalCount: campaign.totalCount,
            });
          }
        } catch (err: any) {
          console.error(`[CampaignWorker] ❌ Failed sending to ${phone}:`, err.message);

          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              error: err.message || 'Unknown send error',
            },
          });

          failedCount++;
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { failedCount },
          });
        }

        // Anti-Ban Drip Cooldown: Enforce 10-20 seconds randomized jitter delay before next recipient
        if (i < campaign.recipients.length - 1) {
          const dripDelayMs = getAntiBanDripDelayMs();
          console.log(
            `[CampaignWorker] 🛡️ Anti-Ban Drip Shield: Cooling down for ${(dripDelayMs / 1000).toFixed(1)}s before next broadcast dispatch...`
          );
          await sleep(dripDelayMs);
        }
      }

      // 3. Mark Campaign Completed
      const finalCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      console.log(`[CampaignWorker] 🎉 Campaign #${campaignId} completed. Sent: ${sentCount}, Failed: ${failedCount}`);

      if (gateway) {
        (gateway as any).to(`tenant:${tenantId}`).emit('campaign:completed', {
          campaignId,
          sentCount,
          failedCount,
          totalCount: finalCampaign.totalCount,
        });
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Strictly 1 campaign at a time per worker instance
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[CampaignWorker] ⚠️ Job #${job?.id} failed with error:`, err);
  });

  return worker;
}
