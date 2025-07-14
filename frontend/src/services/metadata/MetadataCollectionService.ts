/**
 * Comprehensive Metadata Collection Service
 *
 * This service collects all available metadata from the device and environment
 * to enhance AI nutritional analysis accuracy.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { manipulateAsync, ImageResult } from 'expo-image-manipulator';
import { ComprehensiveMetadata } from '@/types/api';
import { imagePreprocessingService } from '@/services/image/ImagePreprocessingService';
import { environmentalContextService } from '@/services/environment/EnvironmentalContextService';
import { rs } from '@/utils/responsive';

export interface ImageAnalysisMetadata extends ComprehensiveMetadata {
  // Additional computed metadata
  timeOfCapture?: string;
  deviceFingerprint?: string;
  networkType?: string;
}

export class MetadataCollectionService {
  private static instance: MetadataCollectionService;
  private cachedDeviceInfo: any = null;
  private cachedLocationPermission: boolean | null = null;

  static getInstance(): MetadataCollectionService {
    if (!MetadataCollectionService.instance) {
      MetadataCollectionService.instance = new MetadataCollectionService();
    }
    return MetadataCollectionService.instance;
  }

  /**
   * Collect comprehensive metadata for AI analysis
   */
  async collectComprehensiveMetadata(
    imageUri: string,
    userContext?: Partial<ComprehensiveMetadata>
  ): Promise<ImageAnalysisMetadata> {
    const metadata: ImageAnalysisMetadata = {
      ...userContext,
      timeOfCapture: new Date().toISOString(),
    };

    // First collect location metadata to use in environmental collection
    const locationResult = await this.collectLocationMetadata();

    // Collect all other metadata categories in parallel for better performance
    const [deviceMetadata, visualMetadata, environmentalMetadata] = await Promise.allSettled([
      this.collectDeviceMetadata(),
      this.collectVisualMetadata(imageUri),
      this.collectEnvironmentalMetadata(locationResult.latitude, locationResult.longitude),
    ]);

    // Add location metadata to the results
    Object.assign(metadata, locationResult);

    // Merge successful results
    if (deviceMetadata.status === 'fulfilled') {
      Object.assign(metadata, deviceMetadata.value);
    }
    if (visualMetadata.status === 'fulfilled') {
      Object.assign(metadata, visualMetadata.value);
    }
    if (environmentalMetadata.status === 'fulfilled') {
      Object.assign(metadata, environmentalMetadata.value);
    }

    // Add smart contextual hints
    this.addSmartContextualHints(metadata);

    return metadata;
  }

  /**
   * Collect device and camera technical metadata
   */
  private async collectDeviceMetadata(): Promise<Partial<ComprehensiveMetadata>> {
    if (!this.cachedDeviceInfo) {
      this.cachedDeviceInfo = {
        deviceModel: Device.modelName || Device.designName || 'Unknown',
        deviceOS: `${Platform.OS} ${Device.osVersion}`,
        // Additional device info
        deviceFingerprint: await this.generateDeviceFingerprint(),
      };
    }

    const metadata: Partial<ComprehensiveMetadata> = {
      deviceModel: this.cachedDeviceInfo.deviceModel,
      deviceOS: this.cachedDeviceInfo.deviceOS,
    };

    // Collect camera metadata if available
    try {
      // Note: Camera metadata collection would require additional permissions
      // and native modules for EXIF data extraction
      const cameraMetadata = await this.extractCameraMetadata();
      Object.assign(metadata, cameraMetadata);
    } catch (error) {
      console.log('Camera metadata not available:', error);
    }

    return metadata;
  }

  /**
   * Collect location and environmental metadata
   */
  private async collectLocationMetadata(): Promise<Partial<ComprehensiveMetadata>> {
    const metadata: Partial<ComprehensiveMetadata> = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    try {
      // Check cached permission first
      if (this.cachedLocationPermission === null) {
        const { status } = await Location.getForegroundPermissionsAsync();
        this.cachedLocationPermission = status === 'granted';
      }

      if (this.cachedLocationPermission) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 5000,
        });

        metadata.latitude = location.coords.latitude;
        metadata.longitude = location.coords.longitude;

        // Attempt to get venue information
        try {
          const venueInfo = await this.getVenueInformation(
            location.coords.latitude,
            location.coords.longitude
          );
          Object.assign(metadata, venueInfo);
        } catch (error) {
          console.log('Venue information not available:', error);
        }
      }
    } catch (error) {
      console.log('Location metadata not available:', error);
    }

    return metadata;
  }

  /**
   * Collect visual analysis preprocessing data
   */
  private async collectVisualMetadata(imageUri: string): Promise<Partial<ComprehensiveMetadata>> {
    const metadata: Partial<ComprehensiveMetadata> = {};

    try {
      // Get image information
      const imageInfo = await manipulateAsync(imageUri, [], { format: 'jpeg' });

      if (imageInfo.width && imageInfo.height) {
        metadata.cameraResolutionWidth = imageInfo.width;
        metadata.cameraResolutionHeight = imageInfo.height;
      }

      // Perform comprehensive image analysis using the preprocessing service
      const imageAnalysis = await imagePreprocessingService.analyzeImage(imageUri);

      // Map analysis results to metadata
      metadata.imageBrightness = imageAnalysis.brightness;
      metadata.imageContrast = imageAnalysis.contrast;
      metadata.dominantColors = imageAnalysis.dominantColors;
      metadata.colorTemperature = imageAnalysis.colorTemperature;
      metadata.hasReferenceObjects = imageAnalysis.hasReferenceObjects;
      metadata.detectedTableware = imageAnalysis.detectedShapes;

      // Additional analysis for cooking method indicators
      const cookingIndicators =
        await imagePreprocessingService.detectCookingMethodIndicators(imageUri);
      if (cookingIndicators.length > 0) {
        // Store cooking indicators in a way that can be used by the AI
        metadata.homeCookingIndicators = cookingIndicators;
      }

      // Portion size estimation if reference objects are available
      if (imageAnalysis.hasReferenceObjects) {
        const portionEstimate = await imagePreprocessingService.estimatePortionSize(
          imageUri,
          imageAnalysis.detectedShapes
        );
        // Store portion estimation confidence as capture confidence factor
        metadata.captureConfidence = Math.max(
          metadata.captureConfidence || 0,
          portionEstimate.confidence
        );
      }
    } catch (error) {
      console.log('Visual metadata collection failed:', error);
    }

    return metadata;
  }

  /**
   * Collect environmental context metadata
   */
  private async collectEnvironmentalMetadata(
    latitude?: number,
    longitude?: number
  ): Promise<Partial<ComprehensiveMetadata>> {
    const metadata: Partial<ComprehensiveMetadata> = {};

    try {
      // Use the environmental context service for comprehensive data collection
      const environmentalContext = await environmentalContextService.collectEnvironmentalContext(
        latitude,
        longitude
      );

      // Merge environmental context into metadata
      Object.assign(metadata, environmentalContext);

      // Infer venue type based on environmental factors
      const venueType = await environmentalContextService.inferVenueType(latitude, longitude);
      metadata.venueType = venueType;
    } catch (error) {
      console.log('Environmental context collection failed:', error);
    }

    return metadata;
  }

  /**
   * Extract camera metadata from image EXIF data
   */
  private async extractCameraMetadata(): Promise<Partial<ComprehensiveMetadata>> {
    // This would require a native module or library for EXIF data extraction
    // For now, return empty object
    const metadata: Partial<ComprehensiveMetadata> = {};

    // Placeholder for EXIF extraction
    // In a real implementation, you would use a library like:
    // - react-native-exif
    // - expo-media-library with EXIF support
    // - Custom native module

    return metadata;
  }

  /**
   * Analyze image for visual characteristics
   */
  private async analyzeImageVisualCharacteristics(
    imageUri: string
  ): Promise<Partial<ComprehensiveMetadata>> {
    const metadata: Partial<ComprehensiveMetadata> = {};

    try {
      // Basic image analysis that can be done without heavy processing
      // In a real implementation, you might use:
      // - TensorFlow.js for basic image analysis
      // - Custom image processing algorithms
      // - Cloud-based image analysis APIs

      // Placeholder for image brightness calculation
      metadata.imageBrightness = this.estimateImageBrightness();

      // Placeholder for color analysis
      metadata.dominantColors = await this.extractDominantColors(imageUri);
      metadata.colorTemperature = this.assessColorTemperature(metadata.dominantColors || []);

      // Simple reference object detection
      metadata.hasReferenceObjects = this.detectReferenceObjects();
      metadata.detectedTableware = this.detectTableware();
    } catch (error) {
      console.log('Visual analysis failed:', error);
    }

    return metadata;
  }

  /**
   * Get venue information based on location
   */
  private async getVenueInformation(
    latitude: number,
    longitude: number
  ): Promise<Partial<ComprehensiveMetadata>> {
    // This would integrate with location services APIs like:
    // - Google Places API
    // - Foursquare API
    // - Apple MapKit

    // Placeholder implementation
    return {
      venueType: 'unknown', // Could be 'restaurant', 'home', 'office', etc.
    };
  }

  /**
   * Get weather information
   */
  private async getWeatherInformation(): Promise<{ temperature: number; humidity: number } | null> {
    // This would integrate with weather APIs like:
    // - OpenWeatherMap
    // - WeatherAPI
    // - AccuWeather

    // Placeholder implementation
    return null;
  }

  /**
   * Generate a unique device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const fingerprint = [
      Device.modelName || 'unknown',
      Device.osVersion || 'unknown',
      Platform.OS,
      Device.manufacturer || 'unknown',
    ].join('-');

    return fingerprint;
  }

  /**
   * Add smart contextual hints based on collected metadata
   */
  private addSmartContextualHints(metadata: ImageAnalysisMetadata): void {
    const now = new Date();
    const hour = now.getHours();

    // Smart meal type detection if not provided
    if (!metadata.mealType) {
      if (hour >= 6 && hour < 11) {
        metadata.mealType = 'breakfast';
      } else if (hour >= 11 && hour < 15) {
        metadata.mealType = 'lunch';
      } else if (hour >= 17 && hour < 21) {
        metadata.mealType = 'dinner';
      } else {
        metadata.mealType = 'snack';
      }
    }

    // Detect home cooking indicators
    const homeCookingIndicators: string[] = [];
    if (metadata.venueType === 'home' || !metadata.venueType) {
      homeCookingIndicators.push('home_location');
    }
    if (metadata.estimatedMealValue && metadata.estimatedMealValue < 15) {
      homeCookingIndicators.push('low_cost_indicator');
    }
    if (homeCookingIndicators.length > 0) {
      metadata.homeCookingIndicators = homeCookingIndicators;
    }

    // Assess photo angle based on device orientation
    // This would require device orientation sensors
    metadata.photoAngle = 'top-down'; // Placeholder

    // Set capture confidence based on available metadata completeness
    const metadataCompleteness = this.calculateMetadataCompleteness(metadata);
    metadata.captureConfidence = metadataCompleteness;
  }

  /**
   * Calculate metadata completeness score
   */
  private calculateMetadataCompleteness(metadata: ImageAnalysisMetadata): number {
    const totalFields = Object.keys(metadata).length;
    const filledFields = Object.values(metadata).filter(
      (value) => value !== null && value !== undefined && value !== ''
    ).length;

    return Math.min(filledFields / totalFields, 1.0);
  }

  /**
   * Placeholder methods for image analysis
   */
  private estimateImageBrightness(): number {
    // Placeholder - would analyze image pixel data
    return 0.5;
  }

  private async extractDominantColors(imageUri: string): Promise<string[]> {
    // Placeholder - would use color analysis library
    return ['#FF0000', '#00FF00', '#0000FF'];
  }

  private assessColorTemperature(colors: string[]): string {
    // Placeholder - would analyze color temperature
    return 'neutral';
  }

  private detectReferenceObjects(): boolean {
    // Placeholder - would use object detection
    return false;
  }

  private detectTableware(): string[] {
    // Placeholder - would use object detection
    return ['plate'];
  }

  /**
   * Collect user behavioral context from stored preferences
   */
  async collectUserBehavioralContext(userId: string): Promise<Partial<ComprehensiveMetadata>> {
    // This would integrate with user profile and history data
    const metadata: Partial<ComprehensiveMetadata> = {};

    try {
      // Get user dietary preferences from profile
      const userProfile = await this.getUserProfile(userId);
      if (userProfile) {
        metadata.userDietaryPreferences = userProfile.dietaryPreferences;
        metadata.typicalPortionSize = userProfile.typicalPortionSize;
        metadata.cookingSkillLevel = userProfile.cookingSkillLevel;
        metadata.frequentCuisines = userProfile.frequentCuisines;
      }
    } catch (error) {
      console.log('User context not available:', error);
    }

    return metadata;
  }

  /**
   * Get user profile data
   */
  private async getUserProfile(userId: string): Promise<any> {
    // This would integrate with your user profile API
    // Placeholder implementation
    return null;
  }

  /**
   * Detect photo quality issues in real-time
   */
  async detectPhotoQualityIssues(imageUri: string): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Basic quality checks that can be done quickly
      const imageInfo = await manipulateAsync(imageUri, [], { format: 'jpeg' });

      // Check resolution
      if (imageInfo.width && imageInfo.height) {
        if (imageInfo.width < 640 || imageInfo.height < 640) {
          issues.push('low_resolution');
        }
      }

      // Check brightness (placeholder)
      const brightness = this.estimateImageBrightness();
      if (brightness < 0.2) {
        issues.push('too_dark');
      } else if (brightness > 0.8) {
        issues.push('too_bright');
      }

      // Additional quality checks would go here
      // - Blur detection
      // - Focus quality
      // - Noise levels
      // - Color balance
    } catch (error) {
      console.log('Quality analysis failed:', error);
      issues.push('analysis_failed');
    }

    return issues;
  }
}

export const metadataCollectionService = MetadataCollectionService.getInstance();
