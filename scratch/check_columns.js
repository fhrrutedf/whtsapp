const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('tenants', 'conversations', 'messages')
      ORDER BY table_name, ordinal_position;
    `);
    console.log(JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error('Column query error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
