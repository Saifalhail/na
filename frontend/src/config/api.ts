import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cache API URL to avoid recalculation
let cachedApiUrl: string | null = null;

// Get the appropriate API URL based on the platform and environment
const getApiUrl = (): string => {
  // Return cached URL if available
  if (cachedApiUrl) {
    return cachedApiUrl;
  }
  // Check if we have environment variables set
  const {
    EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_API_URL_ANDROID,
    EXPO_PUBLIC_API_URL_IOS,
    EXPO_PUBLIC_API_URL_PHYSICAL,
    EXPO_PUBLIC_API_VERSION
  } = process.env;
  
  // Comprehensive logging for debugging
  if (__DEV__) {
    console.log('🔧 [API CONFIG] Starting API URL configuration...');
    console.log('📋 [API CONFIG] Environment variables:', {
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
    if (!EXPO_PUBLIC_API_URL) {
      console.error('❌ [API CONFIG] EXPO_PUBLIC_API_URL not found in environment!');
    }
    if (!EXPO_PUBLIC_API_URL_ANDROID && Platform.OS === 'android') {
      console.error('❌ [API CONFIG] EXPO_PUBLIC_API_URL_ANDROID not found in environment!');
      console.error('💡 [API CONFIG] This is required for Android devices/emulators');
    }
    if (!EXPO_PUBLIC_API_URL_IOS && Platform.OS === 'ios') {
      console.error('❌ [API CONFIG] EXPO_PUBLIC_API_URL_IOS not found in environment!');
      console.error('💡 [API CONFIG] This is required for iOS devices/simulators');
    }
    if (Constants.isDevice && !EXPO_PUBLIC_API_URL_PHYSICAL) {
      console.warn('⚠️ [API CONFIG] Running on physical device but EXPO_PUBLIC_API_URL_PHYSICAL not set');
    }
  }

  let baseUrl: string;

  // Determine the appropriate base URL with detailed logging
  if (Constants.isDevice && EXPO_PUBLIC_API_URL_PHYSICAL && EXPO_PUBLIC_API_URL_PHYSICAL !== 'http://YOUR_COMPUTER_IP:8000') {
    if (__DEV__) {
      console.log('📱 [API CONFIG] Running on physical device');
      console.log('🌐 [API CONFIG] Using physical device API URL:', EXPO_PUBLIC_API_URL_PHYSICAL);
    }
    baseUrl = EXPO_PUBLIC_API_URL_PHYSICAL;
  }
  // Platform-specific URLs for emulators
  else if (Platform.OS === 'android' && EXPO_PUBLIC_API_URL_ANDROID) {
    if (__DEV__) {
      console.log('🤖 [API CONFIG] Running on Android');
      console.log('🌐 [API CONFIG] Using Android API URL:', EXPO_PUBLIC_API_URL_ANDROID);
    }
    baseUrl = EXPO_PUBLIC_API_URL_ANDROID;
  }
  else if (Platform.OS === 'ios' && EXPO_PUBLIC_API_URL_IOS) {
    if (__DEV__) {
      console.log('🍎 [API CONFIG] Running on iOS');
      console.log('🌐 [API CONFIG] Using iOS API URL:', EXPO_PUBLIC_API_URL_IOS);
    }
    baseUrl = EXPO_PUBLIC_API_URL_IOS;
  }
  // Fallback URLs
  else {
    if (__DEV__) {
      console.warn('⚠️ [API CONFIG] No platform-specific URL found, using fallback logic');
      console.log('🔍 [API CONFIG] Checking for EXPO_PUBLIC_API_URL...');
    }
    
    let fallbackUrl = EXPO_PUBLIC_API_URL;

    if (!fallbackUrl) {
      // Use localhost for all platforms when env vars not loaded
      if (Platform.OS === 'ios') {
        fallbackUrl = 'http://localhost:8000'; // iOS simulator
      } else {
        // For Android and other platforms, use 127.0.0.1
        // This will fail gracefully and show proper error messages
        fallbackUrl = 'http://127.0.0.1:8000';
      }
      
      console.error('❌ [API CONFIG] CRITICAL: No API URL environment variables found!');
      console.error('❌ [API CONFIG] Using emergency fallback:', fallbackUrl);
      console.error('📦 [API CONFIG] Action required:');
      console.error('   1. Check if .env file exists in frontend/ directory');
      console.error('   2. Ensure .env contains EXPO_PUBLIC_API_URL');
      console.error('   3. Restart Metro with: npm run start:force');
      console.error('   4. Clear Expo cache: npx expo start --clear');
    } else {
      if (__DEV__) {
        console.log('🌐 [API CONFIG] Using base API URL from env:', fallbackUrl);
      }
    }

    baseUrl = fallbackUrl;
  }

  // Add API version suffix
  const apiVersion = EXPO_PUBLIC_API_VERSION || 'v1';
  const fullUrl = `${baseUrl}/api/${apiVersion}`;
  
  // Cache the result
  cachedApiUrl = fullUrl;
  
  if (__DEV__) {
    console.log('✅ [API CONFIG] Final constructed API URL:', fullUrl);
    console.log('🏏 [API CONFIG] Base URL:', baseUrl);
    console.log('🆔 [API CONFIG] API Version:', apiVersion);
    console.log('💾 [API CONFIG] URL cached for future use');
    console.log('=====================================');
  }
  
  return fullUrl;
};

export const API_URL = getApiUrl();
export const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10); // Default 30 seconds
export const CONNECTIVITY_TEST_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_CONNECTIVITY_TEST_TIMEOUT || '30000', 10); // Increased to 30 seconds for reliability

