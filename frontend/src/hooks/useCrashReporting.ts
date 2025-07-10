import { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { crashReporting } from '@/services/crash/CrashReportingService';
import { useAuthStore } from '@/store/authStore';

export const useCrashReporting = (screenName?: string) => {
  const { user } = useAuthStore();
  const navigation = useNavigation();

  // Initialize crash reporting with user context
  useEffect(() => {
    if (user) {
      crashReporting.initialize(user.id);
      crashReporting.setUser(user.id, user.email);
    }
  }, [user]);

  // Track screen navigation
  useEffect(() => {
    if (screenName) {
      crashReporting.setCurrentScreen(screenName);
    }
  }, [screenName]);

  // Track navigation events
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = navigation.getState();
      if (state && state.routes && state.index !== undefined) {
        const currentRoute = state.routes[state.index];
        crashReporting.setCurrentScreen(currentRoute.name);
      }
    });

    return unsubscribe;
  }, [navigation]);

  const captureException = useCallback((error: Error, context?: Record<string, any>) => {
    crashReporting.captureException(error, context);
  }, []);

  const captureMessage = useCallback(
    (
      message: string,
      level: 'info' | 'warning' | 'error' = 'info',
      context?: Record<string, any>
    ) => {
      crashReporting.captureMessage(message, level, context);
    },
    []
  );

  const trackUserAction = useCallback(
    (action: string, target?: string, data?: Record<string, any>) => {
      crashReporting.trackUserAction(action, target, data);
    },
    []
  );

  const trackHttpRequest = useCallback(
    (method: string, url: string, statusCode: number, duration: number) => {
      crashReporting.trackHttpRequest(method, url, statusCode, duration);
    },
    []
  );

  return {
    captureException,
    captureMessage,
    trackUserAction,
    trackHttpRequest,
  };
};
