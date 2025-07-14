import React, { ComponentType, ReactElement } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Higher-order component for lazy loading components with placeholder
 */
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  Placeholder?: ComponentType
): ComponentType<P> {
  return React.memo((props: P) => {
    const [isReady, setIsReady] = React.useState(false);

    React.useEffect(() => {
      InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
    }, []);

    if (!isReady && Placeholder) {
      return React.createElement(Placeholder);
    }

    return React.createElement(Component, props);
  });
}

/**
 * Custom hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastCall = React.useRef(0);
  const lastCallTimer = React.useRef<NodeJS.Timeout | undefined>(undefined);

  return React.useCallback(
    ((...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        clearTimeout(lastCallTimer.current);
        lastCallTimer.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Utility to batch state updates
 */
export function batchedUpdates<T extends (...args: any[]) => void>(callback: T): T {
  return ((...args: Parameters<T>) => {
    InteractionManager.runAfterInteractions(() => {
      callback(...args);
    });
  }) as T;
}

/**
 * Performance monitor for components
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = React.useRef(0);
  const renderStartTime = React.useRef<number | undefined>(undefined);
  const mountTime = React.useRef<number | undefined>(undefined);

  // Track component mount time
  React.useEffect(() => {
    mountTime.current = performance.now();
    // Only log mount for critical components
    if (__DEV__ && ['HomeScreen', 'CameraScreen', 'AnalysisResultsScreen'].includes(componentName)) {
      console.log(`🚀 [Performance] ${componentName} mounting...`);
    }
    
    return () => {
      if (mountTime.current && __DEV__ && ['HomeScreen', 'CameraScreen', 'AnalysisResultsScreen'].includes(componentName)) {
        const totalLifetime = performance.now() - mountTime.current;
        console.log(`🏁 [Performance] ${componentName} unmounted after ${totalLifetime.toFixed(2)}ms`);
      }
    };
  }, [componentName]); // Add dependency to prevent re-runs

  // Track render performance using useLayoutEffect to measure synchronously
  React.useLayoutEffect(() => {
    const startTime = performance.now();
    renderCount.current++;
    
    // Log render start only for critical components and first render
    if (__DEV__ && renderCount.current === 1 && ['HomeScreen', 'CameraScreen', 'AnalysisResultsScreen'].includes(componentName)) {
      console.log(`🔄 [Performance] ${componentName} render #${renderCount.current} started`);
    }

    return () => {
      const renderTime = performance.now() - startTime;
      
      // Only log extremely slow renders (over 100ms) to reduce log spam
      if (__DEV__ && renderTime > 100) {
        console.error(`🔥 [Performance] ${componentName} CRITICAL SLOW RENDER: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
      }
    };
  }); // No dependency array needed for performance measurement

  // Warn about excessive re-renders (check after a delay)
  React.useEffect(() => {
    const checkTimer = setTimeout(() => {
      if (__DEV__ && renderCount.current > 5) {
        console.warn(`🔄 [Performance] ${componentName} has rendered ${renderCount.current} times - check for unnecessary re-renders`);
      }
      
      if (__DEV__ && renderCount.current > 20) {
        console.error(`🚨 [Performance] ${componentName} excessive re-renders: ${renderCount.current} times`);
      }
    }, 5000); // Check after 5 seconds
    
    return () => clearTimeout(checkTimer);
  }, [componentName]); // Only run once per component
}

/**
 * Memoized selector hook for store values
 */
export function useMemoizedSelector<T, R>(
  selector: (state: T) => R,
  deps: React.DependencyList
): (state: T) => R {
  return React.useCallback(selector, deps);
}

/**
 * Image optimization utilities
 */
export const ImageOptimization = {
  /**
   * Get optimized image dimensions based on device pixel ratio
   */
  getOptimizedDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  },

  /**
   * Generate image cache key
   */
  getCacheKey(uri: string, width?: number, height?: number): string {
    return `${uri}_${width || 'auto'}_${height || 'auto'}`;
  },
};

/**
 * List optimization utilities
 */
export const ListOptimization = {
  /**
   * Get item layout for FlatList optimization
   */
  getItemLayout:
    (itemHeight: number) =>
    (data: any, index: number): { length: number; offset: number; index: number } => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),

  /**
   * Key extractor for list items
   */
  keyExtractor: (item: any): string => {
    return item.id || item.key || String(item);
  },

  /**
   * Default viewport configuration for virtualized lists
   */
  viewabilityConfig: {
    itemVisiblePercentThreshold: 50,
    waitForInteraction: true,
    minimumViewTime: 300,
  },
};

/**
 * Memory optimization utilities
 */
export const MemoryOptimization = {
  /**
   * Clear cached data that's not currently needed
   */
  clearUnusedCache(): void {
    if (global.gc) {
      global.gc();
    }
  },

  /**
   * Monitor memory usage in development
   */
  monitorMemoryUsage(): (() => void) | void {
    if (__DEV__) {
      const memoryInterval = setInterval(() => {
        // @ts-ignore
        if (performance.memory) {
          // @ts-ignore
          const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
          const usagePercent = (usedJSHeapSize / totalJSHeapSize) * 100;

          if (usagePercent > 90) {
            console.warn(`[Memory] High memory usage: ${usagePercent.toFixed(2)}%`);
          }
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(memoryInterval);
    }
  },
};
