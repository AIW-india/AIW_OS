import type { ApiResponse, ApiErrorResponse, HealthResponseData } from '@aiw/shared-types';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown[];
  public readonly requestId?: string;

  constructor(errorResponse: ApiErrorResponse, status: number) {
    super(errorResponse.error.message || 'API request failed');
    this.name = 'ApiError';
    this.code = errorResponse.error.code || 'UNKNOWN_ERROR';
    this.status = status;
    this.details = errorResponse.error.details;
    this.requestId = errorResponse.error.requestId;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null | Promise<string | null>;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.getAuthToken = config.getAuthToken;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(config.defaultHeaders || {}),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      credentials: options.credentials ?? 'include',
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const responseData = isJson ? ((await response.json()) as Record<string, unknown>) : null;

    if (!response.ok) {
      if (responseData && 'error' in responseData && responseData.error) {
        throw new ApiError(responseData as unknown as ApiErrorResponse, response.status);
      }
      throw new ApiError(
        {
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText || 'Request failed',
            requestId: response.headers.get('x-request-id') || undefined,
          },
        },
        response.status,
      );
    }

    return responseData as unknown as ApiResponse<T>;
  }

  public async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Health Check API endpoint
   */
  public async getHealth(): Promise<ApiResponse<HealthResponseData>> {
    return this.get<HealthResponseData>('/health');
  }
}
