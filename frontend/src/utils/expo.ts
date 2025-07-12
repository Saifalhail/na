import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Check if the app is running in Expo Go
 * @returns true if running in Expo Go, false otherwise
 */
export const isExpoGo = (): boolean => {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
};

/**
 * Check if the app is running as a standalone/production build
 * @returns true if running as standalone, false otherwise
 */
export const isStandalone = (): boolean => {
  return Constants.executionEnvironment === ExecutionEnvironment.Standalone;
};

/**
 * Check if the app is running in development mode
 * @returns true if in development, false otherwise
 */
export const isDevelopment = (): boolean => {
  return __DEV__;
};

/**
 * Get the current execution environment
 * @returns The current ExecutionEnvironment
 */
export const getExecutionEnvironment = (): ExecutionEnvironment => {
  return Constants.executionEnvironment;
};

/**
 * Check if native modules are available
 * This is false in Expo Go and true in standalone builds
 * @returns true if native modules can be used, false otherwise
 */
export const canUseNativeModules = (): boolean => {
  return !isExpoGo();
};