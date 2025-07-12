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

  React.useEffect(() => {
    renderStartTime.current = performance.now();

    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        if (renderTime > 16.67) {
          // More than one frame (60fps)
          console.warn(`[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`);
        }
      }
    };
  });

  React.useEffect(() => {
    renderCount.current++;
    if (__DEV__ && renderCount.current > 10) {
      console.warn(`[Performance] ${componentName} has rendered ${renderCount.current} times`);
    }
  });
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
