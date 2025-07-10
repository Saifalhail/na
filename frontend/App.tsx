import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/theme/ThemeContext';
import { AppNavigator } from '@/navigation';
import { useAuthStore } from '@/store/authStore';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useAppOptimization } from '@/hooks/useAppOptimization';
import LoadingComponents from '@/components/base/Loading';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

function AppContent() {
  const { checkAuthStatus, isLoading } = useAuthStore();

  // Enable app-wide performance optimizations
  useAppOptimization({
    enableMemoryManagement: true,
    enableCacheCleanup: true,
    cleanupInterval: 300000, // 5 minutes
  });

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (isLoading) {
    return <LoadingComponents.LoadingOverlay visible={true} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
          <NetworkStatusIndicator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const { reportError } = useErrorHandler();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        reportError({ error, errorInfo });
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );
}
