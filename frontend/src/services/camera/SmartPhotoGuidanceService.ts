/**
 * Smart Photo Guidance Service
 *
 * Provides real-time feedback and guidance to users for capturing
 * optimal food photos for AI nutritional analysis.
 */

import { manipulateAsync } from 'expo-image-manipulator';
import { imagePreprocessingService } from '@/services/image/ImagePreprocessingService';
import { rs } from '@/utils/responsive';

export interface PhotoQualityAssessment {
  overallScore: number; // 0-100
  issues: PhotoIssue[];
  suggestions: string[];
  isOptimal: boolean;
}

export interface PhotoIssue {
  type: 'lighting' | 'blur' | 'angle' | 'distance' | 'framing' | 'obstruction';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface GuidanceState {
  currentAssessment: PhotoQualityAssessment;
  showGuidance: boolean;
  guidanceLevel: 'minimal' | 'standard' | 'detailed';
  autoCapture: boolean;
  confidenceThreshold: number;
}

export interface RealTimeGuidance {
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  action?: 'move_closer' | 'move_back' | 'adjust_angle' | 'improve_lighting' | 'wait' | 'capture';
}

export class SmartPhotoGuidanceService {
  private static instance: SmartPhotoGuidanceService;
  private guidanceState: GuidanceState;
  private lastAssessmentTime: number = 0;
  private readonly ASSESSMENT_INTERVAL = 1000; // 1 second

  static getInstance(): SmartPhotoGuidanceService {
    if (!SmartPhotoGuidanceService.instance) {
      SmartPhotoGuidanceService.instance = new SmartPhotoGuidanceService();
    }
    return SmartPhotoGuidanceService.instance;
  }

  constructor() {
    this.guidanceState = {
      currentAssessment: this.createDefaultAssessment(),
      showGuidance: true,
      guidanceLevel: 'standard',
      autoCapture: false,
      confidenceThreshold: 80,
    };
  }

  /**
   * Assess photo quality in real-time
   */
  async assessPhotoQuality(imageUri: string): Promise<PhotoQualityAssessment> {
    try {
      // Throttle assessments to avoid performance issues
      const now = Date.now();
      if (now - this.lastAssessmentTime < this.ASSESSMENT_INTERVAL) {
        return this.guidanceState.currentAssessment;
      }
      this.lastAssessmentTime = now;

      // Perform quick image analysis
      const imageAnalysis = await imagePreprocessingService.analyzeImage(imageUri);

      // Assess various quality factors
      const issues: PhotoIssue[] = [];
      let overallScore = 100;

      // Lighting assessment
      const lightingIssue = this.assessLighting(imageAnalysis.brightness, imageAnalysis.contrast);
      if (lightingIssue) {
        issues.push(lightingIssue);
        overallScore -= this.getScorePenalty(lightingIssue.severity);
      }

      // Sharpness assessment
      const sharpnessIssue = this.assessSharpness(imageAnalysis.sharpness);
      if (sharpnessIssue) {
        issues.push(sharpnessIssue);
        overallScore -= this.getScorePenalty(sharpnessIssue.severity);
      }

      // Color and exposure assessment
      const colorIssue = this.assessColorQuality(
        imageAnalysis.dominantColors,
        imageAnalysis.colorTemperature
      );
      if (colorIssue) {
        issues.push(colorIssue);
        overallScore -= this.getScorePenalty(colorIssue.severity);
      }

      // Food area assessment
      const framingIssue = this.assessFraming(imageAnalysis.estimatedFoodArea);
      if (framingIssue) {
        issues.push(framingIssue);
        overallScore -= this.getScorePenalty(framingIssue.severity);
      }

      // Reference objects assessment
      const referenceIssue = this.assessReferenceObjects(imageAnalysis.hasReferenceObjects);
      if (referenceIssue) {
        issues.push(referenceIssue);
        overallScore -= this.getScorePenalty(referenceIssue.severity);
      }

      // Generate suggestions
      const suggestions = this.generateSuggestions(issues);

      const assessment: PhotoQualityAssessment = {
        overallScore: Math.max(0, overallScore),
        issues,
        suggestions,
        isOptimal: overallScore >= this.guidanceState.confidenceThreshold && issues.length === 0,
      };

      this.guidanceState.currentAssessment = assessment;
      return assessment;
    } catch (error) {
      console.error('Photo quality assessment failed:', error);
      return this.createDefaultAssessment();
    }
  }

