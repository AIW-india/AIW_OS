import crypto from 'node:crypto';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  basePath: `/api/${env.API_VERSION}/auth`,
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || 'aiw-os-dev-secret-change-in-prod',
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  trustedOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
});
