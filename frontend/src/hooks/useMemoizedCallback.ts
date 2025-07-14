import { useCallback, useRef } from 'react';

/**
 * Enhanced useCallback that maintains referential equality when dependencies don't change
 * and provides better performance for complex callback scenarios
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options?: {
    // Enable deep comparison of dependencies
    deepCompare?: boolean;
    // Maximum number of cached instances
    maxCache?: number;
  }
): T {
  const { deepCompare = false, maxCache = 1 } = options || {};
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<React.DependencyList>(deps);
  const cacheRef = useRef<Map<string, T>>(new Map());

  // Create a key for the current dependencies
  const depsKey = deepCompare ? JSON.stringify(deps) : deps.map((dep) => String(dep)).join(',');

  return useCallback((...args: Parameters<T>) => {
    // Check if we have a cached version
    if (cacheRef.current.has(depsKey)) {
      const cachedCallback = cacheRef.current.get(depsKey)!;
      return cachedCallback(...args);
    }

    // Create new callback
    const newCallback = callback;

    // Cache management
    if (cacheRef.current.size >= maxCache) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey !== undefined) {
        cacheRef.current.delete(firstKey);
      }
    }

    cacheRef.current.set(depsKey, newCallback);
    callbackRef.current = newCallback;
    depsRef.current = deps;

    return newCallback(...args);
  }, deps) as T;
}

/**
 * Memoized callback for event handlers that require stable references
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Debounced callback hook with memoization
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;
}

/**
 * Throttled callback hook with memoization
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay, ...deps]
  ) as T;
}
