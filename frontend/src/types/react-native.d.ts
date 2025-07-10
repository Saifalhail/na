// Additional React Native type declarations
// This file provides type definitions that may be missing from React Native's built-in types

declare module 'react-native' {
  // Add any additional React Native type definitions here if needed
  // Most types are now included in React Native itself
}

// Global type augmentations for React Native components
declare global {
  const __DEV__: boolean;

  namespace ReactNative {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_API_VERSION?: string;
      EXPO_PUBLIC_ENVIRONMENT?: string;
      EXPO_PUBLIC_ENABLE_ANALYTICS?: string;
      EXPO_PUBLIC_ENABLE_CRASH_REPORTING?: string;
    }
  }
}

export {};
