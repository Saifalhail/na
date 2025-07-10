import { useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { deepLinking } from '@/services/linking/DeepLinkingService';

export const useDeepLinking = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Set navigation ref
    deepLinking.setNavigationRef({ current: navigation });

    // Setup common handlers
    deepLinking.setupCommonHandlers();
  }, [navigation]);

  const createMealLink = useCallback((mealId: string): string => {
    return deepLinking.createMealLink(mealId);
  }, []);

  const createProfileLink = useCallback((userId?: string): string => {
    return deepLinking.createProfileLink(userId);
  }, []);

  const shareMeal = useCallback(async (mealId: string, mealName: string) => {
    await deepLinking.shareMeal(mealId, mealName);
  }, []);

  const registerHandler = useCallback(
    (pattern: string | RegExp, handler: (params: Record<string, string>) => void) => {
      deepLinking.registerHandler(pattern, handler);
    },
    []
  );

  return {
    createMealLink,
    createProfileLink,
    shareMeal,
    registerHandler,
  };
};
