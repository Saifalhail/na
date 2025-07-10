import { useEffect, useMemo } from 'react';
import { abTesting } from '@/services/experiments/ABTestingService';
import { useAuthStore } from '@/store/authStore';

export const useExperiment = (experimentId: string) => {
  const { user } = useAuthStore();

  // Initialize A/B testing with user ID
  useEffect(() => {
    if (user) {
      abTesting.initialize(user.id);
    }
  }, [user]);

  const variant = useMemo(() => {
    if (!user) return null;
    return abTesting.getVariant(experimentId);
  }, [experimentId, user]);

  const config = useMemo(() => {
    if (!user) return null;
    return abTesting.getExperimentConfig(experimentId);
  }, [experimentId, user]);

  const trackConversion = (conversionEvent: string, value?: number) => {
    abTesting.trackConversion(experimentId, conversionEvent, value);
  };

  const getExperimentValue = <T>(paramKey: string, defaultValue: T): T => {
    return abTesting.getExperimentValue(experimentId, paramKey, defaultValue);
  };

  return {
    variant,
    config,
    trackConversion,
    getExperimentValue,
    isLoading: !user,
  };
};

// Hook for feature flags
export const useFeatureFlag = (featureKey: string, defaultValue: boolean = false): boolean => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      abTesting.initialize(user.id);
    }
  }, [user]);

  return useMemo(() => {
    if (!user) return defaultValue;
    return abTesting.isFeatureEnabled(featureKey, defaultValue);
  }, [featureKey, defaultValue, user]);
};

// Hook for experiment values
export const useExperimentValue = <T>(
  experimentId: string,
  paramKey: string,
  defaultValue: T
): T => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      abTesting.initialize(user.id);
    }
  }, [user]);

  return useMemo(() => {
    if (!user) return defaultValue;
    return abTesting.getExperimentValue(experimentId, paramKey, defaultValue);
  }, [experimentId, paramKey, defaultValue, user]);
};
