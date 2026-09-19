import crypto from 'crypto';

/**
 * Ensures that any string identifier (e.g. 'demo-tenant-1') is converted
 * into a valid RFC4122 v4 UUID format. If the string is already a valid UUID,
 * it is returned as-is. Otherwise, it deterministically generates a v4-formatted UUID
 * using MD5 so that the same string always maps to the same UUID in PostgreSQL.
 */
export function toValidUuid(id: string): string {
  if (!id) {
    return '00000000-0000-0000-0000-000000000000';
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
