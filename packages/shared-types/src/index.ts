/**
 * AIW OS Shared Types
 * Baseline data contracts aligned with AIW_OS_API_SPECIFICATION_v0.1.md
 */

export interface ApiMeta {
  requestId?: string;
  [key: string]: unknown;
}

export interface PaginationMeta extends ApiMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export type DatabaseConnectionStatus = 'connected' | 'disconnected' | 'unconfigured' | 'error';

export interface DatabaseHealthInfo {
  status: DatabaseConnectionStatus;
  latencyMs?: number;
  error?: string;
}

export interface HealthResponseData {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  environment: string;
  uptime: number;
  timestamp: string;
  database: DatabaseHealthInfo;
}

export interface TenantContext {
  organisationId: string;
  userId?: string;
  roles?: string[];
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationEntity extends BaseEntity {
  name: string;
  legalName?: string | null;
  slug: string;
  status: string;
  timezone: string;
  defaultCurrency: string;
}

export interface UserEntity extends BaseEntity {
  email: string;
  displayName: string;
  phone?: string | null;
  status: string;
}
