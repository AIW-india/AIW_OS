import express, { type Express, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { auth } from './common/auth/better-auth.js';
import { requestIdMiddleware } from './common/middleware/request-id.js';
import { requestLoggerMiddleware } from './common/middleware/logger.js';
import { errorHandlerMiddleware } from './common/middleware/error-handler.js';
import { NotFoundError } from './common/errors/app-error.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authCustomRoutes } from './modules/auth/auth.routes.js';
import { organisationRoutes } from './modules/organisation/organisation.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { departmentRoutes } from './modules/departments/departments.routes.js';
import { designationRoutes } from './modules/designations/designations.routes.js';
import { roleRoutes } from './modules/roles/roles.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Security & CORS middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // Request tracking & logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Better Auth handler (must be mounted before express.json())
  const authBasePath = `/api/${env.API_VERSION}/auth`;
  app.use(`${authBasePath}/me`, express.json({ limit: '1mb' }));
  app.use(`${authBasePath}/bootstrap`, express.json({ limit: '1mb' }));
  app.use(`${authBasePath}/accept-invitation`, express.json({ limit: '1mb' }));
  app.use(authBasePath, authCustomRoutes);
  app.all(`${authBasePath}/*`, toNodeHandler(auth));

  // Body parsing for all other routes
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Versioned API router (/api/v1)
  const v1Router = Router();
  v1Router.use('/health', healthRoutes);
  v1Router.use('/organisations', organisationRoutes);
  v1Router.use('/users', userRoutes);
  v1Router.use('/departments', departmentRoutes);
  v1Router.use('/designations', designationRoutes);
  v1Router.use('/roles', roleRoutes);
  v1Router.use('/audit-logs', auditRoutes);

  app.use(`/api/${env.API_VERSION}`, v1Router);

  // 404 handler for unmatched routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralised error handling
  app.use(errorHandlerMiddleware);

  return app;
}
