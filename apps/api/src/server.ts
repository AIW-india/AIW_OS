import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { syncSuperAdminPermissions } from './common/rbac/permissions-catalog.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(
    `[AIW OS API] Server running on http://localhost:${env.PORT}/api/${env.API_VERSION} (${env.NODE_ENV})`,
  );
  syncSuperAdminPermissions().catch((err) => {
    console.error('[AIW OS API] Failed to sync Super Admin baseline permissions:', err);
  });
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[AIW OS API] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[AIW OS API] Server and database connections closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
