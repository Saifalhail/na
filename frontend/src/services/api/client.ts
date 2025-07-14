import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_URL, API_TIMEOUT, debugApiConfig } from '@/config/api';
import { TokenStorage } from '@services/storage/tokenStorage';
import { handleApiError, AuthenticationError } from './errors';
import { TokenPair } from '@/types/api';

// Add extensive logging for debugging
if (__DEV__) {
  console.log('🔧 API Client Initializing...');
  debugApiConfig();
}

// Create axios instance with unified configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL, // API_URL already includes /api/v1
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

if (__DEV__) {
  console.log('📡 API Client created with baseURL:', API_URL);
}

// Track refresh token promise to prevent multiple simultaneous refreshes
let refreshTokenPromise: Promise<TokenPair> | null = null;

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log('📤 Making API request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
      });
    }

    // Add auth token to requests
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        console.log('🔐 Added auth token to request');
      }
    } else {
      if (__DEV__) {
        console.log('⚠️ No auth token available for request');
      }
    }

    // Add platform info
    config.headers['X-Platform'] = 'mobile';
    config.headers['X-App-Version'] = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('❌ Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('✅ API request successful:', {
        status: response.status,
        url: response.config?.url,
        method: response.config?.method?.toUpperCase(),
      });
    }
    // Clear any pending refresh promise on successful response
    refreshTokenPromise = null;
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (__DEV__) {
      console.error('❌ API request failed:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        message: error.message,
        hasResponse: !!error.response,
      });
    }

    // Handle network errors with user-friendly messages
    if (!error.response) {
      if (__DEV__) {
        console.error('🚫 Network error - no response received:', {
          message: error.message,
          code: error.code,
          config: {
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            timeout: error.config?.timeout,
          }
        });
      }
      
      // Enhanced diagnostics for development environments
      if (__DEV__) {
        console.error('💡 [NETWORK DEBUG] Troubleshooting suggestions:');
        
        // Check if we're using the problematic Android emulator IP
        if (error.config?.baseURL?.includes('10.0.2.2')) {
          console.error('   ❌ Using Android emulator IP (10.0.2.2) - this may not work in WSL environments');
          console.error('   💡 Solution: Set EXPO_PUBLIC_API_URL_ANDROID in .env to your WSL IP (e.g., 172.25.29.233:8000)');
          console.error('   💡 Then restart Metro bundler: npm run start:force');
        }
        
        // Check if environment variables are properly loaded
        console.error('   📋 Environment check: EXPO_PUBLIC_API_URL_ANDROID =', process.env.EXPO_PUBLIC_API_URL_ANDROID);
        
        if (!process.env.EXPO_PUBLIC_API_URL_ANDROID) {
          console.error('   ❌ Environment variables not loaded - .env file may not be read properly');
          console.error('   💡 Solution: Restart Metro bundler and check .env file location');
        }
      }
      
      // Provide more specific error messages based on error type
      let userMessage = 'Network connection failed. Please check your internet connection and try again.';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        userMessage = 'Unable to connect to server. Please check if the backend is running and accessible.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        if (error.config?.baseURL?.includes('10.0.2.2')) {
          userMessage = 'Network connection failed. This appears to be an Android emulator connectivity issue with WSL. Please check your development environment configuration.';
        } else {
          userMessage = 'Network connection failed. Please check your WiFi/mobile data and try again.';
        }
      } else if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please check your internet connection and try again.';
      }
      
      throw new Error(userMessage);
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

    if (__DEV__) {
      console.log('🔄 Attempting token refresh...');
    }
    const refreshUrl = `${API_URL}/auth/refresh/`;
    if (__DEV__) {
      console.log('🔄 Refresh URL:', refreshUrl);
    }

    const response = await axios.post(
      refreshUrl,
      { refresh: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT,
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
