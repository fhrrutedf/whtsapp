import { prisma, SenderType, MessageStatus } from '@omni/database';
import { getSocketGateway } from '../sockets/socketGateway';
import { localStore } from './store.service';
import { toValidUuid } from './billing.service';

/**
 * Sets or updates the SLA breach timestamp for a conversation.
 * Default window is 15 minutes.
 */
export async function setConversationSla(
  conversationId: string,
  slaMinutes = 15
): Promise<Date> {
  const breachAt = new Date(Date.now() + slaMinutes * 60 * 1000);
  const targetId = toValidUuid(conversationId);

  try {
    await prisma.conversation.update({
      where: { id: targetId },
      data: { slaBreachAt: breachAt },
    });
  } catch (err: any) {
    console.warn(`[SLAMonitor] Could not update slaBreachAt in DB for ${conversationId}:`, err.message);
  }

  return breachAt;
}

/**
 * Checks for conversations where the SLA response time has been breached.
 * Condition:
 * 1. Conversation has an assigned human agent (assignedUserId is not null).
 * 2. Conversation status is 'OPEN'.
 * 3. slaBreachAt is in the past (<= new Date()).
 */
export async function checkSlaBreaches(): Promise<void> {
  try {
    const now = new Date();

    const breachedConversations = await prisma.conversation.findMany({
      where: {
        assignedUserId: { not: null },
        status: 'OPEN',
        slaBreachAt: {
          not: null,
          lte: now,
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
          },
        },
      },
    });

    if (breachedConversations.length === 0) {
      return;
    }

    console.log(`[SLAMonitor] ⚠️ Detected ${breachedConversations.length} SLA breach(es)!`);

    const gateway = getSocketGateway();

    for (const conv of breachedConversations) {
      const tenantId = conv.tenantId;
      const conversationId = conv.id;
      const customerPhone = conv.contact?.phoneNumber || 'Unknown';
      const customerName = conv.contact?.name || customerPhone;

      console.warn(
        `[SLAMonitor] 🚨 SLA Breached for Tenant: ${tenantId} | Conversation: ${conversationId} | Assigned Agent: ${conv.assignedUserId}`
      );

      // 1. Emit Socket.io real-time alert to Tenant Admin & Dashboard
      if (gateway) {
        (gateway as any).to(`tenant:${tenantId}`).emit('sla:breached', {
          conversationId,
          tenantId,
          assignedUserId: conv.assignedUserId,
          customerPhone,
          customerName,
          breachedAt: conv.slaBreachAt,
          alertMessage: `تنبيه: محادثة العميل (${customerName}) تجاوزت وقت الاستجابة المحدد (SLA)`,
        });
      }

      // 2. Inject an internal system audit note
      const internalNoteText = `⚠️ [تنبيه نظام SLA]: تم تجاوز الوقت الأقصى المحدد للرد على العميل (${customerName}) من قِبل الموظف المسند إليه. يرجى التدخل الفوري.`;

      try {
        const sysMsg = await prisma.message.create({
          data: {
            tenantId,
            conversationId,
            senderType: SenderType.AGENT,
            content: internalNoteText,
            deliveryStatus: MessageStatus.SENT,
          },
        });

        // Also push to localStore for instant frontend reactive rendering
        const localMsgObj = {
          id: sysMsg.id,
          tenantId,
          conversationId,
          senderType: 'AGENT' as const,
          senderId: 'sla-escalation-system',
          senderName: 'SLA Escalation Engine',
          content: internalNoteText,
          deliveryStatus: 'SENT' as const,
          createdAt: new Date().toISOString(),
        };
        localStore.saveMessage(localMsgObj);

        if (gateway) {
          (gateway as any).to(`tenant:${tenantId}`).emit('message:new', {
            message: { ...localMsgObj, isTemplate: false, templateName: null, metaMessageId: sysMsg.id },
          });
        }
      } catch (msgErr: any) {
        console.warn(`[SLAMonitor] Note insertion error for ${conversationId}:`, msgErr.message);
      }

      // 3. Clear slaBreachAt so we don't alert repeatedly for the same breach
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { slaBreachAt: null },
      });
    }
  } catch (err: any) {
    console.error('[SLAMonitor] Error running SLA breach check:', err.message);
  }
}

/**
 * Starts the SLA Monitor cron / interval.
 * Runs check every 5 minutes (300,000 ms).
 */
export function startSlaMonitor(): NodeJS.Timeout {
  console.log('⏱️ [SLAMonitor] SLA & Auto-Escalation Engine started (Interval: 5 minutes)');
  
  // Initial check after 10 seconds of startup
  setTimeout(() => {
    checkSlaBreaches().catch(() => {});
  }, 10000);

  // Recurring 5-minute interval
  return setInterval(() => {
    checkSlaBreaches().catch(() => {});
  }, 5 * 60 * 1000);
}
