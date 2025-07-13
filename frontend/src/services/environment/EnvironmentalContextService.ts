/**
 * Environmental Context Service
 * 
 * Collects environmental data to enhance AI nutritional analysis accuracy.
 * This includes weather, lighting conditions, seasonal factors, and more.
 */

import * as Location from 'expo-location';
import { ComprehensiveMetadata } from '@/types/api';
import { rs } from '@/utils/responsive';

export interface WeatherData {
  temperature: number; // Celsius
  humidity: number; // Percentage
  condition: string; // 'sunny', 'cloudy', 'rainy', etc.
  uvIndex?: number;
  windSpeed?: number;
}

export interface TimeContext {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isWeekend: boolean;
  isHoliday: boolean;
  mealTimeCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night';
}

export interface LightingContext {
  isDaylight: boolean;
  sunAngle?: number;
  ambientLightLevel: 'very_dark' | 'dark' | 'dim' | 'normal' | 'bright' | 'very_bright';
  primaryLightSource: 'natural' | 'artificial' | 'mixed';
}

export class EnvironmentalContextService {
  private static instance: EnvironmentalContextService;
  private weatherCache: { [key: string]: { data: WeatherData; timestamp: number } } = {};
  private readonly WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  static getInstance(): EnvironmentalContextService {
    if (!EnvironmentalContextService.instance) {
      EnvironmentalContextService.instance = new EnvironmentalContextService();
    }
    return EnvironmentalContextService.instance;
  }

  /**
   * Collect comprehensive environmental context
   */
  async collectEnvironmentalContext(
    latitude?: number,
    longitude?: number
  ): Promise<Partial<ComprehensiveMetadata>> {
    const metadata: Partial<ComprehensiveMetadata> = {};

    try {
      // Collect various environmental factors in parallel
      const [
        timeContext,
        weatherData,
        lightingContext,
        seasonalFactors
      ] = await Promise.allSettled([
        this.getTimeContext(),
        this.getWeatherData(latitude, longitude),
        this.analyzeLightingContext(),
        this.getSeasonalFactors()
      ]);

      // Map successful results to metadata
      if (timeContext.status === 'fulfilled') {
        this.mapTimeContextToMetadata(metadata, timeContext.value);
      }

      if (weatherData.status === 'fulfilled' && weatherData.value) {
        metadata.weatherTemperature = weatherData.value.temperature;
        metadata.weatherHumidity = weatherData.value.humidity;
      }

      if (lightingContext.status === 'fulfilled') {
        this.mapLightingContextToMetadata(metadata, lightingContext.value);
      }

      if (seasonalFactors.status === 'fulfilled') {
        this.mapSeasonalFactorsToMetadata(metadata, seasonalFactors.value);
      }

    } catch (error) {
      console.error('Environmental context collection failed:', error);
    }

    return metadata;
  }

  /**
   * Get comprehensive time context
   */
  private async getTimeContext(): Promise<TimeContext> {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const dayOfWeek = now.getDay();

    // Determine season (Northern Hemisphere)
    let season: TimeContext['season'];
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    // Determine time of day
    let timeOfDay: TimeContext['timeOfDay'];
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Determine meal time category
    let mealTimeCategory: TimeContext['mealTimeCategory'];
    if (hour >= 6 && hour < 11) mealTimeCategory = 'breakfast';
    else if (hour >= 11 && hour < 15) mealTimeCategory = 'lunch';
    else if (hour >= 17 && hour < 21) mealTimeCategory = 'dinner';
    else if (hour >= 21 || hour < 6) mealTimeCategory = 'late_night';
    else mealTimeCategory = 'snack';

    return {
      season,
      timeOfDay,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: await this.checkIfHoliday(now),
      mealTimeCategory
    };
  }

  /**
   * Get weather data for location
   */
  private async getWeatherData(
    latitude?: number,
    longitude?: number
  ): Promise<WeatherData | null> {
    if (!latitude || !longitude) {
      return null;
    }

    // Check cache first
    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = this.weatherCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < this.WEATHER_CACHE_DURATION) {
      return cached.data;
    }