  /**
   * Get real-time guidance message
   */
  getRealTimeGuidance(assessment: PhotoQualityAssessment): RealTimeGuidance {
    if (assessment.isOptimal) {
      return {
        message: 'Perfect! Great photo quality detected.',
        type: 'success',
        priority: 'low',
        action: 'capture',
      };
    }

    // Find the highest priority issue
    const highPriorityIssues = assessment.issues.filter((issue) => issue.severity === 'high');
    const mediumPriorityIssues = assessment.issues.filter((issue) => issue.severity === 'medium');

    let primaryIssue: PhotoIssue | undefined;

    if (highPriorityIssues.length > 0) {
      primaryIssue = highPriorityIssues[0];
    } else if (mediumPriorityIssues.length > 0) {
      primaryIssue = mediumPriorityIssues[0];
    } else if (assessment.issues.length > 0) {
      primaryIssue = assessment.issues[0];
    }

    if (primaryIssue) {
      return {
        message: primaryIssue.message,
        type: primaryIssue.severity === 'high' ? 'error' : 'warning',
        priority: primaryIssue.severity === 'high' ? 'high' : 'medium',
        action: this.getActionFromIssueType(primaryIssue.type),
      };
    }

    return {
      message: 'Adjusting photo for better analysis...',
      type: 'info',
      priority: 'low',
    };
  }

  /**
   * Assess lighting quality
   */
  private assessLighting(brightness: number, contrast: number): PhotoIssue | null {
    if (brightness < 0.2) {
      return {
        type: 'lighting',
        severity: 'high',
        message: 'Photo is too dark',
        suggestion: 'Move to better lighting or use flash',
      };
    } else if (brightness > 0.9) {
      return {
        type: 'lighting',
        severity: 'high',
        message: 'Photo is overexposed',
        suggestion: 'Reduce lighting or move away from bright light',
      };
    } else if (brightness < 0.3) {
      return {
        type: 'lighting',
        severity: 'medium',
        message: 'Lighting could be better',
        suggestion: 'Try to improve lighting for clearer details',
      };
    } else if (contrast < 0.5) {
      return {
        type: 'lighting',
        severity: 'medium',
        message: 'Low contrast detected',
        suggestion: 'Adjust lighting to improve contrast',
      };
    }
    return null;
  }

  /**
   * Assess image sharpness
   */
  private assessSharpness(sharpness: number): PhotoIssue | null {
    if (sharpness < 0.3) {
      return {
        type: 'blur',
        severity: 'high',
        message: 'Image appears blurry',
        suggestion: 'Hold camera steady and tap to focus',
      };
    } else if (sharpness < 0.5) {
      return {
        type: 'blur',
        severity: 'medium',
        message: 'Image could be sharper',
        suggestion: 'Ensure camera is focused and steady',
      };
    }
    return null;
  }

  /**
   * Assess color quality
   */
  private assessColorQuality(
    dominantColors: string[],
    colorTemperature: string
  ): PhotoIssue | null {
    if (dominantColors.length === 0) {
      return {
        type: 'lighting',
        severity: 'medium',
        message: 'Color detection issues',
        suggestion: 'Improve lighting for better color accuracy',
      };
    }

    // Check for extreme color temperatures that might indicate poor lighting
    if (colorTemperature === 'cool' && dominantColors.every((color) => color.startsWith('#0'))) {
      return {
        type: 'lighting',
        severity: 'medium',
        message: 'Colors appear washed out',
        suggestion: 'Try warmer lighting conditions',
      };
    }

    return null;
  }

  /**
   * Assess framing and food area
   */
  private assessFraming(foodArea: number): PhotoIssue | null {
    if (foodArea < 0.3) {
      return {
        type: 'distance',
        severity: 'high',
        message: 'Food appears too small in frame',
        suggestion: 'Move closer to the food',
      };
    } else if (foodArea > 0.95) {
      return {
        type: 'distance',
        severity: 'medium',
        message: 'Food fills entire frame',
        suggestion: 'Move back slightly to show context',
      };
    } else if (foodArea < 0.5) {
      return {
        type: 'framing',
        severity: 'medium',
        message: 'Center the food better in frame',
        suggestion: 'Adjust framing to focus on the food',
      };
    }
    return null;
  }

  /**
   * Assess reference objects for portion estimation
   */
  private assessReferenceObjects(hasReferenceObjects: boolean): PhotoIssue | null {
    if (!hasReferenceObjects) {
      return {
        type: 'framing',
        severity: 'low',
        message: 'No size references detected',
        suggestion: 'Include utensils or other objects for better portion estimation',
      };
    }
    return null;
  }

  /**
   * Generate actionable suggestions
   */
  private generateSuggestions(issues: PhotoIssue[]): string[] {
    const suggestions: string[] = [];
    const issueTypes = new Set(issues.map((issue) => issue.type));

    if (issueTypes.has('lighting')) {
      suggestions.push('Improve lighting conditions');
    }
    if (issueTypes.has('blur')) {
      suggestions.push('Keep camera steady and ensure focus');
    }
    if (issueTypes.has('distance')) {
      suggestions.push('Adjust distance to food');
    }
    if (issueTypes.has('framing')) {
      suggestions.push('Center food in frame');
    }
    if (issueTypes.has('angle')) {
      suggestions.push('Try a top-down angle for best results');
    }

    // Add general suggestions if no specific issues
    if (suggestions.length === 0) {
      suggestions.push('Great photo! Ready for analysis');
    }

    return suggestions;
  }