// Helper function to build full API endpoints
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
};

// Test API connectivity with timeout
export const testApiConnectivity = async (timeout: number = CONNECTIVITY_TEST_TIMEOUT): Promise<boolean> => {
  try {
    if (__DEV__) {
      console.log('\n🔍 [CONNECTIVITY TEST] Starting...');
      console.log('🌐 [CONNECTIVITY TEST] Target URL:', API_URL);
      console.log('⏱️ [CONNECTIVITY TEST] Timeout:', timeout, 'ms');
    }
    
    const healthUrl = `${API_URL}/health/`;
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (__DEV__) {
          console.log('✅ [CONNECTIVITY TEST] SUCCESS - API is reachable!');
          console.log('🎉 [CONNECTIVITY TEST] Response status:', response.status);
          console.log('🔗 [CONNECTIVITY TEST] Health endpoint:', healthUrl);
        }
        return true;
      } else {
        if (__DEV__) {
          console.error('❌ [CONNECTIVITY TEST] API returned error');
          console.error('🛑 [CONNECTIVITY TEST] Status:', response.status);
          console.error('📝 [CONNECTIVITY TEST] Status Text:', response.statusText);
          console.error('🔗 [CONNECTIVITY TEST] Failed URL:', healthUrl);
        }
        return false;
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        if (__DEV__) {
          console.error('⏱️ [CONNECTIVITY TEST] Request timed out!');
          console.error('🕰️ [CONNECTIVITY TEST] Timeout was:', timeout, 'ms');
          console.error('💡 [CONNECTIVITY TEST] Consider increasing timeout or checking network');
        }
        return false;
      }
      throw fetchError;
    }
  } catch (error: any) {
    if (__DEV__) {
      console.error('\n⚠️ [CONNECTIVITY TEST] Failed to reach API');
      console.error('🚀 [CONNECTIVITY TEST] Error Type:', error.name || 'Unknown');
      console.error('💬 [CONNECTIVITY TEST] Error Message:', error.message);
      
      if (error.message?.includes('Network request failed')) {
        console.error('\n🔌 [CONNECTIVITY TEST] Network Troubleshooting:');
        console.error('   1️⃣ Check if backend is running: ./start.sh backend');
        console.error('   2️⃣ Verify API URL in .env:', API_URL);
        console.error('   3️⃣ For WSL: ensure IP is correct (run hostname -I)');
        console.error('   4️⃣ Check firewall/antivirus settings');
        console.error('   5️⃣ Try: adb reverse tcp:8000 tcp:8000 (for Android)');
      }
      
      console.log('\n📡 [CONNECTIVITY TEST] App will work in offline mode');
      console.log('=====================================\n');
    }
    return false;
  }
};

