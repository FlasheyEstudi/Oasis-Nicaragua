// ============================================
// OASIS - API Client (Axios)
// - Access token stored IN MEMORY (not localStorage)
// - Refresh token stored in httpOnly Cookie (managed by Browser/Backend)
// - Axios interceptor: inject Bearer token on every request
// - Axios interceptor: on 401, attempt token refresh via POST /auth/refresh
// - NO mock fallbacks — all errors are real
// ============================================

import axios, { 
  type AxiosError, 
  type AxiosRequestConfig, 
  type AxiosResponse, 
  type InternalAxiosRequestConfig 
} from 'axios';

import { getDynamicUrl } from '@/utils/constants';

// Config values (fallback to defaults if constants are missing)
// Use the environment variable, falling back to localhost
const API_BASE_URL = typeof window !== 'undefined'
  ? getDynamicUrl(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000')
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000');
const API_PREFIX = '/api/v1';

/**
 * Get the base API URL including prefix
 */
export function getApiUrl(): string {
  return `${API_BASE_URL}${API_PREFIX}`;
}

// --- In-memory access token ---
let accessToken: string | null = null;

// --- Refresh lock to prevent concurrent refresh requests ---
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// --- API Response Types ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

// --- Axios Instance ---
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true, // Required for httpOnly refresh cookies
  timeout: 45000,
});

// --- Request Interceptor: Inject Bearer token ---
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Dynamic URL rewrite for other local network devices
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocalIP = hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/) || hostname.includes('127.0.0.1');
      if (isLocalIP && config.baseURL && config.baseURL.includes('localhost')) {
        config.baseURL = config.baseURL.replace('localhost', hostname);
      }
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// --- Response Interceptor: Handle 401 with token refresh ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Attempt refresh on 401 (expired) or 403 (forbidden/role changed) and not already retried
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      // Don't try to refresh auth endpoints themselves
      const isAuthEndpoint =
        typeof originalRequest.url === 'string' &&
        (originalRequest.url.includes('/auth/login') ||
          originalRequest.url.includes('/auth/refresh'));

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            originalRequest._retry = true;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh access token via httpOnly cookie
        const response = await axios.post<ApiResponse<{ access_token: string }>>(
          `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { access_token } = response.data.data;
        setAccessToken(access_token);
        onRefreshed(access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        // Notify session store that user profiles/roles might have updated
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:roles-updated'));
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshSubscribers = [];
        accessToken = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// --- Retry Interceptor: Exponential backoff for GET requests ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const config = error.config as AxiosRequestConfig & { __retryCount?: number };
    
    // Only retry GET requests where the error is a network issue, server error (5xx), or timeout (408)
    if (!config || !config.method || config.method.toLowerCase() !== 'get') {
      return Promise.reject(error);
    }

    const shouldRetry = !error.response || (error.response.status >= 500) || (error.response.status === 408);
    if (!shouldRetry) {
      return Promise.reject(error);
    }

    // Initialize/Increment retry count
    config.__retryCount = config.__retryCount ?? 0;

    // Retry maximum of 3 times
    if (config.__retryCount >= 3) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;

    // Exponential delay: 1s, 2s, 4s
    const delay = Math.pow(2, config.__retryCount) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return apiClient(config);
  }
);

// --- Token Management ---

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAuthTokens(): void {
  accessToken = null;
}

// --- API Helper Functions ---

export async function get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  const response = await apiClient.get<ApiResponse<T>>(endpoint, { params });
  return response.data;
}

export async function post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await apiClient.post<ApiResponse<T>>(endpoint, body);
  return response.data;
}

export async function put<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await apiClient.put<ApiResponse<T>>(endpoint, body);
  return response.data;
}

export async function patch<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await apiClient.patch<ApiResponse<T>>(endpoint, body);
  return response.data;
}

export async function del<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<ApiResponse<T>>(endpoint);
  return response.data;
}

// --- Error Helper ---

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (apiError?.error?.message) return apiError.error.message;
    if (error.message === 'Network Error') return 'Error de conexión. Verifica tu conexión a internet.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Error desconocido';
}

export default apiClient;
