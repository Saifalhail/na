import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get the appropriate API URL based on the platform and environment
const getApiUrl = (): string => {
  // Check if we have environment variables set
  const {
    EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_API_URL_ANDROID,
    EXPO_PUBLIC_API_URL_IOS,
    EXPO_PUBLIC_API_URL_PHYSICAL,
  } = process.env;

  // If running on a physical device, try to use the physical device URL
  if (Constants.isDevice && EXPO_PUBLIC_API_URL_PHYSICAL) {
    console.log('Using physical device API URL:', EXPO_PUBLIC_API_URL_PHYSICAL);
    return EXPO_PUBLIC_API_URL_PHYSICAL;
  }

  // Platform-specific URLs for emulators
  if (Platform.OS === 'android' && EXPO_PUBLIC_API_URL_ANDROID) {
    console.log('Using Android emulator API URL:', EXPO_PUBLIC_API_URL_ANDROID);
    return EXPO_PUBLIC_API_URL_ANDROID;
  }

  if (Platform.OS === 'ios' && EXPO_PUBLIC_API_URL_IOS) {
    console.log('Using iOS simulator API URL:', EXPO_PUBLIC_API_URL_IOS);
    return EXPO_PUBLIC_API_URL_IOS;
  }

  // Fallback to default URL
  const defaultUrl = EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  console.log('Using default API URL:', defaultUrl);
  return defaultUrl;
};

export const API_URL = getApiUrl();
export const API_TIMEOUT = 30000; // 30 seconds

// Helper function to build full API endpoints
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
};

// Export for debugging
export const debugApiConfig = () => {
  console.log('=== API Configuration ===');
  console.log('Platform:', Platform.OS);
  console.log('Is Device:', Constants.isDevice);
  console.log('API URL:', API_URL);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('=======================');
};