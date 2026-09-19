import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import {
  OUTGOING_WHATSAPP_QUEUE_NAME,
  OutgoingWhatsAppJobData,
} from '../queues/outgoing.queue';
import { whatsAppManager } from '../services/whatsapp.service';
import { localStore } from '../services/store.service';
import { getSocketGateway } from '../sockets/socketGateway';

/**
 * Utility: Asynchronous non-blocking sleep
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a random cooldown delay between 4000ms and 6000ms (4 - 6 seconds)
 * to prevent socket flooding and break periodic timing signatures.
 */
function getJitteredCooldownMs(minSec = 4, maxSec = 6): number {
  const minMs = minSec * 1000;
  const maxMs = maxSec * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Track last send timestamp per tenant in-memory to enforce strict spacing
 */
const lastSentPerTenant = new Map<string, number>();

/**
 * Outgoing WhatsApp Worker:
 * Strict Human-Like Stealth & Rate Limiting System.
 * - Concurrency: 1 (Process strictly ONE message at a time per instance)
 * - Rate Limiter: Max 1 message per 4 seconds via BullMQ native limiter
 * - Post-send Cooldown: 4 - 6 seconds mandatory jittered delay per tenant
 */
export function startOutgoingWhatsAppWorker(): Worker<OutgoingWhatsAppJobData> {
  const worker = new Worker<OutgoingWhatsAppJobData>(
    OUTGOING_WHATSAPP_QUEUE_NAME,
    async (job: Job<OutgoingWhatsAppJobData>) => {
      const { tenantId, toPhone, text, conversationId, senderType, senderId, senderName } = job.data;

      console.log(
        `[OutgoingWorker] 📥 Processing Job #${job.id} for Tenant: ${tenantId} → Contact: ${toPhone} (Length: ${text.length} chars)`
      );

      if (!tenantId || !toPhone || !text) {
        console.warn(`[OutgoingWorker] Job #${job.id} skipped: Missing required parameters`);
        return;
      }

      const convId = conversationId || `conv_${toPhone.replace(/\D/g, '')}`;

      // 1. Check if conversation was paused (Human agent takeover or AI pause)
      if (senderType === 'BOT' || senderId === 'gemini-ai') {
        const currentSettings = localStore.getSettings(tenantId);
        if (currentSettings.pausedConversations?.includes(convId)) {
          console.log(
            `[OutgoingWorker] 🛑 Conversation ${convId} is paused. Cancelling queued AI message #${job.id}.`
          );
          return;
        }
      }

      // 2. Check if contact is opted out (Anti-Ban Outbound Rule)
      const isOptedOut = await whatsAppManager.isContactOptedOut(tenantId, toPhone);
      if (isOptedOut) {
        console.warn(
          `[OutgoingWorker] ⛔ Outbound message blocked: Contact ${toPhone} has opted out (is_opted_out = true). Dropping job #${job.id}.`
        );
        return { success: false, reason: 'contact_opted_out' };
      }

      // 3. Enforce Mandatory Inter-Message Cooldown per Tenant (4 - 6 seconds)
      const lastSentTime = lastSentPerTenant.get(tenantId) || 0;
      const elapsedSinceLast = Date.now() - lastSentTime;
      const targetCooldown = getJitteredCooldownMs(4, 6);

      if (elapsedSinceLast < targetCooldown) {
        const waitTime = targetCooldown - elapsedSinceLast;
        console.log(
          `[OutgoingWorker] 🛡️ Stealth Rate Limiter: Tenant ${tenantId} sent recently (${elapsedSinceLast}ms ago). Enforcing cooldown: waiting ${waitTime}ms...`
        );
        await sleep(waitTime);
      }

      // 4. Execute Natural Typing Simulation & Dispatch via Baileys
      // Executes the strict 8-step sequence (initial pause, read receipt, available, pre-typing, composing, dynamic delay, send, unavailable)
      try {
        const messageId = await whatsAppManager.simulateTypingAndSend(
          tenantId,
          toPhone,
          text,
          {
            conversationId: convId,
            senderType: senderType || 'AGENT',
            senderId: senderId || 'system',
            senderName: senderName || 'Agent',
            replyToMessageId: job.data.metadata?.replyToMessageId,
            messageKey: job.data.metadata?.messageKey,
          }
        );

        // Update last sent timestamp for this tenant
        lastSentPerTenant.set(tenantId, Date.now());

        console.log(
          `[OutgoingWorker] ✅ Job #${job.id} dispatched successfully. WhatsApp Message ID: ${messageId}`
        );

        // 4. Mandatory Post-Send Buffer: Enforce a randomized cooling tail (1.5s - 2.5s)
        // to ensure consecutive jobs in the same queue never execute in back-to-back rapid bursts.
        const postCooling = Math.floor(Math.random() * 1000) + 1500;
        await sleep(postCooling);

        return { success: true, messageId };
      } catch (err: any) {
        console.error(`[OutgoingWorker] ❌ Failed dispatching Job #${job.id}:`, err.message);

        // Notify dashboard via socket about failure if needed
        const gateway = getSocketGateway();
        if (gateway) {
          gateway.to(`tenant:${tenantId}`).emit('message:status', {
            messageId: `failed_job_${job.id}`,
            status: 'FAILED_SEND',
          });
        }

        throw err; // Trigger BullMQ retry strategy
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Strictly ONE message at a time per worker instance
      limiter: {
        max: 1,
        duration: 4000, // Maximum 1 message every 4 seconds
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[OutgoingWorker] 🎯 Job #${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[OutgoingWorker] ⚠️ Job #${job?.id} failed on attempt ${job?.attemptsMade}/${job?.opts.attempts}:`,
      err.message
    );
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[OutgoingWorker] ⚠️ Job #${jobId} stalled and will be re-processed.`);
  });

  worker.on('error', (err) => {
    console.error('[OutgoingWorker] ❌ Worker encountered unhandled error:', err.message);
  });

  return worker;
}
