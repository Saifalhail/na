import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './persist';
import { notificationsApi } from '@services/api';
import type {
  Notification,
  NotificationPreferences,
  NotificationListResponse,
  PaginationParams,
  UpdateNotificationPreferencesRequest,
} from '@/types/api';

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isLoadingPreferences: boolean;
  error: string | null;
  hasMore: boolean;
  nextPage: number;

  // Actions
  fetchNotifications: (params?: PaginationParams & { refresh?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getUnreadCount: () => Promise<void>;

  // Preferences
  fetchPreferences: () => Promise<void>;
  updatePreferences: (data: UpdateNotificationPreferencesRequest) => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  isLoading: false,
  isLoadingPreferences: false,
  error: null,
  hasMore: true,
  nextPage: 1,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Fetch notifications with pagination
      fetchNotifications: async (params = {}) => {
        const { refresh = false } = params;
        const currentState = get();

        // Don't fetch if already loading
        if (currentState.isLoading) return;

        // Reset pagination if refreshing
        const page = refresh ? 1 : currentState.nextPage;

        set({ isLoading: true, error: null });

        try {
          const response = await notificationsApi.getNotifications({
            page,
            page_size: 20,
            ...params,
          });

          const newNotifications = refresh
            ? response.results
            : [...currentState.notifications, ...response.results];

          set({
            notifications: newNotifications,
            unreadCount: response.unread_count || 0,
            hasMore: !!response.next,
            nextPage: response.next ? page + 1 : page,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch notifications',
          });
          throw error;
        }
      },

      // Mark notification as read
      markAsRead: async (id: string) => {
        try {
          const updatedNotification = await notificationsApi.markAsRead(id);

          set((state) => ({
            notifications: state.notifications.map((notification) =>
              notification.id === id ? { ...notification, is_read: true } : notification
            ),
            unreadCount: Math.max(0, state.unreadCount - (updatedNotification.is_read ? 0 : 1)),
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to mark notification as read' });
          throw error;
        }
      },

      // Mark all notifications as read
      markAllAsRead: async () => {
        try {
          await notificationsApi.markAllAsRead();

          set((state) => ({
            notifications: state.notifications.map((notification) => ({
              ...notification,
              is_read: true,
            })),
            unreadCount: 0,
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to mark all notifications as read' });
          throw error;
        }
      },

      // Delete notification
      deleteNotification: async (id: string) => {
        try {
          await notificationsApi.deleteNotification(id);

          set((state) => {
            const notificationToDelete = state.notifications.find((n) => n.id === id);
            const wasUnread = notificationToDelete && !notificationToDelete.is_read;

            return {
              notifications: state.notifications.filter((notification) => notification.id !== id),
              unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete notification' });
          throw error;
        }
      },

      // Get unread count
      getUnreadCount: async () => {
        try {
          const { unread_count } = await notificationsApi.getUnreadCount();
          set({ unreadCount: unread_count });
        } catch (error: any) {
          console.error('Failed to fetch unread count:', error);
        }
      },

      // Fetch notification preferences
      fetchPreferences: async () => {
        set({ isLoadingPreferences: true, error: null });

        try {
          const preferences = await notificationsApi.getPreferences();
          set({
            preferences,
            isLoadingPreferences: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoadingPreferences: false,
            error: error.message || 'Failed to fetch notification preferences',
          });
          throw error;
        }
      },

      // Update notification preferences
      updatePreferences: async (data: UpdateNotificationPreferencesRequest) => {
        set({ isLoadingPreferences: true, error: null });

        try {
          const updatedPreferences = await notificationsApi.updatePreferences(data);
          set({
            preferences: updatedPreferences,
            isLoadingPreferences: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoadingPreferences: false,
            error: error.message || 'Failed to update notification preferences',
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        unreadCount: state.unreadCount,
        preferences: state.preferences,
      }),
    }
  )
);
