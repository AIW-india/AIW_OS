import express, { type Express, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestIdMiddleware } from './common/middleware/request-id.js';
import { requestLoggerMiddleware } from './common/middleware/logger.js';
import { errorHandlerMiddleware } from './common/middleware/error-handler.js';
import { NotFoundError } from './common/errors/app-error.js';
import { healthRoutes } from './modules/health/health.routes.js';

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

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request tracking & logging
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // Versioned API router (/api/v1)
  const v1Router = Router();
  v1Router.use('/health', healthRoutes);

  app.use(`/api/${env.API_VERSION}`, v1Router);

  // 404 handler for unmatched routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralised error handling
  app.use(errorHandlerMiddleware);

  return app;
}