  /**
   * Get score penalty based on issue severity
   */
  private getScorePenalty(severity: 'low' | 'medium' | 'high'): number {
    switch (severity) {
      case 'low':
        return 5;
      case 'medium':
        return 15;
      case 'high':
        return 30;
      default:
        return 10;
    }
  }

  /**
   * Get recommended action from issue type
   */
  private getActionFromIssueType(type: PhotoIssue['type']): RealTimeGuidance['action'] {
    switch (type) {
      case 'lighting':
        return 'improve_lighting';
      case 'blur':
        return 'wait';
      case 'distance':
        return 'move_closer';
      case 'framing':
        return 'adjust_angle';
      case 'angle':
        return 'adjust_angle';
      case 'obstruction':
        return 'adjust_angle';
      default:
        return 'wait';
    }
  }

  /**
   * Create default assessment
   */
  private createDefaultAssessment(): PhotoQualityAssessment {
    return {
      overallScore: 50,
      issues: [],
      suggestions: ['Position camera over food', 'Ensure good lighting'],
      isOptimal: false,
    };
  }

  /**
   * Update guidance settings
   */
  updateGuidanceSettings(settings: Partial<GuidanceState>): void {
    this.guidanceState = { ...this.guidanceState, ...settings };
  }

  /**
   * Get current guidance state
   */
  getGuidanceState(): GuidanceState {
    return { ...this.guidanceState };
  }

  /**
   * Smart auto-capture decision
   */
  shouldAutoCapture(assessment: PhotoQualityAssessment): boolean {
    if (!this.guidanceState.autoCapture) {
      return false;
    }

    return (
      assessment.isOptimal && assessment.overallScore >= this.guidanceState.confidenceThreshold
    );
  }

  /**
   * Provide step-by-step guidance for beginners
   */
  getStepByStepGuidance(currentStep: number): string[] {
    const steps = [
      'Position your camera directly above the food',
      'Ensure the food fills 60-80% of the frame',
      'Check that lighting is even across the plate',
      'Include utensils or other objects for size reference',
      'Keep the camera steady and tap to focus',
      'Wait for the green indicator before capturing',
    ];

    return steps.slice(0, currentStep + 1);
  }

  /**
   * Analyze photo composition for nutritional analysis optimization
   */
  async analyzeComposition(imageUri: string): Promise<{
    foodCoverage: number;
    angleOptimality: number;
    lightingUniformity: number;
    colorAccuracy: number;
    portionVisibility: number;
  }> {
    try {
      const analysis = await imagePreprocessingService.analyzeImage(imageUri);

      return {
        foodCoverage: analysis.estimatedFoodArea,
        angleOptimality: this.calculateAngleOptimality(analysis),
        lightingUniformity: this.calculateLightingUniformity(
          analysis.brightness,
          analysis.contrast
        ),
        colorAccuracy: this.calculateColorAccuracy(analysis.dominantColors),
        portionVisibility: analysis.hasReferenceObjects ? 0.9 : 0.6,
      };
    } catch (error) {
      console.error('Composition analysis failed:', error);
      return {
        foodCoverage: 0.5,
        angleOptimality: 0.5,
        lightingUniformity: 0.5,
        colorAccuracy: 0.5,
        portionVisibility: 0.5,
      };
    }
  }

  /**
   * Calculate angle optimality (prefers top-down views)
   */
  private calculateAngleOptimality(analysis: any): number {
    // This would use more sophisticated analysis in production
    // For now, assume good optimality if shapes are detected well
    return analysis.detectedShapes.length > 0 ? 0.8 : 0.6;
  }

  /**
   * Calculate lighting uniformity
   */
  private calculateLightingUniformity(brightness: number, contrast: number): number {
    // Optimal lighting: brightness 0.4-0.7, contrast 0.8-1.5
    const brightnessScore =
      brightness >= 0.4 && brightness <= 0.7
        ? 1.0
        : Math.max(0, 1 - Math.abs(brightness - 0.55) * 2);
    const contrastScore =
      contrast >= 0.8 && contrast <= 1.5 ? 1.0 : Math.max(0, 1 - Math.abs(contrast - 1.15) * 0.7);

    return (brightnessScore + contrastScore) / 2;
  }

  /**
   * Calculate color accuracy score
   */
  private calculateColorAccuracy(colors: string[]): number {
    if (colors.length === 0) return 0;

    // More colors usually indicate better color capture
    const colorDiversityScore = Math.min(1, colors.length / 5);

    // Check for realistic food colors (browns, greens, reds, yellows)
    const realisticColors = colors.filter((color) => this.isRealisticFoodColor(color)).length;

    const realismScore = realisticColors / colors.length;

    return (colorDiversityScore + realismScore) / 2;
  }

  /**
   * Check if color is realistic for food
   */
  private isRealisticFoodColor(color: string): boolean {
    // Simplified check for food-like colors
    const hex = color.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Avoid pure blues and purples which are rare in food
    return !(r < 100 && g < 100 && b > 150);
  }
}

export const smartPhotoGuidanceService = SmartPhotoGuidanceService.getInstance();
