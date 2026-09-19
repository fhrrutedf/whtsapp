import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from './encryption';

declare global {
  var prisma: any | undefined;
}

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Attach Encryption at Rest Extension (AES-256-GCM)
const extendedPrisma = basePrisma.$extends({
  name: 'encryption-at-rest',
  query: {
    channelConfig: {
      async create({ args, query }) {
        if ((args.data as any).encryptedKey) {
          (args.data as any).encryptedKey = encrypt((args.data as any).encryptedKey);
        }
        if ((args.data as any).apiKeyEncrypted) {
          (args.data as any).apiKeyEncrypted = encrypt((args.data as any).apiKeyEncrypted);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        if ((result as any)?.apiKeyEncrypted) (result as any).apiKeyEncrypted = decrypt((result as any).apiKeyEncrypted);
        return result;
      },
      async update({ args, query }) {
        if ((args.data as any).encryptedKey) {
          (args.data as any).encryptedKey = encrypt((args.data as any).encryptedKey);
        }
        if ((args.data as any).apiKeyEncrypted) {
          (args.data as any).apiKeyEncrypted = encrypt((args.data as any).apiKeyEncrypted);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        if ((result as any)?.apiKeyEncrypted) (result as any).apiKeyEncrypted = decrypt((result as any).apiKeyEncrypted);
        return result;
      },
      async upsert({ args, query }) {
        if ((args.create as any).encryptedKey) {
          (args.create as any).encryptedKey = encrypt((args.create as any).encryptedKey);
        }
        if ((args.create as any).apiKeyEncrypted) {
          (args.create as any).apiKeyEncrypted = encrypt((args.create as any).apiKeyEncrypted);
        }
        if ((args.update as any).encryptedKey) {
          (args.update as any).encryptedKey = encrypt((args.update as any).encryptedKey);
        }
        if ((args.update as any).apiKeyEncrypted) {
          (args.update as any).apiKeyEncrypted = encrypt((args.update as any).apiKeyEncrypted);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        if ((result as any)?.apiKeyEncrypted) (result as any).apiKeyEncrypted = decrypt((result as any).apiKeyEncrypted);
        return result;
      },
      async findFirst({ args, query }) {
        const result = await query(args);
        if (result) {
          if ((result as any).encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
          if ((result as any).apiKeyEncrypted) (result as any).apiKeyEncrypted = decrypt((result as any).apiKeyEncrypted);
        }
        return result;
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        if (result) {
          if ((result as any).encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
          if ((result as any).apiKeyEncrypted) (result as any).apiKeyEncrypted = decrypt((result as any).apiKeyEncrypted);
        }
        return result;
      },
      async findMany({ args, query }) {
        const results = await query(args);
        return results.map((r: any) => {
          if (r.encryptedKey) r.encryptedKey = decrypt(r.encryptedKey);
          if (r.apiKeyEncrypted) r.apiKeyEncrypted = decrypt(r.apiKeyEncrypted);
          return r;
        });
      },
    },
    aIAgentConfig: {
      async create({ args, query }) {
        if ((args.data as any).encryptedKey) {
          (args.data as any).encryptedKey = encrypt((args.data as any).encryptedKey);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        return result;
      },
      async update({ args, query }) {
        if ((args.data as any).encryptedKey) {
          (args.data as any).encryptedKey = encrypt((args.data as any).encryptedKey);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        return result;
      },
      async upsert({ args, query }) {
        if ((args.create as any).encryptedKey) {
          (args.create as any).encryptedKey = encrypt((args.create as any).encryptedKey);
        }
        if ((args.update as any).encryptedKey) {
          (args.update as any).encryptedKey = encrypt((args.update as any).encryptedKey);
        }
        const result = await query(args);
        if ((result as any)?.encryptedKey) (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        return result;
      },
      async findFirst({ args, query }) {
        const result = await query(args);
        if ((result as any)?.encryptedKey) {
          (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        }
        return result;
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        if ((result as any)?.encryptedKey) {
          (result as any).encryptedKey = decrypt((result as any).encryptedKey);
        }
        return result;
      },
      async findMany({ args, query }) {
        const results = await query(args);
        return results.map((r: any) => {
          if (r.encryptedKey) r.encryptedKey = decrypt(r.encryptedKey);
          return r;
        });
      },
    },
  },
});

export const prisma = (global.prisma || extendedPrisma) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export * from '@prisma/client';
export * from './encryption';
