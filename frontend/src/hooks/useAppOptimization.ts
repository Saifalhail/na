import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, InteractionManager } from 'react-native';
import { MemoryOptimization } from '@/utils/performance';
import { OfflineManager } from '@/services/offline/OfflineManager';
import { clearImageCache } from '@/components/base/OptimizedImage';

interface UseAppOptimizationOptions {
  enableMemoryManagement?: boolean;
  enableCacheCleanup?: boolean;
  cleanupInterval?: number; // in milliseconds
}

export const useAppOptimization = ({
  enableMemoryManagement = true,
  enableCacheCleanup = true,
  cleanupInterval = 300000, // 5 minutes
}: UseAppOptimizationOptions = {}) => {
  const appState = useRef(AppState.currentState);
  const cleanupTimer = useRef<NodeJS.Timeout>();
  const offlineManager = OfflineManager.getInstance();

  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('App has come to the foreground');

        // Perform optimizations after interactions
        InteractionManager.runAfterInteractions(() => {
          // Clear old cached data
          if (enableCacheCleanup) {
            offlineManager.clearCache();
          }

          // Trigger garbage collection if available
          if (enableMemoryManagement) {
            MemoryOptimization.clearUnusedCache();
          }
        });
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to the background
        console.log('App is going to the background');

        // Clear any pending timers
        if (cleanupTimer.current) {
          clearInterval(cleanupTimer.current);
        }
      }

      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic cleanup
    if (enableCacheCleanup) {
      cleanupTimer.current = setInterval(() => {
        InteractionManager.runAfterInteractions(() => {
          // Clear old image cache
          clearImageCache();

          // Clear expired offline cache
          offlineManager.clearCache();
        });
      }, cleanupInterval);
    }

    // Monitor memory usage in development
    if (__DEV__ && enableMemoryManagement) {
      MemoryOptimization.monitorMemoryUsage();
    }

    return () => {
      subscription.remove();

      if (cleanupTimer.current) {
        clearInterval(cleanupTimer.current);
      }
    };
  }, [enableMemoryManagement, enableCacheCleanup, cleanupInterval]);

  // Manual optimization trigger
  const triggerOptimization = () => {
    InteractionManager.runAfterInteractions(() => {
      if (enableCacheCleanup) {
        clearImageCache();
        offlineManager.clearCache();
      }

      if (enableMemoryManagement) {
        MemoryOptimization.clearUnusedCache();
      }
    });
  };

  return {
    triggerOptimization,
  };
};
