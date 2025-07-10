import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './persist';
import { authApi } from '@services/api';
import type { UserProfile, DietaryRestriction } from '@/types/models';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    mealReminders: boolean;
    dailySummary: boolean;
    achievements: boolean;
  };
  units: {
    weight: 'kg' | 'lbs';
    height: 'cm' | 'inches';
  };
}

interface UserState {
  // State
  profile: UserProfile | null;
  dietaryRestrictions: DietaryRestriction[];
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  addDietaryRestriction: (restriction: DietaryRestriction) => void;
  removeDietaryRestriction: (id: string) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  clearError: () => void;
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: {
    mealReminders: true,
    dailySummary: true,
    achievements: true,
  },
  units: {
    weight: 'kg',
    height: 'cm',
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      profile: null,
      dietaryRestrictions: [],
      preferences: defaultPreferences,
      isLoading: false,
      error: null,

      // Fetch user profile
      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const profile = await authApi.getProfile();
          set({
            profile,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch profile',
          });
          throw error;
        }
      },

      // Update profile
      updateProfile: async (data: Partial<UserProfile>) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProfile = await authApi.updateProfile(data);
          set({
            profile: updatedProfile,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to update profile',
          });
          throw error;
        }
      },

      // Set dietary restrictions
      setDietaryRestrictions: (restrictions: DietaryRestriction[]) => {
        set({ dietaryRestrictions: restrictions });
      },

      // Add dietary restriction
      addDietaryRestriction: (restriction: DietaryRestriction) => {
        const { dietaryRestrictions } = get();
        set({
          dietaryRestrictions: [...dietaryRestrictions, restriction],
        });
      },

      // Remove dietary restriction
      removeDietaryRestriction: (id: string) => {
        const { dietaryRestrictions } = get();
        set({
          dietaryRestrictions: dietaryRestrictions.filter((r) => r.id !== id),
        });
      },

      // Update preferences
      updatePreferences: (newPreferences: Partial<UserPreferences>) => {
        const { preferences } = get();
        set({
          preferences: {
            ...preferences,
            ...newPreferences,
            notifications: {
              ...preferences.notifications,
              ...(newPreferences.notifications || {}),
            },
            units: {
              ...preferences.units,
              ...(newPreferences.units || {}),
            },
          },
        });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () =>
        set({
          profile: null,
          dietaryRestrictions: [],
          preferences: defaultPreferences,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        profile: state.profile,
        dietaryRestrictions: state.dietaryRestrictions,
        preferences: state.preferences,
      }),
    }
  )
);

// Computed selectors
export const useUserSelectors = () => {
  const profile = useUserStore((state) => state.profile);

  return {
    hasCompletedProfile:
      profile && profile.height && profile.weight && profile.activityLevel && profile.gender,

    dailyCalorieGoal: profile?.dailyCalorieGoal || profile?.tdee || 2000,

    macroGoals: {
      protein: profile?.dailyProteinGoal || 50,
      carbs: profile?.dailyCarbsGoal || 250,
      fat: profile?.dailyFatGoal || 65,
    },

    bmi: profile?.bmi || null,
    bmr: profile?.bmr || null,
    tdee: profile?.tdee || null,
  };
};
