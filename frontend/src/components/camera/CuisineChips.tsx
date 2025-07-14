import React, { useState } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { Chip } from '@/components/base/Chip';

interface CuisineOption {
  id: string;
  name: string;
  emoji: string;
  popular?: boolean;
}

interface CuisineChipsProps {
  value?: string[];
  onChange?: (cuisines: string[]) => void;
  multiple?: boolean;
  showCustomInput?: boolean;
  maxSelections?: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}

const popularCuisines: CuisineOption[] = [
  { id: 'italian', name: 'Italian', emoji: '🇮🇹', popular: true },
  { id: 'chinese', name: 'Chinese', emoji: '🇨🇳', popular: true },
  { id: 'mexican', name: 'Mexican', emoji: '🇲🇽', popular: true },
  { id: 'indian', name: 'Indian', emoji: '🇮🇳', popular: true },
  { id: 'japanese', name: 'Japanese', emoji: '🇯🇵', popular: true },
  { id: 'american', name: 'American', emoji: '🇺🇸', popular: true },
  { id: 'thai', name: 'Thai', emoji: '🇹🇭', popular: true },
  { id: 'french', name: 'French', emoji: '🇫🇷', popular: true },
];

const moreCuisines: CuisineOption[] = [
  { id: 'mediterranean', name: 'Mediterranean', emoji: '🇬🇷' },
  { id: 'korean', name: 'Korean', emoji: '🇰🇷' },
  { id: 'vietnamese', name: 'Vietnamese', emoji: '🇻🇳' },
  { id: 'spanish', name: 'Spanish', emoji: '🇪🇸' },
  { id: 'greek', name: 'Greek', emoji: '🇬🇷' },
  { id: 'lebanese', name: 'Lebanese', emoji: '🇱🇧' },
  { id: 'turkish', name: 'Turkish', emoji: '🇹🇷' },
  { id: 'brazilian', name: 'Brazilian', emoji: '🇧🇷' },
  { id: 'ethiopian', name: 'Ethiopian', emoji: '🇪🇹' },
  { id: 'moroccan', name: 'Moroccan', emoji: '🇲🇦' },
  { id: 'german', name: 'German', emoji: '🇩🇪' },
  { id: 'british', name: 'British', emoji: '🇬🇧' },
];

