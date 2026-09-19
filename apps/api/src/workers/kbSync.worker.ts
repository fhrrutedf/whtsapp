import { Worker, Queue, Job } from 'bullmq';
import crypto from 'crypto';
import { redisConnection } from '../config/redis';
import { prisma } from '@omni/database';
import { WebCrawlerService } from '../services/webCrawler.service';
import { FileIngestionService } from '../services/fileIngestion.service';
import { localStore } from '../services/store.service';

export const KB_SYNC_QUEUE_NAME = 'kb-sync-queue';

export interface KbSyncJobData {
  tenantId?: string;
  sourceId?: string;
  triggeredBy?: 'CRON' | 'MANUAL';
}

export const kbSyncQueue = new Queue<KbSyncJobData>(KB_SYNC_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2,
  },
});

/**
 * Checks and syncs all due KnowledgeBaseSources (URL and SITEMAP)
 */
export async function syncDueKnowledgeSources(tenantIdFilter?: string) {
  console.log(`[KBSyncWorker] 🔄 Checking knowledge base sources due for auto-rescrape...`);

  const whereClause: any = {
    syncFrequency: { in: ['DAILY', 'WEEKLY'] },
    type: { in: ['URL', 'SITEMAP'] },
  };
  if (tenantIdFilter) {
    whereClause.tenantId = tenantIdFilter;
  }

  const sources = await prisma.knowledgeBaseSource.findMany({
    where: whereClause,
  });

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_WEEK_MS = 7 * ONE_DAY_MS;

  for (const source of sources) {
    if (!source.url) continue;

    const lastSync = source.lastSyncedAt ? new Date(source.lastSyncedAt).getTime() : 0;
    const elapsed = now - lastSync;

    const isDue =
      lastSync === 0 ||
      (source.syncFrequency === 'DAILY' && elapsed >= ONE_DAY_MS) ||
      (source.syncFrequency === 'WEEKLY' && elapsed >= ONE_WEEK_MS);

    if (!isDue) {
      continue;
    }

    console.log(
      `[KBSyncWorker] 🌐 Rescraping source: ${source.title} (${source.url}) - Frequency: ${source.syncFrequency}`
    );

    try {
      const isSitemap =
        source.type === 'SITEMAP' || source.url.endsWith('.xml') || source.url.includes('sitemap');
      const { pages } = await WebCrawlerService.crawl(
        source.url,
        isSitemap,
        source.crawlDepth || 1
      );

      const combinedText = pages
        .map((p) => `=== [Page: ${p.title}] (${p.url}) ===\n${p.text}`)
        .join('\n\n');

      const newHash = crypto.createHash('sha256').update(combinedText).digest('hex');

      if (newHash !== source.contentHash) {
        console.log(`[KBSyncWorker] ⚡ Content hash changed for ${source.url}! Updating embeddings...`);

        // Remove old chunks
        await prisma.knowledgeChunk.deleteMany({
          where: { sourceId: source.id },
        });

        // Generate new chunks & embeddings
        const chunks = FileIngestionService.chunkText(combinedText);
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];
          const embedding = await FileIngestionService.generateEmbedding(chunkText);

          if (embedding) {
            const vectorStr = `[${embedding.join(',')}]`;
            await prisma.$executeRawUnsafe(
              `INSERT INTO "knowledge_chunks" ("id", "tenant_id", "source_id", "content", "metadata", "embedding", "weight", "created_at")
               VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5::vector, 1.0, CURRENT_TIMESTAMP)`,
              source.tenantId,
              source.id,
              chunkText,
              JSON.stringify({ chunkIndex: i, url: source.url, totalChunks: chunks.length }),
              vectorStr
            );
          } else {
            await prisma.knowledgeChunk.create({
              data: {
                tenantId: source.tenantId,
                sourceId: source.id,
                content: chunkText,
                weight: 1.0,
                metadata: { chunkIndex: i, url: source.url, totalChunks: chunks.length },
              },
            });
          }
        }

        // Update source record
        await prisma.knowledgeBaseSource.update({
          where: { id: source.id },
          data: {
            contentHash: newHash,
            lastSyncedAt: new Date(),
          },
        });

        // Mirror to localStore
        localStore.addKnowledgeItem(source.tenantId, {
          title: source.title,
          type: 'url',
          source: source.url,
          content: combinedText,
          charCount: combinedText.length,
        });

        console.log(`[KBSyncWorker] ✅ Updated ${chunks.length} chunks for ${source.title}`);
      } else {
        console.log(`[KBSyncWorker] 💤 Content unchanged for ${source.url}. Updated lastSyncedAt.`);
        await prisma.knowledgeBaseSource.update({
          where: { id: source.id },
          data: { lastSyncedAt: new Date() },
        });
      }
    } catch (crawlErr: any) {
      console.error(`[KBSyncWorker] ✗ Failed syncing source ${source.id} (${source.url}):`, crawlErr.message);
    }
  }
}

/**
 * Starts the global hourly Knowledge Base Sync Worker
 */
export function startKbSyncWorker(): Worker<KbSyncJobData> {
  const worker = new Worker<KbSyncJobData>(
    KB_SYNC_QUEUE_NAME,
    async (job: Job<KbSyncJobData>) => {
      console.log(`[KBSyncWorker] 🚀 Processing sync job #${job.id} (Triggered by: ${job.data.triggeredBy || 'CRON'})`);
      await syncDueKnowledgeSources(job.data.tenantId);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[KBSyncWorker] ✅ Job #${job.id} finished successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[KBSyncWorker] ❌ Job #${job?.id} failed:`, err.message);
  });

  // Schedule hourly check (every 60 minutes)
  setInterval(() => {
    kbSyncQueue
      .add('hourly-kb-sync', { triggeredBy: 'CRON' })
      .catch((err) => console.warn('[KBSyncWorker] Failed to enqueue hourly job:', err.message));
  }, 60 * 60 * 1000);

  // Trigger initial check on boot after 30 seconds
  setTimeout(() => {
    kbSyncQueue
      .add('initial-kb-sync', { triggeredBy: 'CRON' })
      .catch((err) => console.warn('[KBSyncWorker] Failed to enqueue initial sync:', err.message));
  }, 30000);

  console.log(`[KBSyncWorker] 🛡️ Knowledge Base Auto-Sync Worker initialized (Hourly schedule active)`);
  return worker;
}
