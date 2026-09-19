import { prisma } from '@omni/database';
import { toValidUuid } from './billing.service';

export interface BusinessHourInput {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string;  // "09:00"
  closeTime: string; // "18:00"
  isClosed: boolean;
}

export class BusinessHoursService {
  /**
   * Default business hours schedule (Sun - Thu: 09:00 - 18:00, Fri - Sat: Closed)
   */
  private static getDefaultSchedule(dayOfWeek: number): { openTime: string; closeTime: string; isClosed: boolean } {
    // 5 = Friday, 6 = Saturday (Standard Middle East weekend)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return { openTime: '09:00', closeTime: '18:00', isClosed: true };
    }
    return { openTime: '09:00', closeTime: '18:00', isClosed: false };
  }

  /**
   * Evaluates if the given tenant is currently within operating business hours.
   */
  public static async isWithinBusinessHours(rawTenantId: string, checkDate: Date = new Date()): Promise<boolean> {
    try {
      const tenantId = toValidUuid(rawTenantId);
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 6 = Saturday

      const record = await prisma.businessHours.findFirst({
        where: {
          tenantId,
          dayOfWeek,
        },
      });

      const config = record
        ? { openTime: record.openTime, closeTime: record.closeTime, isClosed: record.isClosed }
        : this.getDefaultSchedule(dayOfWeek);

      if (config.isClosed) {
        return false;
      }

      // Convert current time to HH:mm
      const hours = checkDate.getHours().toString().padStart(2, '0');
      const minutes = checkDate.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      return currentTimeStr >= config.openTime && currentTimeStr <= config.closeTime;
    } catch (err: any) {
      console.warn('[BusinessHoursService] Fallback to open on error:', err.message);
      return true; // Fail open to not block customer service
    }
  }

  /**
   * Fetches full weekly business hours schedule for a tenant.
   */
  public static async getTenantSchedule(rawTenantId: string) {
    const tenantId = toValidUuid(rawTenantId);

    const existing = await prisma.businessHours.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: 'asc' },
    });

    if (existing.length === 7) {
      return existing;
    }

    // Return full 7 days filling in defaults if missing
    const fullWeek = [];
    for (let day = 0; day < 7; day++) {
      const found = existing.find((e) => e.dayOfWeek === day);
      if (found) {
        fullWeek.push(found);
      } else {
        const def = this.getDefaultSchedule(day);
        fullWeek.push({
          id: `default_${day}`,
          tenantId,
          dayOfWeek: day,
          openTime: def.openTime,
          closeTime: def.closeTime,
          isClosed: def.isClosed,
        });
      }
    }

    return fullWeek;
  }

  /**
   * Upserts the weekly business hours schedule for a tenant.
   */
  public static async updateTenantSchedule(rawTenantId: string, hoursList: BusinessHourInput[]) {
    const tenantId = toValidUuid(rawTenantId);

    const upsertPromises = hoursList.map((item) =>
      prisma.businessHours.upsert({
        where: {
          tenantId_dayOfWeek: {
            tenantId,
            dayOfWeek: item.dayOfWeek,
          },
        },
        create: {
          tenantId,
          dayOfWeek: item.dayOfWeek,
          openTime: item.openTime,
          closeTime: item.closeTime,
          isClosed: item.isClosed,
        },
        update: {
          openTime: item.openTime,
          closeTime: item.closeTime,
          isClosed: item.isClosed,
        },
      })
    );

    return await Promise.all(upsertPromises);
  }
}
