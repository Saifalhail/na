import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { analytics } from '@/services/analytics/AnalyticsService';

interface DeepLinkHandler {
  pattern: RegExp;
  handler: (params: Record<string, string>) => void;
}

interface DeepLinkConfig {
  scheme: string;
  universalLinks?: string[];
}

class DeepLinkingService {
  private static instance: DeepLinkingService;
  private handlers: DeepLinkHandler[] = [];
  private navigationRef: any = null;
  private config: DeepLinkConfig = {
    scheme: 'nutritionai',
    universalLinks: ['https://nutritionai.app', 'https://app.nutritionai.com'],
  };

  private constructor() {
    this.setupLinking();
  }

  static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  // Set navigation reference
  setNavigationRef(ref: any): void {
    this.navigationRef = ref;
  }

  // Register deep link handlers
  registerHandler(
    pattern: string | RegExp,
    handler: (params: Record<string, string>) => void
  ): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.handlers.push({ pattern: regex, handler });
  }

  // Handle incoming URL
  handleUrl(url: string): void {
    analytics.track('deep_link_opened', { url });

    try {
      const parsed = this.parseUrl(url);

      // Find matching handler
      for (const { pattern, handler } of this.handlers) {
        const match = parsed.path.match(pattern);
        if (match) {
          handler({ ...parsed.params, ...match.groups });
          return;
        }
      }

      console.warn('No handler found for URL:', url);
    } catch (error) {
      console.error('Failed to handle deep link:', error);
    }
  }

  // Common deep link handlers
  setupCommonHandlers(): void {
    // Meal detail: nutritionai://meal/123
    this.registerHandler(/^meal\/(?<mealId>\w+)$/, ({ mealId }) => {
      this.navigate('MealDetail', { mealId });
    });

    // Profile: nutritionai://profile
    this.registerHandler(/^profile$/, () => {
      this.navigate('Profile');
    });

    // Camera: nutritionai://camera
    this.registerHandler(/^camera$/, () => {
      this.navigate('Camera');
    });

    // Favorites: nutritionai://favorites
    this.registerHandler(/^favorites$/, () => {
      this.navigate('Favorites');
    });

    // Settings: nutritionai://settings
    this.registerHandler(/^settings$/, () => {
      this.navigate('Settings');
    });

    // Notification settings: nutritionai://settings/notifications
    this.registerHandler(/^settings\/notifications$/, () => {
      this.navigate('NotificationSettings');
    });

    // Share meal: nutritionai://share/meal/123
    this.registerHandler(/^share\/meal\/(?<mealId>\w+)$/, ({ mealId }) => {
      this.navigate('ShareMeal', { mealId });
    });

    // Auth actions
    this.registerHandler(/^auth\/reset-password$/, ({ token }) => {
      this.navigate('ResetPassword', { token });
    });

    this.registerHandler(/^auth\/verify-email$/, ({ token }) => {
      this.navigate('VerifyEmail', { token });
    });
  }

  // Create shareable links
  createMealLink(mealId: string): string {
    return `${this.config.scheme}://meal/${mealId}`;
  }

  createProfileLink(userId?: string): string {
    return userId ? `${this.config.scheme}://profile/${userId}` : `${this.config.scheme}://profile`;
  }

  createUniversalLink(path: string): string {
    const baseUrl = this.config.universalLinks?.[0] || 'https://nutritionai.app';
    return `${baseUrl}/${path}`;
  }

  // Share functionality
  async shareMeal(mealId: string, mealName: string): Promise<void> {
    const url = this.createUniversalLink(`meal/${mealId}`);
    const message = `Check out my meal "${mealName}" on Nutrition AI!`;

    try {
      await Linking.openURL(
        `mailto:?subject=${encodeURIComponent('Check out my meal!')}&body=${encodeURIComponent(
          `${message}\n\n${url}`
        )}`
      );

      analytics.track('meal_shared', { meal_id: mealId, method: 'email' });
    } catch (error) {
      console.error('Failed to share meal:', error);
    }
  }

  private setupLinking(): void {
    // Handle initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleUrl(url);
      }
    });

    // Listen for URL changes
    Linking.addEventListener('url', (event) => {
      if (event.url) {
        this.handleUrl(event.url);
      }
    });

    // Handle notification deep links
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.deepLink) {
        this.handleUrl(data.deepLink as string);
      }
    });
  }

  private parseUrl(url: string): { path: string; params: Record<string, string> } {
    // Remove scheme
    let cleanUrl = url;
    for (const scheme of [this.config.scheme, ...(this.config.universalLinks || [])]) {
      if (url.startsWith(`${scheme}://`)) {
        cleanUrl = url.replace(`${scheme}://`, '');
        break;
      } else if (url.startsWith(`${scheme}/`)) {
        cleanUrl = url.replace(`${scheme}/`, '');
        break;
      }
    }

    // Parse path and query params
    const [path, query] = cleanUrl.split('?');
    const params: Record<string, string> = {};

    if (query) {
      const searchParams = new URLSearchParams(query);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    return { path, params };
  }

  private navigate(screen: string, params?: Record<string, any>): void {
    if (!this.navigationRef?.current) {
      console.warn('Navigation ref not set');
      return;
    }

    try {
      this.navigationRef.current.navigate(screen, params);
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }
}

export const deepLinking = DeepLinkingService.getInstance();
