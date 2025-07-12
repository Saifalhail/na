import { Platform, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { createStorage, Storage } from '@/utils/storage';
import { analytics } from '@/services/analytics/AnalyticsService';

interface ReviewPromptConditions {
  minDaysSinceInstall: number;
  minMealsLogged: number;
  minAppOpens: number;
  minDaysSinceLastPrompt: number;
  maxPromptsPerYear: number;
}

interface ReviewStats {
  installDate: number;
  mealsLogged: number;
  appOpens: number;
  lastPromptDate?: number;
  promptsThisYear: number;
  hasRated: boolean;
}

class AppReviewService {
  private static instance: AppReviewService;
  private storage: Storage;
  private stats: ReviewStats;
  private conditions: ReviewPromptConditions = {
    minDaysSinceInstall: 7,
    minMealsLogged: 10,
    minAppOpens: 5,
    minDaysSinceLastPrompt: 30,
    maxPromptsPerYear: 3,
  };

  private constructor() {
    this.storage = createStorage('app-review');
    this.stats = {
      installDate: Date.now(),
      mealsLogged: 0,
      appOpens: 0,
      promptsThisYear: 0,
      hasRated: false,
    };
    this.initializeStats();
  }

  private async initializeStats(): Promise<void> {
    this.stats = await this.loadStats();
  }

  static getInstance(): AppReviewService {
    if (!AppReviewService.instance) {
      AppReviewService.instance = new AppReviewService();
    }
    return AppReviewService.instance;
  }

  // Check if we can show review prompt
  async canPromptForReview(): Promise<boolean> {
    // Check if already rated
    if (this.stats.hasRated) {
      return false;
    }

    // Check if review is available
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      return false;
    }

    // Check conditions
    const daysSinceInstall = this.getDaysSince(this.stats.installDate);
    if (daysSinceInstall < this.conditions.minDaysSinceInstall) {
      return false;
    }

    if (this.stats.mealsLogged < this.conditions.minMealsLogged) {
      return false;
    }

    if (this.stats.appOpens < this.conditions.minAppOpens) {
      return false;
    }

    if (this.stats.lastPromptDate) {
      const daysSinceLastPrompt = this.getDaysSince(this.stats.lastPromptDate);
      if (daysSinceLastPrompt < this.conditions.minDaysSinceLastPrompt) {
        return false;
      }
    }

    const currentYear = new Date().getFullYear();
    const promptYear = this.stats.lastPromptDate
      ? new Date(this.stats.lastPromptDate).getFullYear()
      : currentYear;

    if (
      promptYear === currentYear &&
      this.stats.promptsThisYear >= this.conditions.maxPromptsPerYear
    ) {
      return false;
    }

    return true;
  }

  // Prompt for review
  async promptForReview(): Promise<void> {
    const canPrompt = await this.canPromptForReview();
    if (!canPrompt) {
      return;
    }

    try {
      await StoreReview.requestReview();

      // Update stats
      this.stats.lastPromptDate = Date.now();
      this.stats.promptsThisYear++;
      this.saveStats();

      // Track event
      analytics.track('app_review_prompted', {
        meals_logged: this.stats.mealsLogged,
        days_since_install: this.getDaysSince(this.stats.installDate),
        prompts_this_year: this.stats.promptsThisYear,
      });
    } catch (error) {
      console.error('Failed to prompt for review:', error);
    }
  }

  // Direct user to app store
  async openAppStore(): Promise<void> {
    const storeUrl = this.getStoreUrl();
    if (storeUrl) {
      try {
        await Linking.openURL(storeUrl);

        // Mark as rated
        this.stats.hasRated = true;
        this.saveStats();

        analytics.track('app_store_opened', {
          source: 'manual',
        });
      } catch (error) {
        console.error('Failed to open app store:', error);
      }
    }
  }

  // Update review stats
  incrementMealsLogged(): void {
    this.stats.mealsLogged++;
    this.saveStats().catch(error => {
      console.error('Failed to save review stats:', error);
    });

    // Check if we should prompt after this milestone
    if (this.stats.mealsLogged === 10 || this.stats.mealsLogged === 50) {
      this.promptForReview();
    }
  }

  incrementAppOpens(): void {
    this.stats.appOpens++;
    this.saveStats().catch(error => {
      console.error('Failed to save review stats:', error);
    });
  }

  markAsRated(): void {
    this.stats.hasRated = true;
    this.saveStats().catch(error => {
      console.error('Failed to save review stats:', error);
    });

    analytics.track('app_rated', {
      meals_logged: this.stats.mealsLogged,
      days_since_install: this.getDaysSince(this.stats.installDate),
    });
  }

  // Set custom conditions
  setConditions(conditions: Partial<ReviewPromptConditions>): void {
    this.conditions = { ...this.conditions, ...conditions };
  }

  // Get current stats (for debugging)
  getStats(): ReviewStats {
    return { ...this.stats };
  }

  private getStoreUrl(): string | null {
    // Replace with your actual app store IDs
    const appStoreId = 'YOUR_APP_STORE_ID';
    const playStoreId = 'com.yourcompany.nutritionai';

    if (Platform.OS === 'ios') {
      return `https://apps.apple.com/app/id${appStoreId}`;
    } else if (Platform.OS === 'android') {
      return `https://play.google.com/store/apps/details?id=${playStoreId}`;
    }

    return null;
  }

  private getDaysSince(timestamp: number): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((Date.now() - timestamp) / msPerDay);
  }

  private async loadStats(): Promise<ReviewStats> {
    const stored = await this.storage.getString('review_stats');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load review stats:', error);
      }
    }

    // Default stats
    return {
      installDate: Date.now(),
      mealsLogged: 0,
      appOpens: 0,
      promptsThisYear: 0,
      hasRated: false,
    };
  }

  private async saveStats(): Promise<void> {
    await this.storage.set('review_stats', JSON.stringify(this.stats));
  }

  // Reset stats (for testing)
  resetStats(): void {
    this.stats = {
      installDate: Date.now(),
      mealsLogged: 0,
      appOpens: 0,
      promptsThisYear: 0,
      hasRated: false,
    };
    this.saveStats().catch(error => {
      console.error('Failed to save review stats:', error);
    });
  }
}

export const appReview = AppReviewService.getInstance();
