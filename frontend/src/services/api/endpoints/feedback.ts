import { apiClient } from '../client';

interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'general';
  rating: number;
  message: string;
  email?: string;
  context?: Record<string, any>;
}

interface FeedbackResponse {
  id: string;
  created_at: string;
  status: 'submitted' | 'acknowledged' | 'resolved';
}

export const feedbackApi = {
  // Submit user feedback
  submitFeedback: async (data: FeedbackSubmission): Promise<FeedbackResponse> => {
    const response = await apiClient.post<FeedbackResponse>('/feedback/', data);
    return response.data;
  },

  // Get user's feedback history (optional)
  getFeedbackHistory: async (): Promise<FeedbackResponse[]> => {
    const response = await apiClient.get<FeedbackResponse[]>('/feedback/history/');
    return response.data;
  },
};
