import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { META_WEBHOOK_QUEUE_NAME, MetaWebhookJobData } from '../queues/metaWebhook.queue';
import { prisma, SenderType, MessageStatus } from '@omni/database';
import { ComplianceService } from '../services/compliance.service';
import { getSocketGateway } from '../sockets/socketGateway';
import { MetaIncomingMessage, MetaMessageStatus } from '@omni/types';

export function startMetaWebhookWorker(): Worker<MetaWebhookJobData> {
  const worker = new Worker<MetaWebhookJobData>(
    META_WEBHOOK_QUEUE_NAME,
    async (job: Job<MetaWebhookJobData>) => {
      const { payload, phoneNumberId } = job.data;

      if (!phoneNumberId) {
        console.warn(`[Worker] Job ${job.id} skipped: Missing phoneNumberId`);
        return;
      }

      // 1. Locate ChannelConfig by provider_name (phoneNumberId stored as providerName)
      //    providerName is the WhatsApp Phone Number ID stored in channel_configs
      const channelConfig = await prisma.channelConfig.findFirst({
        where: { providerName: phoneNumberId },
        include: { tenant: true },
      });

      if (!channelConfig) {
        console.warn(`[Worker] No ChannelConfig found for phoneNumberId: ${phoneNumberId}`);
        return;
      }

      const tenantId = channelConfig.tenantId;

      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Process incoming customer messages
          if (value.messages && value.messages.length > 0) {
            const customerContact = value.contacts?.[0];
            const customerName = customerContact?.profile?.name || 'WhatsApp User';

            for (const msg of value.messages) {
              await handleIncomingCustomerMessage(tenantId, channelConfig.id, msg, customerName);
            }
          }

          // Process delivery status receipts (sent, delivered, read)
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              await handleMessageStatusUpdate(tenantId, status);
            }
          }
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 20, // High throughput concurrent worker processing
    }
  );

  worker.on('completed', (_job) => {
    // Intentionally silent on success — use metrics/tracing instead
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function handleIncomingCustomerMessage(
  tenantId: string,
  channelConfigId: string,
  msg: MetaIncomingMessage,
  customerName: string
): Promise<void> {
  const customerPhone = msg.from;
  const messageDate = new Date(parseInt(msg.timestamp, 10) * 1000);

  // Extract text content — Media stored as mediaId (Meta passthrough), no S3
  let textContent: string | null = null;
  let mediaId: string | null = null;

  if (msg.type === 'text' && msg.text?.body) {
    textContent = msg.text.body;
  } else if (msg.type === 'interactive') {
    textContent =
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      '[Interactive Reply]';
  } else if (['image', 'audio', 'video', 'document', 'sticker'].includes(msg.type)) {
    // Meta Passthrough: store media_id from Meta, no upload to S3
    mediaId = (msg as any)[msg.type]?.id || null;
    textContent = null;
  }

  // 1. Upsert Contact (unique per tenant + phoneNumber)
  const contact = await prisma.contact.upsert({
    where: {
      tenantId_phoneNumber: { tenantId, phoneNumber: customerPhone },
    },
    update: {
      name: customerName,
      lastSeenAt: new Date(),
    },
    create: {
      tenantId,
      phoneNumber: customerPhone,
      name: customerName,
      lastSeenAt: new Date(),
    },
  });

  // 2. Upsert Conversation — find or create by contact + channel + channelConfig
  //    We use contactId + channelConfigId as a logical thread key for WhatsApp
  let conversation = await prisma.conversation.findFirst({
    where: {
      tenantId,
      contactId: contact.id,
      channelConfigId,
      channel: 'WHATSAPP',
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId: contact.id,
        channelConfigId,
        channel: 'WHATSAPP',
        status: 'OPEN',
        lastMessageSnippet: textContent ?? '[Media]',
        unreadCount: 1,
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageSnippet: textContent ?? '[Media]',
        unreadCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });
  }

  // 3. Reset the 24-Hour Customer Care Window (Meta rule)
  const windowExpiresAt = await ComplianceService.resetCustomerWindow(
    tenantId,
    conversation.id,
    messageDate
  );

  // 4. Save incoming message idempotently using providerMessageId
  const existingMessage = await prisma.message.findUnique({
    where: { providerMessageId: msg.id },
  });

  if (existingMessage) {
    return; // Already processed (idempotent)
  }

  const createdMessage = await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      senderType: SenderType.CONTACT,
      content: textContent,
      mediaId,               // Meta Passthrough: store media_id, no S3
      mediaUrl: null,        // Local storage URL — not used for WhatsApp
      providerMessageId: msg.id,
      deliveryStatus: MessageStatus.DELIVERED,
      createdAt: messageDate,
    },
  });

  // 5. Broadcast to Agent Dashboard via Socket.io (real-time)
  const io = getSocketGateway();
  if (io) {
    io.to(`tenant:${tenantId}`).emit('message:new', {
      message: {
        id: createdMessage.id,
        tenantId,
        conversationId: conversation.id,
        senderType: 'CUSTOMER',
        senderId: contact.id,
        senderName: contact.name || customerPhone,
        content: createdMessage.content || '',
        isTemplate: false,
        templateName: null,
        metaMessageId: createdMessage.providerMessageId,
        deliveryStatus: 'DELIVERED',
        createdAt: createdMessage.createdAt.toISOString(),
      },
      windowExpiresAt: windowExpiresAt.toISOString(),
    });
  }
}

async function handleMessageStatusUpdate(
  tenantId: string,
  statusObj: MetaMessageStatus
): Promise<void> {
  const statusMap: Record<string, MessageStatus> = {
    sent:      MessageStatus.SENT,
    delivered: MessageStatus.DELIVERED,
    read:      MessageStatus.READ,
    failed:    MessageStatus.FAILED,
  };

  const newStatus = statusMap[statusObj.status];
  if (!newStatus) return;

  // Update by providerMessageId (previously metaMessageId)
  const updated = await prisma.message.updateMany({
    where: {
      providerMessageId: statusObj.id,
      tenantId,
    },
    data: {
      deliveryStatus: newStatus,
    },
  });

  if (updated.count > 0) {
    const io = getSocketGateway();
    if (io) {
      io.to(`tenant:${tenantId}`).emit('message:status', {
        messageId: statusObj.id,
        status: newStatus,
      });
    }
  }
}

