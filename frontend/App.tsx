import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, InteractionManager } from 'react-native';
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
import { SplashScreen } from '@/components/SplashScreen';
import { debugApiConfig, testApiConnectivity } from '@/config/api';


function ThemedAppContent() {
  const { checkAuthStatus, isLoading } = useAuthStore();
  const [appIsReady, setAppIsReady] = useState(false);

  // Enable app-wide performance optimizations
  useAppOptimization({
    enableMemoryManagement: true,
    enableCacheCleanup: true,
    cleanupInterval: 300000, // 5 minutes
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Debug API configuration at startup
        console.log('🚀 [STARTUP] Initializing app...');
        debugApiConfig();
        
        // Test API connectivity before proceeding
        const isConnected = await testApiConnectivity();
        if (!isConnected) {
          console.warn('⚠️ [STARTUP] API connectivity test failed - authentication may not work');
        }
        
        // Check auth status
        await checkAuthStatus();
      } catch (e) {
        console.error('App initialization error:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, [checkAuthStatus]);

  if (!appIsReady || isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <AppNavigator />
      <NetworkStatusIndicator />
      <StatusBar style="auto" />
    </>
  );
}

function AppContent() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedAppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const { reportError } = useErrorHandler();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Defer non-critical initialization
    InteractionManager.runAfterInteractions(() => {
      setIsInitialized(true);
    });
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        reportError({ error, errorInfo });
      }}
    >
      {isInitialized ? <AppContent /> : <SplashScreen />}
    </ErrorBoundary>
  );
}
