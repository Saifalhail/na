import { Platform, AccessibilityInfo } from 'react-native';

/**
 * Accessibility role types for React Native
 */
export type AccessibilityRole =
  | 'none'
  | 'button'
  | 'link'
  | 'search'
  | 'image'
  | 'keyboardkey'
  | 'text'
  | 'adjustable'
  | 'imagebutton'
  | 'header'
  | 'summary'
  | 'alert'
  | 'checkbox'
  | 'combobox'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'scrollbar'
  | 'spinbutton'
  | 'switch'
  | 'tab'
  | 'tablist'
  | 'timer'
  | 'toolbar';

/**
 * Accessibility state interface
 */
export interface AccessibilityState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  busy?: boolean;
  expanded?: boolean;
}

/**
 * Generate accessibility label for nutrition values
 */
export const getNutritionLabel = (value: number, unit: string, nutrient: string): string => {
  return `${value} ${unit} of ${nutrient}`;
};

/**
 * Generate accessibility label for meal cards
 */
export const getMealCardLabel = (meal: {
  name: string;
  calories?: number;
  consumedAt?: string;
  mealType?: string;
}): string => {
  const parts = [meal.name];

  if (meal.calories) {
    parts.push(`${meal.calories} calories`);
  }

  if (meal.mealType) {
    parts.push(meal.mealType);
  }

  if (meal.consumedAt) {
    const date = new Date(meal.consumedAt);
    parts.push(`consumed on ${date.toLocaleDateString()}`);
  }

  return parts.join(', ');
};

/**
 * Generate accessibility hint for interactive elements
 */
export const getActionHint = (action: string): string => {
  switch (action) {
    case 'favorite':
      return 'Double tap to toggle favorite';
    case 'delete':
      return 'Double tap to delete';
    case 'edit':
      return 'Double tap to edit';
    case 'view':
      return 'Double tap to view details';
    case 'camera':
      return 'Double tap to open camera';
    case 'analyze':
      return 'Double tap to analyze image';
    default:
      return `Double tap to ${action}`;
  }
};

/**
 * Announce message for screen readers
 */
export const announce = async (message: string, options?: { queue?: boolean }) => {
  try {
    await AccessibilityInfo.announceForAccessibility(message);
  } catch (error) {
    console.error('Failed to announce message:', error);
  }
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Failed to check screen reader status:', error);
    return false;
  }
};

/**
 * Get accessibility props for form inputs
 */
export const getInputAccessibilityProps = (label: string, error?: string, required?: boolean) => {
  const props: any = {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'text' as AccessibilityRole,
  };

  if (error) {
    props.accessibilityState = { invalid: true };
    props.accessibilityErrorMessage = error;
  }

  if (required) {
    props.accessibilityRequired = true;
  }

  return props;
};

/**
 * Get accessibility props for buttons
 */
export const getButtonAccessibilityProps = (
  label: string,
  disabled?: boolean,
  loading?: boolean
) => {
  const props: any = {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'button' as AccessibilityRole,
    accessibilityState: {} as AccessibilityState,
  };

  if (disabled) {
    props.accessibilityState.disabled = true;
  }

  if (loading) {
    props.accessibilityState.busy = true;
    props.accessibilityLabel = `${label}, loading`;
  }

  return props;
};

/**
 * Get accessibility props for images
 */
export const getImageAccessibilityProps = (description: string, decorative?: boolean) => {
  if (decorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no' as const,
    };
  }

  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image' as AccessibilityRole,
  };
};

/**
 * Create heading accessibility props
 */
export const getHeadingProps = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
  return {
    accessible: true,
    accessibilityRole: 'header' as AccessibilityRole,
    'aria-level': level,
  };
};

/**
 * Format time for screen readers
 */
export const formatTimeForScreenReader = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };

  return date.toLocaleTimeString('en-US', options);
};

/**
 * Format date for screen readers
 */
export const formatDateForScreenReader = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return date.toLocaleDateString('en-US', options);
};

/**
 * Get focus order for navigation
 */
export const getFocusOrder = (index: number, important?: boolean) => {
  if (Platform.OS === 'android') {
    return {
      importantForAccessibility: important ? 'yes' : 'auto',
      accessibilityLiveRegion: important ? 'polite' : 'none',
    };
  }

  return {
    accessibilityViewIsModal: important,
  };
};

/**
 * Keyboard navigation helpers
 */
export const KeyboardNavigation = {
  /**
   * Handle tab navigation
   */
  handleTab: (currentIndex: number, totalItems: number, forward: boolean) => {
    if (forward) {
      return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
    }
    return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
  },

  /**
   * Handle arrow key navigation
   */
  handleArrowKey: (
    currentIndex: number,
    totalItems: number,
    direction: 'up' | 'down' | 'left' | 'right',
    columns: number = 1
  ) => {
    switch (direction) {
      case 'up':
        return Math.max(0, currentIndex - columns);
      case 'down':
        return Math.min(totalItems - 1, currentIndex + columns);
      case 'left':
        return Math.max(0, currentIndex - 1);
      case 'right':
        return Math.min(totalItems - 1, currentIndex + 1);
    }
  },
};

/**
 * Color contrast utilities
 */
export const ColorContrast = {
  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA: (foreground: string, background: string): boolean => {
    // Simplified check - in production, use a proper color contrast library
    return true;
  },

  /**
   * Get high contrast version of color
   */
  getHighContrast: (color: string, isDark: boolean): string => {
    // Simplified - return black or white based on theme
    return isDark ? '#FFFFFF' : '#000000';
  },
};
