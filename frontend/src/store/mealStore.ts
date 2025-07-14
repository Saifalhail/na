import React from 'react';
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

// Helper to calculate today's stats - optimized to use single pass
const calculateTodayStats = (meals: Meal[]) => {
  const today = new Date();
  const todayString = today.toDateString();

  return meals.reduce(
    (stats, meal) => {
      const mealDate = new Date(meal.consumedAt || meal.createdAt);
      if (mealDate.toDateString() === todayString) {
        stats.calories += meal.totalCalories || 0;
        stats.protein += meal.totalProtein || 0;
        stats.carbs += meal.totalCarbs || 0;
        stats.fat += meal.totalFat || 0;
      }
      return stats;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
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

      // Fetch meals with pagination and filters - optimized with performance tracking
      fetchMeals: async (page = 1, filters?: MealFilters) => {
        const fetchStartTime = performance.now();
        if (__DEV__) {
          console.log('🍽️ [MealStore] fetchMeals called:', { page, filters });
          console.log('🔍 [MealStore] Current state:', {
            currentMealsCount: get().meals.length,
            isLoading: get().isLoading,
            hasError: !!get().error,
          });
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const appliedFilters = filters || get().filters;
          const cacheKey = `meals_page_${page}_${JSON.stringify(appliedFilters)}`;

          if (__DEV__) {
            console.log('🍽️ [MealStore] Checking cache for key:', cacheKey);
          }
          
          // Check for cached data first
          const cacheStartTime = performance.now();
          const cachedData = await offlineManager.getCachedData<PaginatedResponse<Meal>>(cacheKey);
          
          if (cachedData && offlineManager.isConnected()) {
            const cacheEndTime = performance.now();
            if (__DEV__) {
              console.log(`⏱️ [PERFORMANCE] Cache lookup took ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
              console.log('🍽️ [MealStore] Using cached data, meals count:', cachedData.results.length);
            }
            
            // Use cached data while fetching fresh data in background
            const statsStartTime = performance.now();
            const todayStats = calculateTodayStats(cachedData.results);
            
            set({
              meals: cachedData.results,
              totalCount: cachedData.count,
              currentPage: page,
              filters: appliedFilters,
              isLoading: false,
              error: null,
              todayStats,
            });
            
            if (__DEV__) {
              const statsEndTime = performance.now();
              console.log(`⏱️ [PERFORMANCE] Stats calculation took ${(statsEndTime - statsStartTime).toFixed(2)}ms`);
            }
          }

          if (offlineManager.isConnected()) {
            try {
              const apiStartTime = performance.now();
              if (__DEV__) {
                console.log('🍽️ [MealStore] Making API request with filters:', appliedFilters);
              }
              
              const response = await mealsApi.getMeals({
                ...appliedFilters,
                page,
                pageSize: get().pageSize,
              });
              
              const apiEndTime = performance.now();
              if (__DEV__) {
                console.log(`⏱️ [PERFORMANCE] API call took ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
                console.log('🍽️ [MealStore] API response:', {
                  mealsCount: response.results.length,
                  totalCount: response.count,
                  hasNext: response.next !== null,
                  hasPrevious: response.previous !== null,
                });
              }

              // Cache the response
              const cacheStartTime = performance.now();
              offlineManager.cacheData(cacheKey, response, 1000 * 60 * 30); // 30 minute cache
              
              if (__DEV__) {
                const cacheEndTime = performance.now();
                console.log(`⏱️ [PERFORMANCE] Cache write took ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
              }
              
              const statsStartTime = performance.now();
              const todayStats = calculateTodayStats(response.results);

              set({
                meals: response.results,
                totalCount: response.count,
                currentPage: page,
                filters: appliedFilters,
                isLoading: false,
                error: null,
                todayStats,
              });
              
              if (__DEV__) {
                const fetchEndTime = performance.now();
                console.log(`⏱️ [PERFORMANCE] Total fetchMeals took ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
                console.log('🍽️ [MealStore] Today stats:', todayStats);
              }
            } catch (apiError) {
              if (__DEV__) {
                console.error('🍽️ [MealStore] API error:', apiError);
                console.error('🍽️ [MealStore] Error details:', {
                  message: apiError instanceof Error ? apiError.message : 'Unknown error',
                  stack: apiError instanceof Error ? apiError.stack : undefined,
                });
              }
              throw apiError;
            }
          } else if (!cachedData) {
            // No cached data and offline
            throw new Error('No internet connection and no cached data available');
          }
        } catch (error: any) {
          const errorTime = performance.now();
          if (__DEV__) {
            console.error('🍽️ [MealStore] Error fetching meals:', error);
            console.error(`⏱️ [PERFORMANCE] Failed after ${(errorTime - fetchStartTime).toFixed(2)}ms`);
          }
          
          // For demo mode or when API is unreachable, use mock data
          if (error.message?.includes('Network') || error.message?.includes('Failed to fetch') || error.message?.includes('Cannot reach server')) {
            if (__DEV__) {
              console.log('🍽️ [MealStore] Using demo meals due to network error');
              console.log('🍽️ [MealStore] Error type:', error.message);
            }
            
            const demoMeals: Meal[] = [
              {
                id: 'demo-1',
                name: 'Grilled Chicken Salad',
                mealType: 'lunch' as MealType,
                totalCalories: 420,
                totalProtein: 35,
                totalCarbs: 20,
                totalFat: 18,
                totalFiber: 8,
                totalSugar: 5,
                totalSodium: 580,
                image_url: undefined,
                mealItems: [],
                user: 'demo-user',
                isFavorite: false,
                consumedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: 'demo-2',
                name: 'Oatmeal with Berries',
                mealType: 'breakfast' as MealType,
                totalCalories: 320,
                totalProtein: 12,
                totalCarbs: 58,
                totalFat: 8,
                totalFiber: 10,
                totalSugar: 15,
                totalSodium: 120,
                image_url: undefined,
                mealItems: [],
                user: 'demo-user',
                isFavorite: true,
                consumedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                updatedAt: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 'demo-3',
                name: 'Salmon with Quinoa',
                mealType: 'dinner' as MealType,
                totalCalories: 550,
                totalProtein: 42,
                totalCarbs: 45,
                totalFat: 22,
                totalFiber: 6,
                totalSugar: 3,
                totalSodium: 450,
                image_url: undefined,
                mealItems: [],
                user: 'demo-user',
                isFavorite: true,
                consumedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 86400000).toISOString(),
              },
            ];
            
            set({
              meals: demoMeals,
              totalCount: demoMeals.length,
              currentPage: page,
              filters: appliedFilters,
              isLoading: false,
              error: null,
              todayStats: calculateTodayStats(demoMeals),
            });
            
            return; // Don't throw error for demo mode
          }
          
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
              ? ({ ...get().currentMeal, ...data, updatedAt: new Date().toISOString() } as Meal)
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

// Memoized selectors to prevent recalculation on every render
const getTodaysMeals = (meals: Meal[]) => {
  const today = new Date().toDateString();
  return meals.filter((meal) => {
    const mealDate = new Date(meal.consumedAt);
    return mealDate.toDateString() === today;
  });
};

const calculateTodaysNutrition = (todaysMeals: Meal[]) => {
  const calories = todaysMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
  const protein = todaysMeals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0);
  const carbs = todaysMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0);
  const fat = todaysMeals.reduce((sum, meal) => sum + (meal.totalFat || 0), 0);
  
  return {
    calories,
    protein,
    carbs,
    fat,
  };
};

// Computed selectors with memoization
export const useMealSelectors = () => {
  const meals = useMealStore((state) => state.meals);
  
  // Use React.useMemo to prevent recalculation on every render
  const todaysMeals = React.useMemo(() => getTodaysMeals(meals), [meals]);
  const todaysNutrition = React.useMemo(() => calculateTodaysNutrition(todaysMeals), [todaysMeals]);

  return {
    todaysMeals,
    todaysNutrition,
    mealsByType: (type: MealType) => meals.filter((meal) => meal.mealType === type),
    hasActiveFilters: Object.entries(useMealStore.getState().filters).some(
      ([key, value]) => key !== 'search' && value !== undefined && value !== false && value !== ''
    ),
  };
};