// Non-blocking connectivity test that runs in background
export const testApiConnectivityAsync = (): Promise<boolean> => {
  if (__DEV__) {
    console.log('🎯 [CONNECTIVITY] Launching async connectivity test...');
  }
  
  return new Promise((resolve) => {
    // Always resolve immediately to not block the app
    testApiConnectivity(CONNECTIVITY_TEST_TIMEOUT)
      .then((result) => {
        if (__DEV__) {
          console.log(`🏁 [CONNECTIVITY] Async test completed: ${result ? 'CONNECTED' : 'OFFLINE'}`);
        }
        resolve(result);
      })
      .catch((error) => {
        if (__DEV__) {
          console.error('🚨 [CONNECTIVITY] Async test error:', error.message);
        }
        resolve(false);
      });
  });
};

// Export for debugging
export const debugApiConfig = () => {
  if (!__DEV__) return;
  
  console.log('\n🔍 === COMPREHENSIVE API CONFIGURATION DEBUG ===');
  console.log('📱 Device Information:');
  console.log('  Platform:', Platform.OS);
  console.log('  Is Physical Device:', Constants.isDevice);
  console.log('  Device Name:', Constants.deviceName || 'N/A');
  console.log('  Expo Version:', Constants.expoVersion || 'N/A');
  
  console.log('\n🌐 API Configuration:');
  console.log('  API Base URL:', API_URL);
  console.log('  API Timeout:', API_TIMEOUT, 'ms');
  console.log('  Connectivity Test Timeout:', CONNECTIVITY_TEST_TIMEOUT, 'ms');
  console.log('  Environment:', process.env.NODE_ENV);
  console.log('  Cache Status:', cachedApiUrl ? 'CACHED' : 'NOT CACHED');
  
  console.log('\n📋 Environment Variables Status:');
  const envVars = {
    'EXPO_PUBLIC_API_URL': process.env.EXPO_PUBLIC_API_URL,
    'EXPO_PUBLIC_API_URL_ANDROID': process.env.EXPO_PUBLIC_API_URL_ANDROID,
    'EXPO_PUBLIC_API_URL_IOS': process.env.EXPO_PUBLIC_API_URL_IOS,
    'EXPO_PUBLIC_API_URL_PHYSICAL': process.env.EXPO_PUBLIC_API_URL_PHYSICAL,
    'EXPO_PUBLIC_API_VERSION': process.env.EXPO_PUBLIC_API_VERSION,
    'EXPO_PUBLIC_API_TIMEOUT': process.env.EXPO_PUBLIC_API_TIMEOUT,
    'EXPO_PUBLIC_CONNECTIVITY_TEST_TIMEOUT': process.env.EXPO_PUBLIC_CONNECTIVITY_TEST_TIMEOUT,
    'EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID': process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
    'EXPO_PUBLIC_ENABLE_DEMO_MODE': process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE,
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = key.includes('KEY') || key.includes('SECRET') || key.includes('CLIENT_ID')
      ? value ? '***' + value.slice(-4) : 'NOT_SET'
      : value || 'NOT_SET';
    console.log(`  ${status} ${key}: ${displayValue}`);
  });
  
  console.log('\n🔧 Diagnostic Information:');
  console.log('  Current Time:', new Date().toISOString());
  console.log('  Memory Usage:', typeof performance !== 'undefined' && performance.memory 
    ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB / ${Math.round(performance.memory.totalJSHeapSize / 1048576)}MB`
    : 'N/A');
  
  console.log('\n💡 Quick Fixes:');
  if (!process.env.EXPO_PUBLIC_API_URL) {
    console.log('  ⚠️ Missing API URL - run: npm run start:force');
  }
  if (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_API_URL_ANDROID) {
    console.log('  ⚠️ Missing Android URL - add EXPO_PUBLIC_API_URL_ANDROID to .env');
  }
  
  console.log('=============================================\n');
};
