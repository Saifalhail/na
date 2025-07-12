import { apiClient } from '@/services/api/client';
import { ApiResponse } from '@/types/api';

export interface DeviceTokenData {
  device_token: string;
  device_type: 'ios' | 'android';
  device_id?: string;
}

export interface NotificationPreferences {
  meal_reminders: boolean;
  goal_achievements: boolean;
  daily_summary: boolean;
  weekly_report: boolean;
  tips_and_insights: boolean;
  social_interactions: boolean;
  reminder_times: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export const notificationApi = {
  /**
   * Register device token for push notifications
   */
  registerDeviceToken: async (data: DeviceTokenData): Promise<ApiResponse<void>> => {
    return apiClient.post('/auth/device-token/', data);
  },

  /**
   * Unregister device token
   */
  unregisterDeviceToken: async (deviceToken: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/auth/device-token/${deviceToken}/`);
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<ApiResponse<NotificationPreferences>> => {
    return apiClient.get('/auth/notification-preferences/');
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> => {
    return apiClient.patch('/auth/notification-preferences/', preferences);
  },

  /**
   * Get notifications list
   */
  getNotifications: async (params?: {
    page?: number;
    read?: boolean;
    type?: string;
  }): Promise<
    ApiResponse<{
      results: Notification[];
      count: number;
      next: string | null;
      previous: string | null;
    }>
  > => {
    return apiClient.get('/notifications/', { params });
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
    return apiClient.patch(`/notifications/${notificationId}/read/`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.post('/notifications/mark-all-read/');
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/notifications/${notificationId}/`);
  },

  /**
   * Get unread count
   */
  getUnreadCount: async (): Promise<ApiResponse<{ unread_count: number }>> => {
    return apiClient.get('/notifications/unread-count/');
  },
};