export const CuisineChips: React.FC<CuisineChipsProps> = ({
  value = [],
  onChange,
  multiple = false,
  showCustomInput = true,
  maxSelections = 3,
  size = 'medium',
  style,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(value);
  const [showMore, setShowMore] = useState(false);
  const [customCuisine, setCustomCuisine] = useState('');
  const [showCustomField, setShowCustomField] = useState(false);

  const allCuisines = [...popularCuisines, ...(showMore ? moreCuisines : [])];

  const handleSelect = (cuisineId: string) => {
    if (disabled) return;

    let newSelection: string[];

    if (multiple) {
      if (selectedCuisines.includes(cuisineId)) {
        newSelection = selectedCuisines.filter((id) => id !== cuisineId);
      } else {
        if (selectedCuisines.length >= maxSelections) {
          // Remove the first selected item if at max
          newSelection = [...selectedCuisines.slice(1), cuisineId];
        } else {
          newSelection = [...selectedCuisines, cuisineId];
        }
      }
    } else {
      newSelection = selectedCuisines.includes(cuisineId) ? [] : [cuisineId];
    }

    setSelectedCuisines(newSelection);
    onChange?.(newSelection);
  };

  const handleAddCustom = () => {
    if (customCuisine.trim() && !selectedCuisines.includes(customCuisine.trim())) {
      const newSelection = multiple
        ? [...selectedCuisines, customCuisine.trim()].slice(-maxSelections)
        : [customCuisine.trim()];

      setSelectedCuisines(newSelection);
      onChange?.(newSelection);
      setCustomCuisine('');
      setShowCustomField(false);
    }
  };

  const handleRemoveCustom = (cuisine: string) => {
    const newSelection = selectedCuisines.filter((c) => c !== cuisine);
    setSelectedCuisines(newSelection);
    onChange?.(newSelection);
  };

  const isCustomCuisine = (cuisine: string) => {
    return !allCuisines.some((c) => c.id === cuisine);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={style}>
      <View testID={testID}>
        {/* Selected custom cuisines */}
        {selectedCuisines.filter(isCustomCuisine).length > 0 && (
          <View style={styles.customSection}>
            <Text style={styles.sectionTitle}>Selected:</Text>
            <View style={styles.chipContainer}>
              {selectedCuisines.filter(isCustomCuisine).map((cuisine) => (
                <Chip
                  key={cuisine}
                  label={cuisine}
                  icon="🍴"
                  onDelete={() => handleRemoveCustom(cuisine)}
                  variant="filled"
                  size={size}
                  style={styles.customChip}
                />
              ))}
            </View>
          </View>
        )}

        {/* Popular cuisines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Cuisines:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {popularCuisines.map((cuisine) => (
              <TouchableOpacity
                key={cuisine.id}
                onPress={() => handleSelect(cuisine.id)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Chip
                  label={`${cuisine.emoji} ${cuisine.name}`}
                  selected={selectedCuisines.includes(cuisine.id)}
                  size={size}
                  variant={selectedCuisines.includes(cuisine.id) ? 'filled' : 'outlined'}
                  style={styles.chip}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* More cuisines */}
        {showMore && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More Cuisines:</Text>
            <View style={styles.chipContainer}>
              {moreCuisines.map((cuisine) => (
                <TouchableOpacity
                  key={cuisine.id}
                  onPress={() => handleSelect(cuisine.id)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Chip
                    label={`${cuisine.emoji} ${cuisine.name}`}
                    selected={selectedCuisines.includes(cuisine.id)}
                    size={size}
                    variant={selectedCuisines.includes(cuisine.id) ? 'filled' : 'outlined'}
                    style={styles.chip}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setShowMore(!showMore)}
            style={styles.actionButton}
            disabled={disabled}
          >
            <Text style={[styles.actionText, disabled && styles.disabledText]}>
              {showMore ? 'Show Less' : 'Show More'} {showMore ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showCustomInput && (
            <TouchableOpacity
              onPress={() => setShowCustomField(!showCustomField)}
              style={styles.actionButton}
              disabled={disabled}
            >
              <Text style={[styles.actionText, disabled && styles.disabledText]}>Add Custom +</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Custom input field */}
        {showCustomField && showCustomInput && (
          <View style={styles.customInputContainer}>
            <TextInput
              style={[styles.customInput, disabled && styles.disabledInput]}
              placeholder="Enter cuisine type..."
              placeholderTextColor={theme.colors.neutral[400]}
              value={customCuisine}
              onChangeText={setCustomCuisine}
              onSubmitEditing={handleAddCustom}
              returnKeyType="done"
              editable={!disabled}
              maxLength={30}
            />
            <TouchableOpacity
              onPress={handleAddCustom}
              style={[
                styles.addButton,
                (!customCuisine.trim() || disabled) && styles.disabledButton,
              ]}
              disabled={!customCuisine.trim() || disabled}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selection info */}
        {multiple && (
          <Text style={styles.infoText}>
            {selectedCuisines.length}/{maxSelections} selected
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.m,
    },
    customSection: {
      marginBottom: theme.spacing.m,
      paddingBottom: theme.spacing.s,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
      color: theme.colors.neutral[600],
      marginBottom: theme.spacing.s,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingRight: theme.spacing.m,
      gap: theme.spacing.s,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.s,
    },
    chip: {
      marginRight: theme.spacing.xs,
    },
    customChip: {
      backgroundColor: theme.colors.secondary[100],
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: theme.spacing.m,
    },
    actionButton: {
      padding: theme.spacing.s,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.primary[500],
    },
    disabledText: {
      color: theme.colors.neutral[400],
    },
    customInputContainer: {
      flexDirection: 'row',
      marginTop: theme.spacing.m,
      gap: theme.spacing.s,
    },
    customInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.neutral[300],
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.m,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background,
    },
    disabledInput: {
      backgroundColor: theme.colors.neutral[100],
      color: theme.colors.neutral[400],
    },
    addButton: {
      paddingHorizontal: theme.spacing.l,
      height: 40,
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: theme.colors.neutral[300],
    },
    addButtonText: {
      color: theme.colors.background,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
    },
    infoText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.neutral[500],
      textAlign: 'center',
      marginTop: theme.spacing.s,
    },
  });

export default CuisineChips;
