import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PlatformUtils } from '@/utils/platform';
import { TokenStorage } from '@/services/storage/tokenStorage';
import { notificationApi } from '@/api/notifications';
import { navigationRef } from '@/navigation/navigationRef';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: boolean;
  categoryId?: string;
}

export interface ScheduledNotification {
  id: string;
  content: NotificationContent;
  trigger: Notifications.NotificationTrigger;
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  private async initialize() {
    // Register for push notifications
    await this.registerForPushNotifications();
    
    // Set up notification listeners
    this.setupListeners();
    
    // Configure notification categories (iOS)
    if (PlatformUtils.isIOS) {
      await this.setupNotificationCategories();
    }
  }
  
  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }
    
    try {
      // Get existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }
      
      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.pushToken = tokenData.data;
      
      // Configure Android channel
      if (PlatformUtils.isAndroid) {
        await this.setupAndroidChannel();
      }
      
      return this.pushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }
  
  /**
   * Set up Android notification channel
   */
  private async setupAndroidChannel() {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Meal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('goals', {
      name: 'Nutrition Goals',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
    });
  }
  
  /**
   * Set up iOS notification categories
   */
  private async setupNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('meal_reminder', [
      {
        identifier: 'log_meal',
        buttonTitle: 'Log Meal',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Remind in 30 min',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
    
    await Notifications.setNotificationCategoryAsync('goal_achieved', [
      {
        identifier: 'view_progress',
        buttonTitle: 'View Progress',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }
  
  /**
   * Set up notification listeners
   */
  private setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });
    
    // Listener for when user interacts with notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }
  
  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification) {
    const { title, body, data } = notification.request.content;
    
    // Handle based on notification type
    if (data?.type === 'meal_reminder') {
      // Could show an in-app banner
      console.log('Meal reminder received');
    } else if (data?.type === 'goal_update') {
      // Could update UI
      console.log('Goal update received');
    }
  }
  
  /**
   * Handle notification response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { data } = response.notification.request.content;
    const { actionIdentifier } = response;
    
    // Handle action buttons
    if (actionIdentifier === 'log_meal') {
      // Navigate to camera screen
      // This would need navigation service
    } else if (actionIdentifier === 'snooze') {
      // Schedule a reminder in 30 minutes
      this.scheduleLocalNotification(
        {
          title: 'Meal Reminder',
          body: "Don't forget to log your meal!",
          data: { type: 'meal_reminder' },
        },
        { seconds: 30 * 60 }
      );
    } else if (actionIdentifier === 'view_progress') {
      // Navigate to progress screen
    }
  }
  
  /**
   * Send local notification immediately
   */
  async sendLocalNotification(content: NotificationContent): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data || {},
        badge: content.badge,
        sound: content.sound !== false,
        categoryIdentifier: content.categoryId,
      },
      trigger: null, // Immediate
    });
    
    return id;
  }
  
  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    content: NotificationContent,
    trigger: { seconds?: number; date?: Date; repeats?: boolean }
  ): Promise<string> {
    let notificationTrigger: Notifications.NotificationTrigger;
    
    if (trigger.date) {
      notificationTrigger = trigger.date;
    } else if (trigger.seconds) {
      notificationTrigger = {
        seconds: trigger.seconds,
        repeats: trigger.repeats || false,
      };
    } else {
      notificationTrigger = null; // Immediate
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data || {},
        badge: content.badge,
        sound: content.sound !== false,
        categoryIdentifier: content.categoryId,
      },
      trigger: notificationTrigger,
    });
    
    return id;
  }
  
  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  
  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  
  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.map(n => ({
      id: n.identifier,
      content: {
        title: n.content.title || '',
        body: n.content.body || '',
        data: n.content.data,
        badge: n.content.badge,
        sound: n.content.sound !== null,
        categoryId: n.content.categoryIdentifier,
      },
      trigger: n.trigger,
    }));
  }
  
  /**
   * Set badge count (iOS)
   */
  async setBadgeCount(count: number): Promise<boolean> {
    if (PlatformUtils.isIOS) {
      return await Notifications.setBadgeCountAsync(count);
    }
    return false;
  }
  
  /**
   * Get badge count (iOS)
   */
  async getBadgeCount(): Promise<number> {
    if (PlatformUtils.isIOS) {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }
  
  /**
   * Schedule meal reminders
   */
  async scheduleMealReminders(times: { breakfast?: Date; lunch?: Date; dinner?: Date }) {
    // Cancel existing meal reminders
    const scheduled = await this.getScheduledNotifications();
    const mealReminders = scheduled.filter(n => n.content.data?.type === 'meal_reminder');
    await Promise.all(mealReminders.map(n => this.cancelNotification(n.id)));
    
    // Schedule new reminders
    const reminders = [];
    
    if (times.breakfast) {
      reminders.push(
        this.scheduleLocalNotification(
          {
            title: '🥐 Breakfast Time',
            body: 'Remember to log your breakfast!',
            data: { type: 'meal_reminder', meal: 'breakfast' },
            categoryId: 'meal_reminder',
          },
          { date: times.breakfast, repeats: true }
        )
      );
    }
    
    if (times.lunch) {
      reminders.push(
        this.scheduleLocalNotification(
          {
            title: '🥗 Lunch Time',
            body: 'Time to log your lunch!',
            data: { type: 'meal_reminder', meal: 'lunch' },
            categoryId: 'meal_reminder',
          },
          { date: times.lunch, repeats: true }
        )
      );
    }
    
    if (times.dinner) {
      reminders.push(
        this.scheduleLocalNotification(
          {
            title: '🍽️ Dinner Time',
            body: "Don't forget to log your dinner!",
            data: { type: 'meal_reminder', meal: 'dinner' },
            categoryId: 'meal_reminder',
          },
          { date: times.dinner, repeats: true }
        )
      );
    }
    
    await Promise.all(reminders);
  }
  
  /**
   * Send goal achievement notification
   */
  async sendGoalAchievementNotification(goalType: string, value: number) {
    const messages: Record<string, { title: string; body: string }> = {
      calories: {
        title: '🎯 Calorie Goal Achieved!',
        body: `You've reached your daily calorie goal of ${value} calories!`,
      },
      protein: {
        title: '💪 Protein Goal Achieved!',
        body: `Great job! You've hit your protein target of ${value}g!`,
      },
      water: {
        title: '💧 Hydration Goal Achieved!',
        body: `Well done! You've drunk ${value} glasses of water today!`,
      },
    };
    
    const message = messages[goalType] || {
      title: '🎉 Goal Achieved!',
      body: `You've reached your ${goalType} goal!`,
    };
    
    await this.sendLocalNotification({
      ...message,
      data: { type: 'goal_achieved', goalType },
      categoryId: 'goal_achieved',
    });
  }
  
  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }
  
  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = NotificationService.getInstance();