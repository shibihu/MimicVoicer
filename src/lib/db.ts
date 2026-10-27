import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getOrCreateDefaultUser() {
  const existing = await prisma.user.findFirst({
    where: { email: 'default@mimicvoicer.studio' },
  });

  if (existing) return existing;

  return await prisma.user.create({
    data: {
      email: 'default@mimicvoicer.studio',
      name: 'Default Studio User',
    },
  });
}
