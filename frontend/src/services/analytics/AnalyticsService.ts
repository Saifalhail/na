import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { createStorage, Storage } from '@/utils/storage';
import { API_CONFIG } from '@/config/env';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface UserProperties {
  userId?: string;
  email?: string;
  plan?: string;
  createdAt?: string;
  [key: string]: any;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private storage: Storage;
  private sessionId: string;
  private userId?: string;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;
  private debugMode = __DEV__;
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.storage = createStorage('analytics');
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  initialize(userId?: string): void {
    if (this.isInitialized) return;

    this.userId = userId;
    this.isInitialized = true;

    // Start flush timer
    this.startFlushTimer();

    // Log initialization
    this.logDebug('Analytics initialized', {
      userId,
      sessionId: this.sessionId,
      platform: Platform.OS,
      device: Device.modelName,
    });

    // Track app open
    this.track('app_opened', {
      platform: Platform.OS,
      device_model: Device.modelName,
      device_brand: Device.brand,
      os_version: Device.osVersion,
      app_version: API_CONFIG.APP_VERSION,
    });
  }

  async identify(userId: string, properties?: UserProperties): Promise<void> {
    this.userId = userId;

    const userProps = {
      ...properties,
      userId,
      platform: Platform.OS,
      device_model: Device.modelName,
      last_seen: new Date().toISOString(),
    };

    // Store user properties
    await this.storage.set(`user_${userId}`, JSON.stringify(userProps));

    this.logDebug('User identified', userProps);

    // Send identify event
    this.track('user_identified', userProps);
  }

  async track(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) {
      this.logDebug('Analytics not initialized, skipping event:', eventName);
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: Platform.OS,
        session_id: this.sessionId,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    // Add to queue
    this.eventQueue.push(event);

    // Store for persistence
    const queueKey = `event_queue_${Date.now()}`;
    await this.storage.set(queueKey, JSON.stringify(event));

    this.logDebug('Event tracked:', event);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  // Common event tracking methods
  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.track('screen_viewed', {
      screen_name: screenName,
      ...properties,
    });
  }

  trackButtonClick(buttonName: string, properties?: Record<string, any>): void {
    this.track('button_clicked', {
      button_name: buttonName,
      ...properties,
    });
  }

  trackError(error: Error, properties?: Record<string, any>): void {
    this.track('error_occurred', {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      ...properties,
    });
  }

  // Meal-specific events
  trackMealAnalyzed(mealData: {
    mealId: string;
    foodItems: number;
    totalCalories: number;
    analysisTime: number;
    imageSource: 'camera' | 'gallery';
  }): void {
    this.track('meal_analyzed', mealData);
  }

  trackMealSaved(mealData: {
    mealId: string;
    mealName: string;
    totalCalories: number;
    mealType?: string;
  }): void {
    this.track('meal_saved', mealData);
  }

  trackFavoriteToggled(mealId: string, isFavorite: boolean): void {
    this.track('favorite_toggled', {
      meal_id: mealId,
      is_favorite: isFavorite,
    });
  }

  trackNutritionRecalculated(data: {
    mealId: string;
    itemsModified: number;
    recalculationTime: number;
  }): void {
    this.track('nutrition_recalculated', data);
  }

  // User engagement events
  trackFeatureUsed(featureName: string, properties?: Record<string, any>): void {
    this.track('feature_used', {
      feature_name: featureName,
      ...properties,
    });
  }

  trackGoalSet(goalType: string, goalValue: number): void {
    this.track('goal_set', {
      goal_type: goalType,
      goal_value: goalValue,
    });
  }

  trackAchievementUnlocked(achievementName: string): void {
    this.track('achievement_unlocked', {
      achievement_name: achievementName,
    });
  }

  // Session management
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.track('session_started');
  }

  endSession(): void {
    this.track('session_ended', {
      session_duration: Date.now() - parseInt(this.sessionId),
    });
    this.flush();
  }

  // A/B Testing support
  async getExperiment(experimentName: string): Promise<string | null> {
    const experiments = await this.storage.getString('experiments');
    if (experiments) {
      const parsed = JSON.parse(experiments);
      return parsed[experimentName] || null;
    }
    return null;
  }

  async setExperiment(experimentName: string, variant: string): Promise<void> {
    const experiments = await this.storage.getString('experiments') || '{}';
    const parsed = JSON.parse(experiments);
    parsed[experimentName] = variant;
    await this.storage.set('experiments', JSON.stringify(parsed));

    this.track('experiment_assigned', {
      experiment_name: experimentName,
      variant,
    });
  }

  // Utility methods
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In production, this would send to your analytics backend
      if (!this.debugMode) {
        // await sendAnalyticsEvents(events);
      }

      // Clear persisted events
      const keys = await this.storage.getAllKeys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('event_queue_'))
          .map((key) => this.storage.delete(key))
      );

      this.logDebug('Events flushed:', events.length);
    } catch (error) {
      // Re-add events to queue on failure
      this.eventQueue = [...events, ...this.eventQueue];
      this.logDebug('Failed to flush events:', error);
    }
  }

  private logDebug(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[Analytics] ${message}`, data || '');
    }
  }

  // Cleanup
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

export const analytics = AnalyticsService.getInstance();

// Export types
export type { AnalyticsEvent, UserProperties };
