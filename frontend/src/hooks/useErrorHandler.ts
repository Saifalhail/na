import { useCallback } from 'react';
import { env } from '../config/env';

export interface ErrorReport {
  error: Error;
  errorInfo?: any;
  context?: Record<string, any>;
  userId?: string;
}

export const useErrorHandler = () => {
  const reportError = useCallback((errorReport: ErrorReport) => {
    const { error, errorInfo, context, userId } = errorReport;

    // Log to console in development
    if (__DEV__) {
      console.error('Error reported:', error);
      if (errorInfo) {
        console.error('Error info:', errorInfo);
      }
      if (context) {
        console.error('Error context:', context);
      }
    }

    // Report to Sentry if enabled
    if (env.enableCrashReporting && env.sentryDsn) {
      // Sentry integration would go here
      // Sentry.captureException(error, {
      //   contexts: {
      //     react: errorInfo,
      //     custom: context,
      //   },
      //   user: userId ? { id: userId } : undefined,
      // });
    }

    // Report to analytics if enabled
    if (env.enableAnalytics) {
      // Analytics integration would go here
      // analytics.track('Error Occurred', {
      //   error: error.message,
      //   stack: error.stack,
      //   context,
      // });
    }
  }, []);

  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    reportError({ error: errorObj, context });
  }, [reportError]);

  return {
    reportError,
    handleError,
  };
};