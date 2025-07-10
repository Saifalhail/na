// Import stores for internal use
import { useAuthStore } from './authStore';
import { useUserStore } from './userStore';
import { useMealStore } from './mealStore';
import { useUIStore } from './uiStore';
import { useNotificationStore } from './notificationStore';
import { useTwoFactorStore } from './twoFactorStore';
import { clearAllPersistedData } from './persist';

// Export all stores
export { useAuthStore } from './authStore';
export { useUserStore, useUserSelectors } from './userStore';
export { useMealStore, useMealSelectors } from './mealStore';
export { useUIStore, useTheme, useLoading, useToast } from './uiStore';
export { useNotificationStore } from './notificationStore';
export { useTwoFactorStore } from './twoFactorStore';

// Export persist utilities
export { clearAllPersistedData, getAllStorageKeys } from './persist';

// Combined reset function
export const resetAllStores = async () => {
  const { reset: resetAuth } = useAuthStore.getState();
  const { reset: resetUser } = useUserStore.getState();
  const { reset: resetMeal } = useMealStore.getState();
  const { reset: resetUI } = useUIStore.getState();
  const { reset: resetNotification } = useNotificationStore.getState();
  const { reset: resetTwoFactor } = useTwoFactorStore.getState();

  // Call individual reset functions
  resetAuth();
  resetUser();
  resetMeal();
  resetUI();
  resetNotification();
  resetTwoFactor();

  // Clear persisted data
  await clearAllPersistedData();
};
