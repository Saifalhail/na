import { MMKV } from 'react-native-mmkv';
import { analytics } from '@/services/analytics/AnalyticsService';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  targetAudience?: TargetAudience;
  successMetrics: string[];
}

interface Variant {
  id: string;
  name: string;
  weight: number; // Percentage weight (0-100)
  config: Record<string, any>;
}

interface TargetAudience {
  minAppVersion?: string;
  platforms?: ('ios' | 'android')[];
  userProperties?: Record<string, any>;
  percentage?: number; // What percentage of eligible users to include
}

interface UserExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: number;
}

class ABTestingService {
  private static instance: ABTestingService;
  private storage: MMKV;
  private experiments: Map<string, Experiment> = new Map();
  private userAssignments: Map<string, UserExperimentAssignment> = new Map();
  private userId?: string;

  private constructor() {
    this.storage = new MMKV({ id: 'ab-testing' });
    this.loadExperiments();
    this.loadUserAssignments();
  }

  static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  initialize(userId: string): void {
    this.userId = userId;
    this.loadUserAssignments();
  }

  // Get variant for an experiment
  getVariant(experimentId: string): string | null {
    // Check if user already has an assignment
    const assignment = this.userAssignments.get(experimentId);
    if (assignment) {
      return assignment.variantId;
    }

    // Get experiment
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return null;
    }

    // Check if user is eligible
    if (!this.isUserEligible(experiment)) {
      return null;
    }

    // Assign variant
    const variant = this.assignVariant(experiment);
    if (variant) {
      // Track assignment
      analytics.setExperiment(experiment.name, variant.name);
      analytics.track('experiment_assigned', {
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        variant_id: variant.id,
        variant_name: variant.name,
      });
    }

    return variant?.id || null;
  }

  // Get experiment configuration
  getExperimentConfig(experimentId: string): Record<string, any> | null {
    const variantId = this.getVariant(experimentId);
    if (!variantId) return null;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find((v) => v.id === variantId);
    return variant?.config || null;
  }

  // Check if a feature is enabled for the user
  isFeatureEnabled(featureKey: string, defaultValue: boolean = false): boolean {
    // This could check multiple experiments that affect the same feature
    for (const [experimentId, experiment] of this.experiments) {
      if (experiment.status === 'active') {
        const config = this.getExperimentConfig(experimentId);
        if (config && featureKey in config) {
          return config[featureKey];
        }
      }
    }
    return defaultValue;
  }

  // Get value for an experiment parameter
  getExperimentValue<T>(experimentId: string, paramKey: string, defaultValue: T): T {
    const config = this.getExperimentConfig(experimentId);
    if (config && paramKey in config) {
      return config[paramKey];
    }
    return defaultValue;
  }

  // Track experiment conversion
  trackConversion(experimentId: string, conversionEvent: string, value?: number): void {
    const assignment = this.userAssignments.get(experimentId);
    if (!assignment) return;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    analytics.track('experiment_conversion', {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      variant_id: assignment.variantId,
      conversion_event: conversionEvent,
      conversion_value: value,
    });
  }

  // Set experiments (usually from remote config)
  setExperiments(experiments: Experiment[]): void {
    this.experiments.clear();
    experiments.forEach((exp) => {
      this.experiments.set(exp.id, exp);
    });
    this.persistExperiments();
  }

  // Add a single experiment
  addExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
    this.persistExperiments();
  }

  // Update experiment status
  updateExperimentStatus(experimentId: string, status: Experiment['status']): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.status = status;
      this.persistExperiments();
    }
  }

  private isUserEligible(experiment: Experiment): boolean {
    if (!experiment.targetAudience) return true;

    const { targetAudience } = experiment;

    // Check platform
    if (targetAudience.platforms && targetAudience.platforms.length > 0) {
      const platform = require('react-native').Platform.OS;
      if (!targetAudience.platforms.includes(platform)) {
        return false;
      }
    }

    // Check app version
    if (targetAudience.minAppVersion) {
      // TODO: Implement version comparison
    }

    // Check user properties
    if (targetAudience.userProperties) {
      // TODO: Check against user properties
    }

    // Check percentage rollout
    if (targetAudience.percentage && targetAudience.percentage < 100) {
      const hash = this.hashUserId(this.userId || '');
      const bucket = hash % 100;
      return bucket < targetAudience.percentage;
    }

    return true;
  }

  private assignVariant(experiment: Experiment): Variant | null {
    if (!this.userId) return null;

    // Calculate total weight
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return null;

    // Use user ID hash for consistent assignment
    const hash = this.hashUserId(this.userId + experiment.id);
    const bucket = hash % totalWeight;

    // Find variant based on weight
    let accumulated = 0;
    for (const variant of experiment.variants) {
      accumulated += variant.weight;
      if (bucket < accumulated) {
        // Save assignment
        const assignment: UserExperimentAssignment = {
          experimentId: experiment.id,
          variantId: variant.id,
          assignedAt: Date.now(),
        };
        this.userAssignments.set(experiment.id, assignment);
        this.persistUserAssignments();
        return variant;
      }
    }

    return null;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private loadExperiments(): void {
    const stored = this.storage.getString('experiments');
    if (stored) {
      try {
        const experiments: Experiment[] = JSON.parse(stored);
        experiments.forEach((exp) => {
          this.experiments.set(exp.id, exp);
        });
      } catch (error) {
        console.error('[ABTesting] Failed to load experiments:', error);
      }
    }
  }

  private persistExperiments(): void {
    const experiments = Array.from(this.experiments.values());
    this.storage.set('experiments', JSON.stringify(experiments));
  }

  private loadUserAssignments(): void {
    if (!this.userId) return;

    const stored = this.storage.getString(`assignments_${this.userId}`);
    if (stored) {
      try {
        const assignments: UserExperimentAssignment[] = JSON.parse(stored);
        assignments.forEach((assignment) => {
          this.userAssignments.set(assignment.experimentId, assignment);
        });
      } catch (error) {
        console.error('[ABTesting] Failed to load assignments:', error);
      }
    }
  }

  private persistUserAssignments(): void {
    if (!this.userId) return;

    const assignments = Array.from(this.userAssignments.values());
    this.storage.set(`assignments_${this.userId}`, JSON.stringify(assignments));
  }

  // Get all active experiments (for debugging)
  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values()).filter((exp) => exp.status === 'active');
  }

  // Get user's experiment assignments (for debugging)
  getUserAssignments(): UserExperimentAssignment[] {
    return Array.from(this.userAssignments.values());
  }

  // Clear all data (for testing)
  clearAll(): void {
    this.experiments.clear();
    this.userAssignments.clear();
    this.storage.clearAll();
  }
}

export const abTesting = ABTestingService.getInstance();

// Export types
export type { Experiment, Variant, TargetAudience, UserExperimentAssignment };
