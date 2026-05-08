import { PrismaClient } from '@prisma/client';

/** Avoid calling `loadEnv()` at module import — workers import Prisma before `bootstrapInfrastructure()`. */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
