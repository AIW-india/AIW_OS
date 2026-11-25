import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    };

    if (env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
}
