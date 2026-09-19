import { Request, Response } from 'express';
import { BusinessHoursService } from '../services/businessHours.service';

export class BusinessHoursController {
  /**
   * GET /api/business-hours
   * Retrieve the weekly business hours schedule for the tenant
   */
  public static async getHours(req: Request, res: Response) {
    try {
      const rawTenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'] || req.query.tenantId;
      if (!rawTenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const schedule = await BusinessHoursService.getTenantSchedule(String(rawTenantId));
      const isCurrentlyOpen = await BusinessHoursService.isWithinBusinessHours(String(rawTenantId));

      return res.json({
        success: true,
        isCurrentlyOpen,
        schedule,
      });
    } catch (err: any) {
      console.error('[BusinessHoursController] getHours error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * PUT /api/business-hours
   * Update the weekly business hours schedule for the tenant
   */
  public static async updateHours(req: Request, res: Response) {
    try {
      const rawTenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'] || req.body.tenantId;
      if (!rawTenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
      }

      const { schedule } = req.body;
      if (!Array.isArray(schedule)) {
        return res.status(400).json({ error: 'schedule must be an array of daily configurations' });
      }

      const updated = await BusinessHoursService.updateTenantSchedule(String(rawTenantId), schedule);
      const isCurrentlyOpen = await BusinessHoursService.isWithinBusinessHours(String(rawTenantId));

      return res.json({
        success: true,
        message: 'Business hours updated successfully',
        isCurrentlyOpen,
        schedule: updated,
      });
    } catch (err: any) {
      console.error('[BusinessHoursController] updateHours error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}
