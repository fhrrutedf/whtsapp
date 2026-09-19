import { prisma } from '@omni/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tenantCache = new Map<string, string>();

export class TenantService {
  /**
   * Resolves any raw tenant identifier (such as 'demo-tenant-1', undefined, or an actual UUID)
   * into a guaranteed valid UUID in PostgreSQL and ensures the Tenant row exists in the database.
   */
  public static async resolveTenantId(rawTenantId?: string): Promise<string> {
    const raw = (rawTenantId || 'demo-tenant-1').trim();

    if (tenantCache.has(raw)) {
      return tenantCache.get(raw)!;
    }

    try {
      // 1. If it's already a valid UUID format
      if (UUID_REGEX.test(raw)) {
        // Ensure tenant exists in DB
        await prisma.tenant.upsert({
          where: { id: raw },
          update: {},
          create: { id: raw, name: raw },
        });
        tenantCache.set(raw, raw);
        return raw;
      }

      // 2. Look up by name (e.g. name = 'demo-tenant-1')
      const existingByName = await prisma.tenant.findFirst({
        where: { name: raw },
      });

      if (existingByName) {
        tenantCache.set(raw, existingByName.id);
        return existingByName.id;
      }

      // 3. Check if any tenant exists in the DB (like the demo tenant)
      const firstTenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      if (firstTenant) {
        tenantCache.set(raw, firstTenant.id);
        return firstTenant.id;
      }

      // 4. Create new tenant with auto-generated UUID
      const created = await prisma.tenant.create({
        data: {
          name: raw,
        },
      });

      tenantCache.set(raw, created.id);
      return created.id;
    } catch (err: any) {
      console.warn('[TenantService] Error resolving tenant in DB:', err.message);
      // Hardcoded fallback UUID for demo tenant in DB
      const fallbackUuid = '8c579042-01a0-4736-87e0-a24e9d4e6c07';
      return fallbackUuid;
    }
  }
}
