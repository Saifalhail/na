import { api, createFormData } from '../client';
import { API_ENDPOINTS } from '../config';
import {
  AnalysisRequest,
  AnalysisResult,
  RecalculateRequest,
  RecalculateResult,
} from '@/types/api';

export const aiApi = {
  /**
   * Analyze food image with AI
   */
  async analyzeImage(data: AnalysisRequest): Promise<AnalysisResult> {
    const formData = createFormData({
      image: {
        uri: data.imageUri,
        type: 'image/jpeg',
        name: 'meal.jpg',
      },
      metadata: data.metadata,
    });

    return await api.post<AnalysisResult>(API_ENDPOINTS.ai.analyze, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Longer timeout for AI processing
      timeout: 60000, // 60 seconds
    });
  },

  /**
   * Recalculate nutrition for modified meal
   */
  async recalculateNutrition(data: RecalculateRequest): Promise<RecalculateResult> {
    return await api.post<RecalculateResult>(API_ENDPOINTS.ai.recalculate, data, {
      // Longer timeout for AI processing
      timeout: 45000, // 45 seconds
    });
  },

  /**
   * Get AI analysis suggestions for a meal
   */
  async getSuggestions(mealId: string): Promise<string[]> {
    const response = await api.get<{ suggestions: string[] }>(`/ai/meals/${mealId}/suggestions/`);

    return response.suggestions;
  },

  /**
   * Report incorrect AI analysis
   */
  async reportAnalysis(analysisId: string, reason: string, corrections?: any): Promise<void> {
    await api.post(`/ai/analysis/${analysisId}/report/`, {
      reason,
      corrections,
    });
  },
};
