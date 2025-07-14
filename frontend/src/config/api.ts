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
    EXPO_PUBLIC_API_VERSION
  } = process.env;
  
  // Only log in development
  if (__DEV__) {
    // Debug environment variables
    console.log('📋 [DEBUG] Environment variables:', {
      EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_API_URL_ANDROID,
      EXPO_PUBLIC_API_URL_IOS,
      EXPO_PUBLIC_API_URL_PHYSICAL,
      EXPO_PUBLIC_API_VERSION,
      Platform: Platform.OS,
      isDevice: Constants.isDevice,
      nodeEnv: process.env.NODE_ENV
    });

    // Check if any environment variables are missing
    if (!EXPO_PUBLIC_API_URL_ANDROID && Platform.OS === 'android') {
      console.error('❌ [CONFIG] EXPO_PUBLIC_API_URL_ANDROID not found in environment!');
    }
    if (!EXPO_PUBLIC_API_URL_IOS && Platform.OS === 'ios') {
      console.error('❌ [CONFIG] EXPO_PUBLIC_API_URL_IOS not found in environment!');
    }
  }

  let baseUrl: string;

  // If running on a physical device, try to use the physical device URL
  if (Constants.isDevice && EXPO_PUBLIC_API_URL_PHYSICAL && EXPO_PUBLIC_API_URL_PHYSICAL !== 'http://YOUR_COMPUTER_IP:8000') {
    console.log('🌐 Using physical device API URL:', EXPO_PUBLIC_API_URL_PHYSICAL);
    baseUrl = EXPO_PUBLIC_API_URL_PHYSICAL;
  }
  // Platform-specific URLs for emulators
  else if (Platform.OS === 'android' && EXPO_PUBLIC_API_URL_ANDROID) {
    console.log('🤖 Using Android emulator API URL:', EXPO_PUBLIC_API_URL_ANDROID);
    baseUrl = EXPO_PUBLIC_API_URL_ANDROID;
  }
  else if (Platform.OS === 'ios' && EXPO_PUBLIC_API_URL_IOS) {
    console.log('🍎 Using iOS simulator API URL:', EXPO_PUBLIC_API_URL_IOS);
    baseUrl = EXPO_PUBLIC_API_URL_IOS;
  }
  // Fallback URLs
  else {
    let fallbackUrl = EXPO_PUBLIC_API_URL;

    if (!fallbackUrl) {
      // Try different localhost variations based on platform
      if (Platform.OS === 'android') {
        // For WSL environments, try common WSL IP ranges first
        console.warn('⚠️ [FALLBACK] Environment variables not loaded properly!');
        console.warn('⚠️ [FALLBACK] Falling back to Android emulator IP - this may not work in WSL!');
        fallbackUrl = 'http://10.0.2.2:8000'; // Android emulator host IP
      } else if (Platform.OS === 'ios') {
        fallbackUrl = 'http://localhost:8000'; // iOS simulator
      } else {
        fallbackUrl = 'http://127.0.0.1:8000'; // Default
      }
    }

    console.log('⚠️ Using fallback API URL:', fallbackUrl);
    console.warn('⚠️ Environment variables not properly loaded! Check .env file and restart Metro.');
    baseUrl = fallbackUrl;
  }

  // Add API version suffix
  const apiVersion = EXPO_PUBLIC_API_VERSION || 'v1';
  const fullUrl = `${baseUrl}/api/${apiVersion}`;
  
  console.log('✅ Full API URL:', fullUrl);
  return fullUrl;
};

export const API_URL = getApiUrl();
export const API_TIMEOUT = 30000; // 30 seconds

// Helper function to build full API endpoints
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
};

// Test API connectivity
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🔍 [CONNECTIVITY] Testing API connectivity to:', API_URL);
    
    const healthUrl = `${API_URL}/health/`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (response.ok) {
      console.log('✅ [CONNECTIVITY] API is reachable!');
      return true;
    } else {
      console.error('❌ [CONNECTIVITY] API returned error:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ [CONNECTIVITY] Failed to reach API:', error);
    console.error('❌ [CONNECTIVITY] This is likely a network connectivity issue');
    
    // Provide specific guidance based on the error
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('💡 [SOLUTION] Network Error - Check if:');
      console.error('   1. Backend server is running');
      console.error('   2. IP address is correct for your environment');
      console.error('   3. WSL networking is properly configured');
      console.error('   4. Environment variables are loaded correctly');
    }
    
    return false;
  }
};

// Export for debugging
export const debugApiConfig = () => {
  console.log('=== API Configuration ===');
  console.log('Platform:', Platform.OS);
  console.log('Is Device:', Constants.isDevice);
  console.log('API URL:', API_URL);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('All Environment Variables:');
  Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')).forEach(key => {
    console.log(`  ${key}:`, process.env[key]);
  });
  console.log('=======================');
};
