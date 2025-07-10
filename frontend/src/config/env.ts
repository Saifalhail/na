import Constants from 'expo-constants';

interface Environment {
  apiUrl: string;
  apiVersion: string;
  googleOAuthClientId: string;
  environment: 'development' | 'staging' | 'production';
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  enableSocialAuth: boolean;
  enableAiAnalysis: boolean;
  enableOfflineMode: boolean;
  sentryDsn?: string;
}

const getEnvVars = (): Environment => {
  return {
    apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8000',
    apiVersion: Constants.expoConfig?.extra?.apiVersion || 'v1',
    googleOAuthClientId: Constants.expoConfig?.extra?.googleOAuthClientId || '',
    environment: Constants.expoConfig?.extra?.environment || 'development',
    enableAnalytics: Constants.expoConfig?.extra?.enableAnalytics || false,
    enableCrashReporting: Constants.expoConfig?.extra?.enableCrashReporting || false,
    enableSocialAuth: Constants.expoConfig?.extra?.enableSocialAuth || false,
    enableAiAnalysis: Constants.expoConfig?.extra?.enableAiAnalysis || true,
    enableOfflineMode: Constants.expoConfig?.extra?.enableOfflineMode || true,
    sentryDsn: Constants.expoConfig?.extra?.sentryDsn,
  };
};

export const env = getEnvVars();

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = `${env.apiUrl}/api/${env.apiVersion}`;
  return `${baseUrl}${endpoint}`;
};

// Export individual values for convenience
export const {
  apiUrl,
  apiVersion,
  googleOAuthClientId,
  environment,
  enableAnalytics,
  enableCrashReporting,
  enableSocialAuth,
  enableAiAnalysis,
  enableOfflineMode,
  sentryDsn,
} = env;