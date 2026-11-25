import { z } from 'zod';

/**
 * UUID parameter schema
 */
export const UuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const IdParamSchema = z.object({
  id: UuidSchema,
});

/**
 * Pagination query schema per AIW OS API specification
 */
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 25))
    .pipe(z.number().int().min(1).max(100).default(25)),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Environment configuration validation schema
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 5000))
    .pipe(z.number().default(5000)),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
