import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './persist';
import { mealsApi } from '@/services/api';
import { OfflineManager } from '@/services/offline/OfflineManager';
import type { Meal, MealType } from '@/types/models';
import type { MealFilters, PaginatedResponse, CreateMealData, UpdateMealData } from '@/types/api';

interface MealState {
  // State
  meals: Meal[];
  favoriteMeals: Meal[];
  currentMeal: Meal | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filters: MealFilters;
  isLoading: boolean;
  error: string | null;
  // Offline state
  pendingActions: number;
  // Computed
  todayStats: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };

  // Actions
  fetchMeals: (page?: number, filters?: MealFilters) => Promise<void>;
  fetchMealById: (id: string) => Promise<void>;
  createMeal: (meal: Partial<Meal>) => Promise<Meal>;
  addMeal: (meal: Partial<Meal>) => Promise<Meal>; // Alias for createMeal
  updateMeal: (id: string, data: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  duplicateMeal: (id: string) => Promise<Meal>;
  fetchFavorites: () => Promise<void>;
  fetchStatistics: (startDate?: string, endDate?: string) => Promise<any>;
  setFilters: (filters: Partial<MealFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  reset: () => void;
}

const defaultFilters: MealFilters = {
  search: '',
  mealType: undefined,
  startDate: undefined,
  endDate: undefined,
  minCalories: undefined,
  maxCalories: undefined,
  favoritesOnly: false,
};

const offlineManager = OfflineManager.getInstance();

// Helper to calculate today's stats
const calculateTodayStats = (meals: Meal[]) => {
  const today = new Date();
  const todaysMeals = meals.filter((meal) => {
    const mealDate = new Date(meal.consumedAt || meal.createdAt);
    return mealDate.toDateString() === today.toDateString();
  });

  return {
    calories: todaysMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0),
    protein: todaysMeals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0),
    carbs: todaysMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0),
    fat: todaysMeals.reduce((sum, meal) => sum + (meal.totalFat || 0), 0),
  };
};

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      // Initial state
      meals: [],
      favoriteMeals: [],
      currentMeal: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 20,
      filters: defaultFilters,
      isLoading: false,
      error: null,
      pendingActions: 0,
      todayStats: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },

      // Fetch meals with pagination and filters
      fetchMeals: async (page = 1, filters?: MealFilters) => {
        set({ isLoading: true, error: null });
        try {
          const appliedFilters = filters || get().filters;
          const cacheKey = `meals_page_${page}_${JSON.stringify(appliedFilters)}`;

          // Check for cached data first
          const cachedData = await offlineManager.getCachedData<PaginatedResponse<Meal>>(cacheKey);
          if (cachedData && offlineManager.isConnected()) {
            // Use cached data while fetching fresh data in background
            set({
              meals: cachedData.results,
              totalCount: cachedData.count,
              currentPage: page,
              filters: appliedFilters,
              isLoading: false,
              error: null,
              todayStats: calculateTodayStats(cachedData.results),
            });
          }

          if (offlineManager.isConnected()) {
            const response = await mealsApi.getMeals({ ...appliedFilters, page, pageSize: get().pageSize });

            // Cache the response
            offlineManager.cacheData(cacheKey, response, 1000 * 60 * 30); // 30 minute cache

            set({
              meals: response.results,
              totalCount: response.count,
              currentPage: page,
              filters: appliedFilters,
              isLoading: false,
              error: null,
              todayStats: calculateTodayStats(response.results),
            });
          } else if (!cachedData) {
            // No cached data and offline
            throw new Error('No internet connection and no cached data available');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch meals',
          });
          throw error;
        }
      },

      // Fetch single meal
      fetchMealById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const meal = await mealsApi.getMeal(id);
          set({
            currentMeal: meal,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch meal',
          });
          throw error;
        }
      },

      // Create meal
      createMeal: async (mealData: Partial<Meal>) => {
        set({ isLoading: true, error: null });

        // Create optimistic meal with temporary ID
        const tempMeal: Meal = {
          id: `temp_${Date.now()}`,
          ...mealData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPending: true,
        } as Meal;

        // Add optimistic update immediately
        const { meals } = get();
        const newMeals = [tempMeal, ...meals];
        set({
          meals: newMeals,
          isLoading: false,
          error: null,
          todayStats: calculateTodayStats(newMeals),
        });

        try {
          if (offlineManager.isConnected()) {
            // Online: create immediately
            const newMeal = await mealsApi.createMeal(mealData as unknown as CreateMealData);

            // Replace temp meal with real one
            const updatedMeals = get().meals.map((meal) =>
              meal.id === tempMeal.id ? newMeal : meal
            );
            set({
              meals: updatedMeals,
              todayStats: calculateTodayStats(updatedMeals),
            });

            return newMeal;
          } else {
            // Offline: queue the request
            await offlineManager.queueRequest('POST', '/api/meals/', mealData);

            set({ pendingActions: get().pendingActions + 1 });

            // Listen for when request completes
            const unsubscribe = offlineManager.onConnectivityChange(async (isOnline) => {
              if (isOnline) {
                // Will be handled by queue processor
                unsubscribe();
              }
            });

            return tempMeal;
          }
        } catch (error: any) {
          // Remove optimistic update on error
          set({
            meals: get().meals.filter((meal) => meal.id !== tempMeal.id),
            error: error.message || 'Failed to create meal',
          });
          throw error;
        }
      },

      // Update meal
      updateMeal: async (id: string, data: Partial<Meal>) => {
        set({ isLoading: true, error: null });

        // Store original meal for rollback
        const originalMeal = get().meals.find((m) => m.id === id);

        // Optimistic update
        const { meals } = get();
        set({
          meals: meals.map((meal) =>
            meal.id === id
              ? { ...meal, ...data, updatedAt: new Date().toISOString(), isPending: true }
              : meal
          ),
          currentMeal:
            get().currentMeal?.id === id
              ? { ...get().currentMeal, ...data, updatedAt: new Date().toISOString() } as Meal
              : get().currentMeal,
          isLoading: false,
          error: null,
        });

        try {
          if (offlineManager.isConnected()) {
            const updatedMeal = await mealsApi.updateMeal(id, data as UpdateMealData);

            // Update with real data
            set({
              meals: get().meals.map((meal) => (meal.id === id ? updatedMeal : meal)),
              currentMeal: get().currentMeal?.id === id ? updatedMeal : get().currentMeal,
            });
          } else {
            // Queue the update
            await offlineManager.queueRequest('PATCH', `/api/meals/${id}/`, data);

            set({ pendingActions: get().pendingActions + 1 });
          }
        } catch (error: any) {
          // Rollback on error
          if (originalMeal) {
            set({
              meals: get().meals.map((meal) => (meal.id === id ? originalMeal : meal)),
              currentMeal: get().currentMeal?.id === id ? originalMeal : get().currentMeal,
              error: error.message || 'Failed to update meal',
            });
          }
          throw error;
        }
      },

      // Delete meal
      deleteMeal: async (id: string) => {
        set({ isLoading: true, error: null });

        // Store meal for rollback
        const mealToDelete = get().meals.find((m) => m.id === id);
        const mealIndex = get().meals.findIndex((m) => m.id === id);

        // Optimistic delete
        const { meals } = get();
        set({
          meals: meals.filter((meal) => meal.id !== id),
          currentMeal: get().currentMeal?.id === id ? null : get().currentMeal,
          isLoading: false,
          error: null,
        });

        try {
          if (offlineManager.isConnected()) {
            await mealsApi.deleteMeal(id);
          } else {
            // Queue the delete
            await offlineManager.queueRequest('DELETE', `/api/meals/${id}/`);

            set({ pendingActions: get().pendingActions + 1 });
          }
        } catch (error: any) {
          // Rollback on error
          if (mealToDelete && mealIndex !== -1) {
            const currentMeals = get().meals;
            currentMeals.splice(mealIndex, 0, mealToDelete);
            set({
              meals: [...currentMeals],
              error: error.message || 'Failed to delete meal',
            });
          }
          throw error;
        }
      },

      // Toggle favorite
      toggleFavorite: async (id: string) => {
        const { meals, favoriteMeals } = get();
        const meal = meals.find((m) => m.id === id);

        if (!meal) return;

        set({ isLoading: true, error: null });
        try {
          if (meal.isFavorite) {
            await mealsApi.removeFromFavorites(id);
            set({
              meals: meals.map((m) => (m.id === id ? { ...m, isFavorite: false } : m)),
              favoriteMeals: favoriteMeals.filter((m) => m.id !== id),
              isLoading: false,
            });
          } else {
            await mealsApi.addToFavorites(id);
            set({
              meals: meals.map((m) => (m.id === id ? { ...m, isFavorite: true } : m)),
              favoriteMeals: [...favoriteMeals, { ...meal, isFavorite: true }],
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to toggle favorite',
          });
          throw error;
        }
      },

      // Duplicate meal
      duplicateMeal: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const duplicatedMeal = await mealsApi.duplicateMeal(id);

          // Add to meals list
          const { meals } = get();
          set({
            meals: [duplicatedMeal, ...meals],
            isLoading: false,
            error: null,
          });

          return duplicatedMeal;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to duplicate meal',
          });
          throw error;
        }
      },

      // Fetch favorites
      fetchFavorites: async () => {
        set({ isLoading: true, error: null });
        try {
          const favorites = await mealsApi.getFavorites();
          set({
            favoriteMeals: favorites,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch favorites',
          });
          throw error;
        }
      },

      // Fetch statistics
      fetchStatistics: async (startDate?: string, endDate?: string) => {
        set({ isLoading: true, error: null });
        try {
          const stats = await mealsApi.getStatistics(startDate, endDate);
          set({ isLoading: false, error: null });
          return stats;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch statistics',
          });
          throw error;
        }
      },

      // Set filters
      setFilters: (newFilters: Partial<MealFilters>) => {
        const { filters } = get();
        set({
          filters: { ...filters, ...newFilters },
        });
      },

      // Clear filters
      clearFilters: () => set({ filters: defaultFilters }),

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () =>
        set({
          meals: [],
          favoriteMeals: [],
          currentMeal: null,
          totalCount: 0,
          currentPage: 1,
          filters: defaultFilters,
          isLoading: false,
          error: null,
          pendingActions: 0,
          todayStats: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        }),

      // Alias for createMeal to match AnalysisResultsScreen usage
      addMeal: async (mealData: Partial<Meal>) => {
        return get().createMeal(mealData);
      },
    }),
    {
      name: 'meal-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        favoriteMeals: state.favoriteMeals,
        filters: state.filters,
      }),
    }
  )
);

// Computed selectors
export const useMealSelectors = () => {
  const meals = useMealStore((state) => state.meals);
  const filters = useMealStore((state) => state.filters);

  const todaysMeals = meals.filter((meal) => {
    const mealDate = new Date(meal.consumedAt);
    const today = new Date();
    return mealDate.toDateString() === today.toDateString();
  });

  const todaysCalories = todaysMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
  const todaysProtein = todaysMeals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0);
  const todaysCarbs = todaysMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0);
  const todaysFat = todaysMeals.reduce((sum, meal) => sum + (meal.totalFat || 0), 0);

  return {
    todaysMeals,
    todaysNutrition: {
      calories: todaysCalories,
      protein: todaysProtein,
      carbs: todaysCarbs,
      fat: todaysFat,
    },
    mealsByType: (type: MealType) => meals.filter((meal) => meal.mealType === type),
    hasActiveFilters: Object.entries(filters).some(
      ([key, value]) => key !== 'search' && value !== undefined && value !== false && value !== ''
    ),
  };
};
