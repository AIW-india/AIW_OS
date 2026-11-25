import { Router, type Request, type Response } from 'express';
import type { ApiResponse, HealthResponseData } from '@aiw/shared-types';
import { checkDatabaseHealth } from '../../database/prisma.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.status === 'connected';

  const healthData: HealthResponseData = {
    status: isHealthy ? 'ok' : 'degraded',
    service: 'aiw-os-api',
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbHealth,
  };

  const payload: ApiResponse<HealthResponseData> = {
    data: healthData,
    meta: {
      requestId: req.id,
    },
  };

  res.status(200).json(payload);
});

export const healthRoutes = router;
