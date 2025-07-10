import { useCallback } from 'react';
import { analytics } from '@/services/analytics/AnalyticsService';
import { useAuthStore } from '@/store/authStore';

export const useAnalytics = () => {
  const { user } = useAuthStore();

  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analytics.track(eventName, properties);
  }, []);

  const trackScreenView = useCallback((screenName: string, properties?: Record<string, any>) => {
    analytics.trackScreenView(screenName, properties);
  }, []);

  const trackButtonClick = useCallback((buttonName: string, properties?: Record<string, any>) => {
    analytics.trackButtonClick(buttonName, properties);
  }, []);

  const trackError = useCallback((error: Error, properties?: Record<string, any>) => {
    analytics.trackError(error, properties);
  }, []);

  const trackMealAnalyzed = useCallback(
    (mealData: {
      mealId: string;
      foodItems: number;
      totalCalories: number;
      analysisTime: number;
      imageSource: 'camera' | 'gallery';
    }) => {
      analytics.trackMealAnalyzed(mealData);
    },
    []
  );

  const trackMealSaved = useCallback(
    (mealData: { mealId: string; mealName: string; totalCalories: number; mealType?: string }) => {
      analytics.trackMealSaved(mealData);
    },
    []
  );

  const trackFavoriteToggled = useCallback((mealId: string, isFavorite: boolean) => {
    analytics.trackFavoriteToggled(mealId, isFavorite);
  }, []);

  const trackFeatureUsed = useCallback((featureName: string, properties?: Record<string, any>) => {
    analytics.trackFeatureUsed(featureName, properties);
  }, []);

  const trackGoalSet = useCallback((goalType: string, goalValue: number) => {
    analytics.trackGoalSet(goalType, goalValue);
  }, []);

  // Initialize analytics when user is available
  if (user && !analytics['isInitialized']) {
    analytics.initialize(user.id);
    analytics.identify(user.id, {
      email: user.email,
      createdAt: user.created_at,
    });
  }

  return {
    trackEvent,
    trackScreenView,
    trackButtonClick,
    trackError,
    trackMealAnalyzed,
    trackMealSaved,
    trackFavoriteToggled,
    trackFeatureUsed,
    trackGoalSet,
  };
};
