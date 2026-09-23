import axios, { AxiosError } from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://quickserve-api.quickserve-by-bhagyesh.workers.dev';

export const TOKEN_STORAGE_KEY = 'quickserve_admin_token';
export const USER_STORAGE_KEY = 'quickserve_admin_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralize error handling & 401 redirection
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success?: boolean; error?: { code?: string; message?: string } }>) => {
    if (error.response?.status === 401) {
      // Do not clear and redirect if we're actively attempting login or public endpoint
      const isLoginRequest = error.config?.url?.includes('/api/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error?.message || (error.response?.data as { message?: string })?.message;

    if (status === 401) {
      return 'Session expired or unauthorized. Please log in again.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 404) {
      return serverMessage || 'The requested resource or endpoint was not found on the server (404 Not Found).';
    }
    if (status === 409) {
      return 'This user may already have this role.';
    }
    if (status === 422) {
      return serverMessage || 'Validation error. Please verify the submitted request payload.';
    }
    if (status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (status === 500) {
      return 'Server error. Please try again.';
    }
    if (serverMessage) return serverMessage;
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Network error: Unable to connect to the QuickServe API server.';
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}

export default api;
