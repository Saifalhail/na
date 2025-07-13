import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_CONFIG, getApiUrl } from './config';
import { TokenStorage } from '@services/storage/tokenStorage';
import { handleApiError, AuthenticationError } from './errors';
import { TokenPair } from '@/types/api';
import { rs } from '@/utils/responsive';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_CONFIG.baseURL}/api/${API_CONFIG.version}`,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Track refresh token promise to prevent multiple simultaneous refreshes
let refreshTokenPromise: Promise<TokenPair> | null = null;

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token to requests
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add platform info
    config.headers['X-Platform'] = 'mobile';
    config.headers['X-App-Version'] = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Clear any pending refresh promise on successful response
    refreshTokenPromise = null;
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle network errors with user-friendly messages
    if (!error.response) {
      console.log('Network error - no response received:', error.message);
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh for auth endpoints
      if (originalRequest.url?.includes('/auth/')) {
        await TokenStorage.clearTokens();
        throw new AuthenticationError('Session expired. Please login again.');
      }

      try {
        // Use existing refresh promise or create new one
        if (!refreshTokenPromise) {
          refreshTokenPromise = refreshAccessToken();
        }

        const tokens = await refreshTokenPromise;

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.access}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and throw error
        await TokenStorage.clearTokens();
        throw new AuthenticationError('Session expired. Please login again.');
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// Refresh access token
async function refreshAccessToken(): Promise<TokenPair> {
  try {
    const refreshToken = await TokenStorage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      getApiUrl('/auth/refresh/'),
      { refresh: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: API_CONFIG.timeout,
      }
    );

    const tokens: TokenPair = response.data;
    await TokenStorage.saveTokens(tokens);

    return tokens;
  } catch (error) {
    refreshTokenPromise = null;
    throw error;
  }
}

// Export configured client
export default apiClient;

// Helper function for file uploads
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (typeof value === 'object' && value.uri) {
      // React Native image format
      formData.append(key, {
        uri: value.uri,
        type: value.type || 'image/jpeg',
        name: value.name || 'image.jpg',
      } as any);
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });

  return formData;
};

// Request wrapper with error handling
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error; // Re-throw to maintain error handling flow
  }
}

// Export the axios instance directly
export { apiClient };

// Convenience methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'GET', url }),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'POST', url, data }),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'PUT', url, data }),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'PATCH', url, data }),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiRequest<T>({ ...config, method: 'DELETE', url }),
};
