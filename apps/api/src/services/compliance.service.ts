import { prisma, ChannelType } from '@omni/database';
import { redisConnection } from '../config/redis';
import { WindowComplianceDTO } from '@omni/types';

export class ComplianceService {
  public static readonly WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

  /**
   * Evaluates if an agent or system can send a free-form message to a conversation.
   * If > 24 hours have passed since the customer's last message, returns requiresTemplate: true.
   */
  public static async checkConversationWindow(
    tenantId: string,
    conversationId: string
  ): Promise<WindowComplianceDTO> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      select: {
        channel: true,
        lastCustomerMessageAt: true,
        windowExpiresAt: true,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation not found for tenant: ${tenantId}`);
    }

    // Channels like web widgets are exempt from Meta's 24h constraint
    if (conversation.channel !== ChannelType.WHATSAPP && conversation.channel !== ChannelType.MESSENGER) {
      return {
        canSendFreeForm: true,
        remainingMs: Infinity,
        expiresAt: null,
        requiresTemplate: false,
      };
    }

    if (!conversation.lastCustomerMessageAt || !conversation.windowExpiresAt) {
      return {
        canSendFreeForm: false,
        remainingMs: 0,
        expiresAt: null,
        requiresTemplate: true,
      };
    }

    const now = Date.now();
    const expiresAtMs = conversation.windowExpiresAt.getTime();
    const remainingMs = expiresAtMs - now;
    const isWindowOpen = remainingMs > 0;

    return {
      canSendFreeForm: isWindowOpen,
      remainingMs: Math.max(0, remainingMs),
      expiresAt: conversation.windowExpiresAt.toISOString(),
      requiresTemplate: !isWindowOpen,
    };
  }

  /**
   * Resets the 24-Hour window.
   * CRITICAL META RULE: This MUST ONLY be called when an INCOMING CUSTOMER message is received.
   * Agent replies do not reset the window.
   */
  public static async resetCustomerWindow(
    tenantId: string,
    conversationId: string,
    customerMessageDate: Date
  ): Promise<Date> {
    const windowExpiresAt = new Date(
      customerMessageDate.getTime() + this.WINDOW_DURATION_MS
    );

    await prisma.conversation.updateMany({
      where: { id: conversationId, tenantId },
      data: {
        lastCustomerMessageAt: customerMessageDate,
        windowExpiresAt,
      },
    });

    return windowExpiresAt;
  }

  /**
   * Outgoing Meta Rate Limiter (Sliding Window Log via Redis)
   * Ensures the tenant does not burst beyond Meta API rate limits (e.g. 40 req/sec).
   */
  public static async throttleOutgoingMessage(
    tenantId: string,
    maxPerSecond: number = 40
  ): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const key = `ratelimit:meta:outgoing:${tenantId}`;
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    const pipeline = redisConnection.pipeline();
    // Remove requests older than 1 second
    pipeline.zremrangebyscore(key, 0, oneSecondAgo);
    // Count remaining
    pipeline.zcard(key);
    // Add current request timestamp
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).substring(2, 7)}`);
    // Key TTL
    pipeline.expire(key, 2);

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    if (currentCount >= maxPerSecond) {
      const waitTime = 1000 - (now % 1000);
      return { allowed: false, retryAfterMs: waitTime };
    }

    return { allowed: true, retryAfterMs: 0 };
  }
}
