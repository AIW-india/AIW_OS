import { PrismaClient } from '@prisma/client';
import type { DatabaseHealthInfo } from '@aiw/shared-types';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Checks PostgreSQL connectivity via Prisma.
 * Never throws; returns structured health info.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthInfo> {
  const dbUrl = env.DATABASE_URL;

  if (!dbUrl || dbUrl.includes('ep-example-dev')) {
    return {
      status: 'unconfigured',
      error: 'DATABASE_URL is not configured with a valid Neon PostgreSQL connection string.',
    };
  }

  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 'connected',
      latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return {
      status: 'disconnected',
      error: message,
    };
  }
}
