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
import { debugApiConfig, testApiConnectivityAsync } from '@/config/api';
import { getStorageInfo, cleanupStorage } from '@/utils/storageCleanup';


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
        if (__DEV__) {
          console.log('🚀 [STARTUP] Initializing app...');
          debugApiConfig();
        }
        
        // Check storage health and cleanup if needed
        try {
          const storageInfo = await getStorageInfo();
          if (__DEV__) {
            console.log('📊 [STARTUP] Storage info:', storageInfo);
          }
          
          // If storage has too many keys, perform cleanup
          if (storageInfo.totalKeys > 10000 || storageInfo.totalSize > 50 * 1024 * 1024) { // 50MB
            console.log('🧹 [STARTUP] Storage cleanup needed...');
            await cleanupStorage({ 
              clearCache: true, 
              clearPersistedStores: false, // Keep user data
              verbose: __DEV__ 
            });
          }
        } catch (storageError) {
          console.error('🚨 [STARTUP] Storage error, performing emergency cleanup:', storageError);
          try {
            await cleanupStorage({ clearCache: true, verbose: __DEV__ });
          } catch (cleanupError) {
            console.error('❌ [STARTUP] Emergency cleanup failed:', cleanupError);
          }
        }
        
        // Test API connectivity in background (non-blocking)
        testApiConnectivityAsync().then((isConnected) => {
          if (__DEV__ && !isConnected) {
            console.log('⚠️ [STARTUP] API not reachable - app will work in offline mode');
          }
        });
        
        // Check auth status (this is still important to wait for)
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
