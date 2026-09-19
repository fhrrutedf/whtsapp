const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const tenants = await prisma.tenant.count();
    const users = await prisma.user.count();
    const convs = await prisma.conversation.count();
    const messages = await prisma.message.count();
    console.log({ tenants, users, convs, messages });
  } catch (err) {
    console.error('Inspect error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
