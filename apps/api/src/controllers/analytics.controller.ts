import { Request, Response } from 'express';
import { prisma, ResolutionType } from '@omni/database';
import { BillingService, toValidUuid } from '../services/billing.service';

export class AnalyticsController {
  /**
   * GET /api/analytics
   * Aggregates real-time business, AI, and response metrics for the tenant dashboard.
   */
  public static async getAnalytics(req: Request, res: Response) {
    try {
      const rawTenantId =
        (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || 'demo-tenant-1';
      const tenantId = toValidUuid(rawTenantId);

      // 1. Total conversations count
      const totalConversations = await prisma.conversation.count({
        where: { tenantId },
      });

      // 2. Status counts (OPEN, RESOLVED)
      const openConversations = await prisma.conversation.count({
        where: { tenantId, status: 'OPEN' },
      });

      const resolvedConversations = await prisma.conversation.count({
        where: { tenantId, status: 'RESOLVED' },
      });

      // 3. AI Resolution Rate
      const aiResolvedCount = await prisma.conversation.count({
        where: {
          tenantId,
          resolutionType: ResolutionType.AI_RESOLVED,
        },
      });

      const humanResolvedCount = await prisma.conversation.count({
        where: {
          tenantId,
          resolutionType: ResolutionType.HUMAN_RESOLVED,
        },
      });

      const aiResolutionRate =
        resolvedConversations > 0
          ? Number(((aiResolvedCount / resolvedConversations) * 100).toFixed(1))
          : 0;

      // 4. Average Time to First Response (in seconds)
      const convsWithFirstResponse = await prisma.conversation.findMany({
        where: {
          tenantId,
          firstResponseAt: { not: null },
        },
        select: {
          createdAt: true,
          firstResponseAt: true,
        },
        take: 1000,
      });

      let avgFirstResponseSeconds = 0;
      if (convsWithFirstResponse.length > 0) {
        const totalDurationMs = convsWithFirstResponse.reduce((acc, conv) => {
          if (conv.firstResponseAt && conv.createdAt) {
            const diff = conv.firstResponseAt.getTime() - conv.createdAt.getTime();
            return acc + Math.max(0, diff);
          }
          return acc;
        }, 0);
        avgFirstResponseSeconds = Math.round(
          totalDurationMs / convsWithFirstResponse.length / 1000
        );
      }

      // 5. Channel Breakdown (WhatsApp, Web Widget, etc.)
      const channelGroup = await prisma.conversation.groupBy({
        by: ['channel'],
        where: { tenantId },
        _count: { id: true },
      });

      const channelBreakdown: Record<string, number> = {};
      channelGroup.forEach((g) => {
        channelBreakdown[g.channel] = g._count.id;
      });

      // 6. Token Usage & Subscription Info
      const billingSummary = await BillingService.getTenantBillingSummary(tenantId);

      // 7. Messages Count
      const totalMessages = await prisma.message.count({
        where: { tenantId },
      });

      return res.status(200).json({
        success: true,
        tenantId,
        metrics: {
          totalConversations,
          openConversations,
          resolvedConversations,
          aiResolvedCount,
          humanResolvedCount,
          aiResolutionRate, // Percentage e.g. 78.5%
          avgFirstResponseSeconds, // Seconds e.g. 42
          totalMessages,
        },
        channelBreakdown,
        billing: {
          tokenBalance: billingSummary.balance,
          totalConsumedTokens: billingSummary.totalConsumedTokens,
          planName: billingSummary.planName,
          status: billingSummary.status,
          recentTransactions: billingSummary.recentTransactions.slice(0, 5),
        },
      });
    } catch (err: any) {
      console.error('[AnalyticsController] Error gathering metrics:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to aggregate analytics metrics',
        message: err.message,
      });
    }
  }
}
