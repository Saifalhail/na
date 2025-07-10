import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { enableCrashReporting, sentryDsn, environment, appVersion } from '@/config/env';
import { analytics } from '@/services/analytics/AnalyticsService';

interface CrashReport {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    userId?: string;
    sessionId?: string;
    screen?: string;
    action?: string;
  };
  device: {
    platform: string;
    osVersion?: string;
    model?: string;
    brand?: string;
    isDevice: boolean;
  };
  app: {
    version: string;
    environment: string;
  };
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'action' | 'http' | 'console' | 'error';
  category: string;
  message: string;
  data?: Record<string, any>;
}

class CrashReportingService {
  private static instance: CrashReportingService;
  private storage: MMKV;
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private userId?: string;
  private currentScreen?: string;
  private isInitialized = false;

  private constructor() {
    this.storage = new MMKV({ id: 'crash-reporting' });
  }

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  initialize(userId?: string): void {
    if (!enableCrashReporting || this.isInitialized) {
      return;
    }

    this.userId = userId;
    this.isInitialized = true;

    // Set up global error handlers
    this.setupErrorHandlers();

    // Load persisted breadcrumbs
    this.loadPersistedBreadcrumbs();

    console.log('[CrashReporting] Initialized');
  }

  setUser(userId: string, email?: string): void {
    this.userId = userId;
    this.addBreadcrumb('user', 'User context updated', { userId, email });
  }

  setCurrentScreen(screenName: string): void {
    this.currentScreen = screenName;
    this.addBreadcrumb('navigation', `Navigated to ${screenName}`);
  }

  // Capture handled errors
  captureException(error: Error, context?: Record<string, any>): void {
    const report = this.createCrashReport(error, context);
    this.sendReport(report);

    // Also track in analytics
    analytics.trackError(error, {
      ...context,
      crash_report_id: report.id,
    });
  }

  // Capture custom messages
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, any>
  ): void {
    this.addBreadcrumb('console', message, { level, ...context });

    if (level === 'error') {
      const error = new Error(message);
      this.captureException(error, context);
    }
  }

  // Add breadcrumb for tracking user actions
  addBreadcrumb(type: Breadcrumb['type'], message: string, data?: Record<string, any>): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      type,
      category: type,
      message,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }

    // Persist breadcrumbs
    this.persistBreadcrumbs();
  }

  // Track HTTP requests
  trackHttpRequest(method: string, url: string, statusCode: number, duration: number): void {
    this.addBreadcrumb('http', `${method} ${url}`, {
      method,
      url,
      status_code: statusCode,
      duration,
    });
  }

  // Track user actions
  trackUserAction(action: string, target?: string, data?: Record<string, any>): void {
    this.addBreadcrumb('action', action, {
      target,
      ...data,
    });
  }

  private setupErrorHandlers(): void {
    // Handle unhandled promise rejections
    const originalHandler = global.Promise.prototype.constructor.onunhandledrejection;
    global.Promise.prototype.constructor.onunhandledrejection = (event: any) => {
      const error = new Error(event.reason || 'Unhandled Promise Rejection');
      error.name = 'UnhandledPromiseRejection';
      this.captureException(error, { event });

      if (originalHandler) {
        originalHandler(event);
      }
    };

    // Handle global errors
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.captureException(error, { is_fatal: isFatal });

      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  private createCrashReport(error: Error, context?: Record<string, any>): CrashReport {
    return {
      id: this.generateReportId(),
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        userId: this.userId,
        sessionId: this.generateSessionId(),
        screen: this.currentScreen,
        action: context?.action,
        ...context,
      },
      device: {
        platform: Platform.OS,
        osVersion: Device.osVersion || undefined,
        model: Device.modelName || undefined,
        brand: Device.brand || undefined,
        isDevice: Device.isDevice,
      },
      app: {
        version: appVersion,
        environment,
      },
      breadcrumbs: [...this.breadcrumbs],
    };
  }

  private async sendReport(report: CrashReport): Promise<void> {
    // In production, this would send to Sentry or similar service
    if (sentryDsn) {
      // TODO: Implement Sentry integration
      console.log('[CrashReporting] Would send to Sentry:', report);
    }

    // Store locally for debugging
    this.storage.set(`crash_${report.id}`, JSON.stringify(report));

    // Log in development
    if (__DEV__) {
      console.error('[CrashReport]', report);
    }
  }

  private persistBreadcrumbs(): void {
    this.storage.set('breadcrumbs', JSON.stringify(this.breadcrumbs));
  }

  private loadPersistedBreadcrumbs(): void {
    const stored = this.storage.getString('breadcrumbs');
    if (stored) {
      try {
        this.breadcrumbs = JSON.parse(stored);
      } catch (error) {
        console.error('[CrashReporting] Failed to load breadcrumbs:', error);
      }
    }
  }

  private generateReportId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateSessionId(): string {
    return Date.now().toString(36);
  }

  // Get stored crash reports (for debugging)
  getStoredReports(): CrashReport[] {
    const reports: CrashReport[] = [];
    const keys = this.storage.getAllKeys();

    keys.forEach((key) => {
      if (key.startsWith('crash_')) {
        const stored = this.storage.getString(key);
        if (stored) {
          try {
            reports.push(JSON.parse(stored));
          } catch (error) {
            console.error('[CrashReporting] Failed to parse report:', error);
          }
        }
      }
    });

    return reports.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Clear old reports
  clearOldReports(daysToKeep: number = 7): void {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const keys = this.storage.getAllKeys();

    keys.forEach((key) => {
      if (key.startsWith('crash_')) {
        const stored = this.storage.getString(key);
        if (stored) {
          try {
            const report: CrashReport = JSON.parse(stored);
            if (report.timestamp < cutoffTime) {
              this.storage.delete(key);
            }
          } catch (error) {
            // Invalid report, delete it
            this.storage.delete(key);
          }
        }
      }
    });
  }
}

export const crashReporting = CrashReportingService.getInstance();

// Export types
export type { CrashReport, Breadcrumb };