    try {
      // In a real implementation, integrate with weather APIs like:
      // - OpenWeatherMap
      // - WeatherAPI
      // - AccuWeather
      
      // Mock weather data for demonstration
      const mockWeatherData: WeatherData = {
        temperature: Math.random() * 30 + 5, // 5-35°C
        humidity: Math.random() * 60 + 30, // 30-90%
        condition: ['sunny', 'cloudy', 'partly_cloudy', 'rainy'][Math.floor(Math.random() * 4)],
        uvIndex: Math.random() * 10,
        windSpeed: Math.random() * 20
      };

      // Cache the result
      this.weatherCache[cacheKey] = {
        data: mockWeatherData,
        timestamp: Date.now()
      };

      return mockWeatherData;
    } catch (error) {
      console.error('Weather data fetch failed:', error);
      return null;
    }
  }

  /**
   * Analyze current lighting context
   */
  private async analyzeLightingContext(): Promise<LightingContext> {
    const now = new Date();
    const hour = now.getHours();

    // Determine if it's daylight (simplified)
    const isDaylight = hour >= 6 && hour < 20;

    // Estimate ambient light level based on time
    let ambientLightLevel: LightingContext['ambientLightLevel'];
    if (hour >= 7 && hour < 17) {
      ambientLightLevel = 'bright';
    } else if (hour >= 17 && hour < 19 || hour >= 6 && hour < 7) {
      ambientLightLevel = 'normal';
    } else if (hour >= 19 && hour < 22) {
      ambientLightLevel = 'dim';
    } else {
      ambientLightLevel = 'dark';
    }

    // Determine primary light source
    const primaryLightSource = isDaylight ? 'natural' : 'artificial';

    return {
      isDaylight,
      ambientLightLevel,
      primaryLightSource,
      sunAngle: this.calculateSunAngle(now)
    };
  }

  /**
   * Get seasonal factors that affect food
   */
  private async getSeasonalFactors(): Promise<{
    availableIngredients: string[];
    typicalCuisines: string[];
    temperaturePreferences: string[];
  }> {
    const now = new Date();
    const month = now.getMonth();

    // Seasonal ingredient availability (Northern Hemisphere)
    const seasonalData = {
      spring: {
        ingredients: ['asparagus', 'peas', 'lettuce', 'spinach', 'radishes'],
        cuisines: ['mediterranean', 'light_salads', 'fresh_vegetables'],
        preferences: ['fresh', 'light', 'crisp']
      },
      summer: {
        ingredients: ['tomatoes', 'corn', 'berries', 'stone_fruits', 'herbs'],
        cuisines: ['bbq', 'grilled', 'fresh_fruits', 'cold_soups'],
        preferences: ['cold', 'refreshing', 'grilled']
      },
      autumn: {
        ingredients: ['pumpkin', 'apples', 'squash', 'root_vegetables', 'nuts'],
        cuisines: ['comfort_food', 'hearty_stews', 'roasted_vegetables'],
        preferences: ['warm', 'hearty', 'spiced']
      },
      winter: {
        ingredients: ['citrus', 'preserved_foods', 'root_vegetables', 'dried_fruits'],
        cuisines: ['soups', 'stews', 'hot_beverages', 'comfort_food'],
        preferences: ['hot', 'warming', 'rich']
      }
    };

    let season: keyof typeof seasonalData;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    return {
      availableIngredients: seasonalData[season].ingredients,
      typicalCuisines: seasonalData[season].cuisines,
      temperaturePreferences: seasonalData[season].preferences
    };
  }

  /**
   * Check if current date is a holiday
   */
  private async checkIfHoliday(date: Date): Promise<boolean> {
    // This would integrate with holiday APIs or local holiday data
    // For now, return false as placeholder
    return false;
  }

  /**
   * Calculate sun angle (simplified)
   */
  private calculateSunAngle(date: Date): number {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeDecimal = hour + minute / 60;
    
    // Simplified sun angle calculation (0-90 degrees)
    // Peak at noon (12:00), 0 at sunrise/sunset
    const noonOffset = Math.abs(timeDecimal - 12);
    const maxAngle = 90;
    return Math.max(0, maxAngle - (noonOffset * 15));
  }

  /**
   * Map time context to metadata
   */
  private mapTimeContextToMetadata(
    metadata: Partial<ComprehensiveMetadata>,
    timeContext: TimeContext
  ): void {
    // Store time context information that can help the AI
    metadata.notes = [
      metadata.notes,
      `Season: ${timeContext.season}`,
      `Time: ${timeContext.timeOfDay}`,
      `Meal time: ${timeContext.mealTimeCategory}`,
      timeContext.isWeekend ? 'Weekend' : 'Weekday'
    ].filter(Boolean).join(', ');
  }

  /**
   * Map lighting context to metadata
   */
  private mapLightingContextToMetadata(
    metadata: Partial<ComprehensiveMetadata>,
    lightingContext: LightingContext
  ): void {
    // Lighting information affects image quality and food appearance
    const lightingInfo = [
      `Light: ${lightingContext.ambientLightLevel}`,
      `Source: ${lightingContext.primaryLightSource}`,
      lightingContext.isDaylight ? 'Daylight' : 'Artificial light'
    ].join(', ');

    metadata.notes = [metadata.notes, lightingInfo].filter(Boolean).join(', ');
  }

  /**
   * Map seasonal factors to metadata
   */
  private mapSeasonalFactorsToMetadata(
    metadata: Partial<ComprehensiveMetadata>,
    seasonalFactors: any
  ): void {
    // Seasonal information helps with ingredient identification
    metadata.frequentCuisines = [
      ...(metadata.frequentCuisines || []),
      ...seasonalFactors.typicalCuisines
    ];
  }

  /**
   * Get venue type based on environmental factors
   */
  async inferVenueType(
    latitude?: number,
    longitude?: number,
    timeContext?: TimeContext
  ): Promise<string> {
    try {
      // This would use location services and POI data to determine venue type
      // For now, provide intelligent guessing based on time and context
      
      if (!timeContext) {
        timeContext = await this.getTimeContext();
      }

      // Infer based on meal timing
      if (timeContext.mealTimeCategory === 'breakfast' && timeContext.timeOfDay === 'morning') {
        return Math.random() > 0.7 ? 'cafe' : 'home';
      } else if (timeContext.mealTimeCategory === 'lunch' && !timeContext.isWeekend) {
        return Math.random() > 0.5 ? 'restaurant' : 'office';
      } else if (timeContext.mealTimeCategory === 'dinner') {
        return Math.random() > 0.6 ? 'restaurant' : 'home';
      }

      return 'home'; // Default assumption
    } catch (error) {
      console.error('Venue type inference failed:', error);
      return 'unknown';
    }
  }

  /**
   * Analyze eating context based on environmental factors
   */
  async analyzeEatingContext(
    timeContext: TimeContext,
    venueType: string,
    weatherData?: WeatherData
  ): Promise<{
    socialContext: 'solo' | 'family' | 'business' | 'social';
    atmosphereFactors: string[];
    experienceFactors: string[];
  }> {
    const atmosphereFactors: string[] = [];
    const experienceFactors: string[] = [];

    // Analyze social context
    let socialContext: 'solo' | 'family' | 'business' | 'social' = 'solo';

    if (venueType === 'restaurant') {
      if (timeContext.timeOfDay === 'evening' && timeContext.isWeekend) {
        socialContext = 'social';
        atmosphereFactors.push('relaxed', 'social_dining');
      } else if (timeContext.mealTimeCategory === 'lunch' && !timeContext.isWeekend) {
        socialContext = 'business';
        atmosphereFactors.push('quick_dining', 'business_lunch');
      }
    } else if (venueType === 'home') {
      if (timeContext.mealTimeCategory === 'dinner' || timeContext.isWeekend) {
        socialContext = 'family';
        atmosphereFactors.push('comfortable', 'family_dining');
      }
    }

    // Weather-based factors
    if (weatherData) {
      if (weatherData.condition === 'rainy') {
        experienceFactors.push('comfort_food_weather');
      } else if (weatherData.condition === 'sunny' && weatherData.temperature > 25) {
        experienceFactors.push('hot_weather_dining');
      } else if (weatherData.temperature < 10) {
        experienceFactors.push('cold_weather_dining');
      }
    }

    return {
      socialContext,
      atmosphereFactors,
      experienceFactors
    };
  }
}

export const environmentalContextService = EnvironmentalContextService.getInstance();