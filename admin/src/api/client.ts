import { auth } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class APIError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const token = auth.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 - Session expired
    if (response.status === 401) {
      console.warn('[API] 401 Unauthorized - clearing session');
      auth.clearToken();

      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }

      throw new APIError(401, 'Session expired. Please login again.', 'UNAUTHORIZED');
    }

    // Handle other error responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      console.error(`[API] ${response.status} ${endpoint}:`, errorData);

      const message = errorData.message || `Request failed (${response.status})`;
      throw new APIError(response.status, message, errorData.code);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[API] Non-JSON response:', contentType);
      return {} as T;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof APIError) {
      throw error;
    }

    console.error('[API] Network error:', error);
    throw new APIError(0, 'Network error. Please check your connection.', 'NETWORK_ERROR');
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown) => request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(endpoint: string, data?: unknown) => request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
