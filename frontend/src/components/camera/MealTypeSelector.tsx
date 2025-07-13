import React, { useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

interface MealTypeOption {
  type: MealType;
  label: string;
  icon: string;
  description: string;
  timeRange?: string;
}

interface MealTypeSelectorProps {
  value?: MealType;
  onChange?: (type: MealType) => void;
  showDescriptions?: boolean;
  horizontal?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}

const mealTypes: MealTypeOption[] = [
  {
    type: 'breakfast',
    label: 'Breakfast',
    icon: '🌅',
    description: 'Morning meal',
    timeRange: '5AM - 11AM',
  },
  {
    type: 'lunch',
    label: 'Lunch',
    icon: '☀️',
    description: 'Midday meal',
    timeRange: '11AM - 4PM',
  },
  {
    type: 'dinner',
    label: 'Dinner',
    icon: '🌙',
    description: 'Evening meal',
    timeRange: '4PM - 9PM',
  },
  {
    type: 'snack',
    label: 'Snack',
    icon: '🍿',
    description: 'Light bite',
    timeRange: 'Any time',
  },
  {
    type: 'other',
    label: 'Other',
    icon: '🍽️',
    description: 'Custom meal',
    timeRange: 'Any time',
  },
];

export const MealTypeSelector: React.FC<MealTypeSelectorProps> = ({
  value,
  onChange,
  showDescriptions = false,
  horizontal = false,
  size = 'medium',
  style,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [selectedType, setSelectedType] = useState<MealType | undefined>(value);

  const handleSelect = (type: MealType) => {
    if (disabled) return;
    setSelectedType(type);
    onChange?.(type);
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 24,
          fontSize: 12,
          padding: 8,
          width: 85,
          height: showDescriptions ? 95 : 80,
        };
      case 'large':
        return {
          iconSize: 40,
          fontSize: 16,
          padding: 16,
          width: 130,
          height: showDescriptions ? 150 : 130,
        };
      default:
        return {
          iconSize: 32,
          fontSize: 14,
          padding: 12,
          width: 110,
          height: showDescriptions ? 120 : 100,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderMealType = (meal: MealTypeOption) => {
    const isSelected = selectedType === meal.type;
    
    return (
      <TouchableOpacity
        key={meal.type}
        style={[
          styles.mealTypeCard,
          {
            width: sizeStyles.width,
            height: sizeStyles.height,
            padding: sizeStyles.padding,
          },
          isSelected && styles.selectedCard,
          disabled && styles.disabledCard,
        ]}
        onPress={() => handleSelect(meal.type)}
        disabled={disabled}
        activeOpacity={0.7}
        testID={`${testID}-${meal.type}`}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
          disabled,
        }}
        accessibilityLabel={`${meal.label} meal type`}
        accessibilityHint={meal.timeRange}
      >
        <Text style={{ fontSize: sizeStyles.iconSize }}>{meal.icon}</Text>
        <Text
          style={[
            styles.label,
            { fontSize: sizeStyles.fontSize },
            isSelected && styles.selectedLabel,
            disabled && styles.disabledLabel,
          ]}
        >
          {meal.label}
        </Text>
        {showDescriptions && (
          <>
            <Text
              style={[
                styles.description,
                { fontSize: sizeStyles.fontSize - 2 },
                isSelected && styles.selectedDescription,
                disabled && styles.disabledLabel,
              ]}
            >
              {meal.description}
            </Text>
            {meal.timeRange && (
              <Text
                style={[
                  styles.timeRange,
                  { fontSize: sizeStyles.fontSize - 3 },
                  isSelected && styles.selectedTimeRange,
                  disabled && styles.disabledLabel,
                ]}
              >
                {meal.timeRange}
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const containerStyle = [
    styles.container,
    horizontal && styles.horizontalContainer,
    style,
  ];

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={containerStyle}
        contentContainerStyle={styles.scrollContent}
        testID={testID}
      >
        {mealTypes.map(renderMealType)}
      </ScrollView>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {mealTypes.map(renderMealType)}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    horizontalContainer: {
      flexWrap: 'nowrap',
      flexDirection: 'row',
    },
    scrollContent: {
      paddingHorizontal: 4,
      gap: 12,
    },
    mealTypeCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    selectedCard: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
      shadowOpacity: 0.15,
      elevation: 3,
    },
    disabledCard: {
      opacity: 0.5,
      backgroundColor: theme.colors.neutral[100],
    },
    label: {
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
      color: theme.colors.text.primary,
      marginTop: 4,
    },
    selectedLabel: {
      color: theme.colors.primary[600],
      fontWeight: '600',
    },
    disabledLabel: {
      color: theme.colors.neutral[400],
    },
    description: {
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    selectedDescription: {
      color: theme.colors.primary[500],
    },
    timeRange: {
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.neutral[500],
      marginTop: 1,
      textAlign: 'center',
    },
    selectedTimeRange: {
      color: theme.colors.primary[400],
    },
  });

// Helper function to get meal type based on current time
export const getMealTypeByTime = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
};

export default MealTypeSelector;