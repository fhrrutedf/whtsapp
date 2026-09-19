import { Request, Response } from 'express';
import { prisma } from '@omni/database';
import { campaignQueue } from '../queues/campaign.queue';
import { toValidUuid } from '../services/billing.service';

function resolveTenantId(req: Request): string {
  const val = (req as any).user?.tenantId || req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId;
  if (!val) {
    throw new Error('tenantId is required');
  }
  const str = Array.isArray(val) ? val[0] : String(val);
  return toValidUuid(str);
}

function resolveOptionalTenantId(req: Request): string | undefined {
  const val = (req as any).user?.tenantId || req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId;
  if (!val) return undefined;
  const str = Array.isArray(val) ? val[0] : String(val);
  return toValidUuid(str);
}

function resolveParamId(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : String(param);
}

export class CampaignController {
  /**
   * POST /api/campaigns
   * Create a new broadcast campaign with recipients
   */
  public static async createCampaign(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantId(req);
      const { name, messageText, recipientPhoneNumbers, scheduledAt } = req.body;

      if (!name || !messageText) {
        return res.status(400).json({ error: 'name and messageText are required' });
      }

      if (!Array.isArray(recipientPhoneNumbers) || recipientPhoneNumbers.length === 0) {
        return res.status(400).json({ error: 'recipientPhoneNumbers must be a non-empty array of phone numbers' });
      }

      // Deduplicate phone numbers
      const uniquePhones = Array.from(
        new Set(
          recipientPhoneNumbers
            .map((p: string) => String(p).trim().replace(/\s+/g, ''))
            .filter((p: string) => p.length > 5)
        )
      );

      if (uniquePhones.length === 0) {
        return res.status(400).json({ error: 'No valid phone numbers provided' });
      }

      // Find existing contacts for these phones to link contactId
      const contacts = await prisma.contact.findMany({
        where: {
          tenantId,
          phoneNumber: { in: uniquePhones },
        },
        select: { id: true, phoneNumber: true },
      });

      const phoneToContactId = new Map(
        contacts
          .filter((c) => c.phoneNumber !== null)
          .map((c) => [c.phoneNumber as string, c.id])
      );

      // Create Campaign in DB
      const campaign = await prisma.campaign.create({
        data: {
          tenantId,
          name,
          messageText,
          status: 'DRAFT',
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          totalCount: uniquePhones.length,
          sentCount: 0,
          failedCount: 0,
          recipients: {
            create: uniquePhones.map((phone) => ({
              phoneNumber: phone,
              contactId: phoneToContactId.get(phone) || null,
              status: 'PENDING',
            })),
          },
        },
      });

      return res.status(201).json({
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalCount: campaign.totalCount,
          createdAt: campaign.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[CampaignController] createCampaign error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/campaigns/:id/start
   * Start or queue a broadcast campaign
   */
  public static async startCampaign(req: Request, res: Response) {
    try {
      const id = resolveParamId(req.params.id);
      const tenantId = resolveOptionalTenantId(req);

      const campaign = await prisma.campaign.findUnique({
        where: { id },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (tenantId && campaign.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied to this campaign' });
      }

      if (campaign.status === 'PROCESSING') {
        return res.status(400).json({ error: 'Campaign is already processing' });
      }

      if (campaign.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Campaign has already completed' });
      }

      const pendingCount = await prisma.campaignRecipient.count({
        where: { campaignId: id, status: 'PENDING' },
      });

      // Update status to SCHEDULED
      await prisma.campaign.update({
        where: { id },
        data: { status: 'SCHEDULED' },
      });

      // Add to BullMQ queue
      const job = await campaignQueue.add(
        'execute-campaign',
        { campaignId: campaign.id, tenantId: campaign.tenantId },
        { jobId: `campaign_${campaign.id}_${Date.now()}` }
      );

      return res.json({
        success: true,
        message: 'Campaign queued successfully for anti-ban drip dispatch',
        jobId: job.id,
        campaignId: campaign.id,
        pendingRecipients: pendingCount,
      });
    } catch (err: any) {
      console.error('[CampaignController] startCampaign error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/campaigns
   * List all campaigns for the current tenant
   */
  public static async getCampaigns(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantId(req);

      const campaigns = await prisma.campaign.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          messageText: c.messageText,
          status: c.status,
          scheduledAt: c.scheduledAt,
          completedAt: c.completedAt,
          totalCount: c.totalCount,
          sentCount: c.sentCount,
          failedCount: c.failedCount,
          createdAt: c.createdAt,
        })),
      });
    } catch (err: any) {
      console.error('[CampaignController] getCampaigns error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/campaigns/:id
   * Get single campaign details and recipients breakdown
   */
  public static async getCampaignById(req: Request, res: Response) {
    try {
      const id = resolveParamId(req.params.id);

      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          recipients: {
            orderBy: { createdAt: 'asc' },
            take: 200, // Safety limit
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      return res.json({
        success: true,
        campaign,
      });
    } catch (err: any) {
      console.error('[CampaignController] getCampaignById error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /api/campaigns/:id/cancel
   * Cancel an active or scheduled campaign
   */
  public static async cancelCampaign(req: Request, res: Response) {
    try {
      const id = resolveParamId(req.params.id);

      const campaign = await prisma.campaign.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return res.json({
        success: true,
        message: 'Campaign cancelled',
        campaign,
      });
    } catch (err: any) {
      console.error('[CampaignController] cancelCampaign error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
