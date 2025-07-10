import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import {
  CreateMealData,
  UpdateMealData,
  MealFilters,
  QuickLogRequest,
  PaginatedResponse,
} from '@/types/api';
import { Meal, MealStatistics } from '@/types/models';

export const mealsApi = {
  /**
   * Get list of meals with optional filters
   */
  async getMeals(filters?: MealFilters): Promise<PaginatedResponse<Meal>> {
    return await api.get<PaginatedResponse<Meal>>(API_ENDPOINTS.meals.list, {
      params: filters,
    });
  },

  /**
   * Get single meal by ID
   */
  async getMeal(id: string): Promise<Meal> {
    return await api.get<Meal>(API_ENDPOINTS.meals.detail(id));
  },

  /**
   * Create new meal
   */
  async createMeal(data: CreateMealData): Promise<Meal> {
    return await api.post<Meal>(API_ENDPOINTS.meals.list, data);
  },

  /**
   * Update existing meal
   */
  async updateMeal(id: string, data: UpdateMealData): Promise<Meal> {
    return await api.patch<Meal>(API_ENDPOINTS.meals.detail(id), data);
  },

  /**
   * Delete meal
   */
  async deleteMeal(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.meals.detail(id));
  },

  /**
   * Add meal to favorites
   */
  async addToFavorites(id: string): Promise<void> {
    await api.post(API_ENDPOINTS.meals.favorite(id));
  },

  /**
   * Remove meal from favorites
   */
  async removeFromFavorites(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.meals.unfavorite(id));
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    if (isFavorite) {
      await this.removeFromFavorites(id);
    } else {
      await this.addToFavorites(id);
    }
  },

  /**
   * Get favorite meals
   */
  async getFavorites(): Promise<Meal[]> {
    const response = await api.get<{ results: Meal[] }>(API_ENDPOINTS.meals.favorites);
    return response.results;
  },

  /**
   * Duplicate a meal
   */
  async duplicateMeal(id: string): Promise<Meal> {
    return await api.post<Meal>(API_ENDPOINTS.meals.duplicate(id));
  },

  /**
   * Get similar meals
   */
  async getSimilarMeals(id: string): Promise<Meal[]> {
    const response = await api.get<{ results: Meal[] }>(API_ENDPOINTS.meals.similar(id));
    return response.results;
  },

  /**
   * Quick log a favorite meal
   */
  async quickLogMeal(data: QuickLogRequest): Promise<Meal> {
    return await api.post<Meal>(API_ENDPOINTS.meals.quickLog, data);
  },

  /**
   * Get meal statistics
   */
  async getStatistics(startDate?: string, endDate?: string): Promise<MealStatistics> {
    return await api.get<MealStatistics>(API_ENDPOINTS.meals.statistics, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  },

  /**
   * Upload meal image
   */
  async uploadMealImage(mealId: string, imageUri: string): Promise<Meal> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'meal.jpg',
    } as any);

    return await api.patch<Meal>(API_ENDPOINTS.meals.detail(mealId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Search meals by query
   */
  async searchMeals(query: string, filters?: MealFilters): Promise<PaginatedResponse<Meal>> {
    return await api.get<PaginatedResponse<Meal>>(API_ENDPOINTS.meals.list, {
      params: {
        ...filters,
        search: query,
      },
    });
  },

  /**
   * Get meals for specific date
   */
  async getMealsByDate(date: string): Promise<Meal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const response = await api.get<PaginatedResponse<Meal>>(API_ENDPOINTS.meals.list, {
      params: {
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
        ordering: 'consumed_at',
        page_size: 100, // Get all meals for the day
      },
    });

    return response.results;
  },
};
