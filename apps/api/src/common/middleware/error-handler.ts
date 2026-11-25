import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@aiw/shared-types';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.id;

  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    const response: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        requestId,
      },
    };
    res.status(422).json(response);
    return;
  }

  // Unexpected internal error
  console.error('[Unhandled Error]', { requestId, error: err });

  const response: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      requestId,
    },
  };
  res.status(500).json(response);
}
