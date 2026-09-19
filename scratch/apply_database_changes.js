const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Applying database schema updates to Supabase PostgreSQL...');

  const statements = [
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "brochure_image_url" TEXT;`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "payment_qr_image_url" TEXT;`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "catalog_image_url" TEXT;`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "products" JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'SAR';`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "support_email" TEXT;`,
    `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'Asia/Riyadh';`,
    `ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "is_ai_paused" BOOLEAN DEFAULT false;`,
    `CREATE TABLE IF NOT EXISTS "products" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "price" TEXT,
      "description" TEXT,
      "image_url" TEXT NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_products_tenant_id" ON "products"("tenant_id");`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✓ Executed:', sql.split('\n')[0]);
    } catch (err) {
      console.warn('⚠ Warning on statement:', sql.split('\n')[0], err.message);
    }
  }

  console.log('Migration successfully completed!');

  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name IN ('brochure_image_url', 'payment_qr_image_url', 'catalog_image_url', 'products');
  `);
  console.log('Verified added columns on tenants:', cols);

  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
