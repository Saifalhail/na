import { api } from '../client';
import { API_ENDPOINTS } from '../config';
import {
  Notification,
  NotificationPreferences,
  NotificationListResponse,
  CreateNotificationRequest,
  UpdateNotificationPreferencesRequest,
  PaginationParams,
} from '@/types/api';

export const notificationsApi = {
  /**
   * Get user notifications with pagination
   */
  async getNotifications(
    params?: PaginationParams & {
      unread_only?: boolean;
      notification_type?: string;
    }
  ): Promise<NotificationListResponse> {
    return await api.get<NotificationListResponse>(API_ENDPOINTS.notifications.list, {
      params,
    });
  },

  /**
   * Get notification by ID
   */
  async getNotification(id: string): Promise<Notification> {
    return await api.get<Notification>(API_ENDPOINTS.notifications.detail(id));
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return await api.patch<Notification>(API_ENDPOINTS.notifications.markAsRead(id));
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await api.post(API_ENDPOINTS.notifications.markAllAsRead);
  },

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.notifications.detail(id));
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    return await api.get<NotificationPreferences>(API_ENDPOINTS.notifications.preferences);
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    data: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    return await api.patch<NotificationPreferences>(API_ENDPOINTS.notifications.preferences, data);
  },

  /**
   * Create admin notification (admin only)
   */
  async createAdminNotification(data: CreateNotificationRequest): Promise<Notification> {
    return await api.post<Notification>(API_ENDPOINTS.notifications.adminCreate, data);
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await api.get<NotificationListResponse>(API_ENDPOINTS.notifications.list, {
      params: {
        unread_only: true,
        page_size: 1, // We only need the count
      },
    });
    return { unread_count: response.count };
  },
};
