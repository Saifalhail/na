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

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

// Helper function for exponential backoff
const getRetryDelay = (retryAttempt: number): number => {
  return RETRY_DELAY * Math.pow(2, retryAttempt - 1); // 1s, 2s, 4s
};

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

// Request interceptor with performance tracking
apiClient.interceptors.request.use(
  async (config) => {
    // Initialize retry metadata
    if (!config.metadata) {
      config.metadata = {};
    }
    if (!config.metadata.retryCount) {
      config.metadata.retryCount = 0;
    }
    
    // Add request start time for measuring duration
    config.metadata.startTime = performance.now();
    
    if (__DEV__) {
      const timestamp = new Date().toISOString();
      console.log(`\n📤 [API REQUEST] ${timestamp}`);
      console.log('🎯 [API REQUEST] Endpoint:', config.url);
      console.log('🔧 [API REQUEST] Method:', config.method?.toUpperCase());
      console.log('🌐 [API REQUEST] Full URL:', `${config.baseURL}${config.url}`);
      console.log('⏱️ [API REQUEST] Timeout:', config.timeout, 'ms');
      
      if (config.metadata.retryCount > 0) {
        console.log('🔄 [API REQUEST] Retry attempt:', config.metadata.retryCount, 'of', MAX_RETRIES);
        console.log('⏱️ [API REQUEST] Retry delay:', getRetryDelay(config.metadata.retryCount), 'ms');
      }
      
      if (config.data) {
        // Don't log sensitive data
        const safeData = { ...config.data };
        if (safeData.password) safeData.password = '***';
        if (safeData.token) safeData.token = '***';
        if (safeData.refresh) safeData.refresh = '***';
        if (safeData.image) safeData.image = '<base64_image>';
        console.log('📦 [API REQUEST] Payload:', safeData);
        
        // Log payload size for performance monitoring
        const payloadSize = JSON.stringify(config.data).length;
        console.log('📈 [API REQUEST] Payload size:', (payloadSize / 1024).toFixed(2), 'KB');
      }
      
      if (config.params) {
        console.log('🔍 [API REQUEST] Query Params:', config.params);
      }
    }

    // Add auth token to requests
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        console.log('🔐 [API REQUEST] Auth token added (length:', token.length, 'chars)');
      }
    } else {
      if (__DEV__) {
        console.log('⚠️ [API REQUEST] No auth token available - request will be unauthenticated');
      }
    }

    // Add platform info
    config.headers['X-Platform'] = 'mobile';
    config.headers['X-App-Version'] = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (__DEV__) {
      console.log('🆔 [API REQUEST] Request ID:', config.headers['X-Request-ID']);
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('❌ Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced performance tracking
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const timestamp = new Date().toISOString();
      const duration = response.config?.metadata?.startTime 
        ? performance.now() - response.config.metadata.startTime 
        : null;
      
      console.log(`\n✅ [API RESPONSE] ${timestamp}`);
      console.log('🎯 [API RESPONSE] Endpoint:', response.config?.url);
      console.log('🎉 [API RESPONSE] Status:', response.status, response.statusText);
      console.log('⏱️ [API RESPONSE] Duration:', duration ? `${duration.toFixed(2)}ms` : 'N/A');
      
      // Performance metrics
      if (duration) {
        const perfLevel = duration < 200 ? '🟢' : duration < 500 ? '🟡' : '🔴';
        console.log(`${perfLevel} [API PERFORMANCE] Response time: ${duration.toFixed(2)}ms`);
      }
      
      // Response size analysis
      const responseSize = response.data ? JSON.stringify(response.data).length : 0;
      console.log('📦 [API RESPONSE] Data size:', 
        responseSize ? `${(responseSize / 1024).toFixed(2)} KB (${responseSize} chars)` : 'No data');
      
      // If response has array data, log count
      if (Array.isArray(response.data)) {
        console.log('📊 [API RESPONSE] Array count:', response.data.length, 'items');
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        console.log('📊 [API RESPONSE] Results count:', response.data.results.length, 'items');
        console.log('📄 [API RESPONSE] Total count:', response.data.count || 'N/A');
      }
      
      // Log response headers if useful
      const requestId = response.config?.headers?.['X-Request-ID'];
      if (requestId) {
        console.log('🆔 [API RESPONSE] Request ID:', requestId);
      }
    }
    // Clear any pending refresh promise on successful response
    refreshTokenPromise = null;
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (__DEV__) {
      const timestamp = new Date().toISOString();
      console.error(`\n❌ [API ERROR] ${timestamp}`);
      console.error('🎯 [API ERROR] Endpoint:', error.config?.url);
      console.error('🔧 [API ERROR] Method:', error.config?.method?.toUpperCase());
      console.error('🛑 [API ERROR] Status:', error.response?.status || 'No response');
      console.error('💬 [API ERROR] Message:', error.message);
      
      if (error.response?.data) {
        console.error('📦 [API ERROR] Response data:', error.response.data);
      }
    }

    // Handle network errors with retry logic
    if (!error.response) {
      const config = error.config as AxiosRequestConfig & { metadata?: any };
      const retryCount = config?.metadata?.retryCount || 0;
      const duration = config?.metadata?.startTime 
        ? performance.now() - config.metadata.startTime 
        : null;
      
      if (__DEV__) {
        console.error('\n🚫 [NETWORK ERROR] No response from server');
        console.error('🎯 [NETWORK ERROR] Target URL:', error.config?.baseURL + error.config?.url);
        console.error('🚀 [NETWORK ERROR] Error code:', error.code || 'Unknown');
        console.error('💬 [NETWORK ERROR] Message:', error.message);
        console.error('⏱️ [NETWORK ERROR] Timeout setting:', error.config?.timeout, 'ms');
        console.error('⏱️ [NETWORK ERROR] Failed after:', duration ? `${duration.toFixed(2)}ms` : 'N/A');
        console.error('🔄 [NETWORK ERROR] Current retry count:', retryCount);
        
        // Log possible causes
        if (error.code === 'ECONNABORTED') {
          console.error('🕐 [NETWORK ERROR] Request timed out - server took too long to respond');
        } else if (error.code === 'ERR_NETWORK') {
          console.error('🌐 [NETWORK ERROR] Network connectivity issue - check internet connection');
        }
      }
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && config) {
        config.metadata.retryCount = retryCount + 1;
        const delay = getRetryDelay(config.metadata.retryCount);
        
        if (__DEV__) {
          console.log(`🔄 [RETRY] Will retry in ${delay}ms (attempt ${config.metadata.retryCount}/${MAX_RETRIES})`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return apiClient(config);
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
        
        console.error('   🔥 All retry attempts exhausted after', retryCount, 'retries');
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
