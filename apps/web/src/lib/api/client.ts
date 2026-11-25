import { ApiClient, ApiError } from '@aiw/api-client';

export { ApiError };

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
});
