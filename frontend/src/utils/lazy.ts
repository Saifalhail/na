import React, { ComponentType, lazy, Suspense } from 'react';
import { Spinner } from '@/components/base/Loading';

/**
 * Lazy load a component with suspense wrapper
 */
export function lazyWithSuspense<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(factory);
  const FallbackComponent = fallback || Spinner;
  
  return (props: React.ComponentProps<T>) => {
    return React.createElement(Suspense, {
      fallback: React.createElement(FallbackComponent)
    }, React.createElement(LazyComponent, props));
  };
}

/**
 * Create a lazy component with custom loading state
 */
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options?: {
    fallback?: React.ComponentType;
    onLoad?: () => void;
    onError?: (error: Error) => void;
  }
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(() => {
    return factory()
      .then((module) => {
        options?.onLoad?.();
        return module;
      })
      .catch((error) => {
        options?.onError?.(error);
        throw error;
      });
  });
  
  const FallbackComponent = options?.fallback || Spinner;
  
  return (props: React.ComponentProps<T>) => {
    return React.createElement(Suspense, {
      fallback: React.createElement(FallbackComponent)
    }, React.createElement(LazyComponent, props));
  };
}

/**
 * Preload a lazy component
 */
export function preloadLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): void {
  // Trigger the import without rendering
  factory().catch(() => {
    // Ignore errors during preloading
  });
}

/**
 * Bundle of commonly lazy-loaded screens
 * Note: These screens need to be exported as default exports to work with lazy loading
 */
export const LazyScreens = {
  // Camera: lazyWithSuspense(() => import('@/screens/CameraScreen')),
  // AnalysisResults: lazyWithSuspense(() => import('@/screens/AnalysisResultsScreen')),
  // Profile: lazyWithSuspense(() => import('@/screens/ProfileScreen')),
  // MealHistory: lazyWithSuspense(() => import('@/screens/MealHistoryScreen')),
  // Favorites: lazyWithSuspense(() => import('@/screens/FavoritesScreen')),
  // Notifications: lazyWithSuspense(() => import('@/screens/NotificationScreen')),
  // TwoFactorSetup: lazyWithSuspense(() => import('@/screens/TwoFactorSetupScreen')),
  // TwoFactorVerify: lazyWithSuspense(() => import('@/screens/TwoFactorVerifyScreen')),
};

/**
 * Preload critical screens for better performance
 * Note: Disabled until screens have default exports
 */
export const preloadCriticalScreens = () => {
  // Preload camera screen since it's commonly accessed
  // preloadLazyComponent(() => import('@/screens/CameraScreen'));
  
  // Preload profile screen
  // preloadLazyComponent(() => import('@/screens/ProfileScreen'));
};