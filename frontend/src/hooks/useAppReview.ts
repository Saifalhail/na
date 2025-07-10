import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { appReview } from '@/services/review/AppReviewService';
import { useAuthStore } from '@/store/authStore';
import { useMealStore } from '@/store/mealStore';

export const useAppReview = () => {
  const { user } = useAuthStore();
  const { meals } = useMealStore();

  // Track app opens
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        appReview.incrementAppOpens();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Increment on mount (initial open)
    appReview.incrementAppOpens();

    return () => {
      subscription.remove();
    };
  }, []);

  // Track meals logged
  useEffect(() => {
    if (meals.length > 0) {
      // This is a simple implementation - in production, you'd want to track
      // only new meals, not the total count
      appReview.incrementMealsLogged();
    }
  }, [meals.length]);

  const promptForReview = useCallback(async () => {
    await appReview.promptForReview();
  }, []);

  const openAppStore = useCallback(async () => {
    await appReview.openAppStore();
  }, []);

  const markAsRated = useCallback(() => {
    appReview.markAsRated();
  }, []);

  return {
    promptForReview,
    openAppStore,
    markAsRated,
  };
};
