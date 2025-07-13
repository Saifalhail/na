import React, { useState, useRef, useEffect } from 'react';
import { borderRadius, rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { Button } from '@/components/base/Button';
import { Divider } from '@/components/base/Divider';
import { MealTypeSelector, MealType, getMealTypeByTime } from './MealTypeSelector';
import { CuisineChips } from './CuisineChips';
import { RadioGroup } from '@/components/base/RadioGroup';

const { height: screenHeight } = Dimensions.get('window');

interface CameraOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: CameraOptions) => void;
  initialOptions?: Partial<CameraOptions>;
}

export interface CameraOptions {
  mealType: MealType;
  cuisines: string[];
  portionSize: 'small' | 'medium' | 'large';
  diningContext: 'home' | 'restaurant';
  additionalNotes?: string;
}

const portionSizeOptions = [
  { value: 'small', label: 'Small', description: 'Light meal or snack' },
  { value: 'medium', label: 'Medium', description: 'Regular portion' },
  { value: 'large', label: 'Large', description: 'Hearty portion' },
];

const diningContextOptions = [
  { value: 'home', label: 'Home Cooked', description: 'Prepared at home' },
  { value: 'restaurant', label: 'Eating Out', description: 'Restaurant or takeout' },
];

export const CameraOptionsSheet: React.FC<CameraOptionsSheetProps> = ({
  visible,
  onClose,
  onConfirm,
  initialOptions,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);
  
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [mealType, setMealType] = useState<MealType>(
    initialOptions?.mealType || getMealTypeByTime()
  );
  const [cuisines, setCuisines] = useState<string[]>(initialOptions?.cuisines || []);
  const [portionSize, setPortionSize] = useState<'small' | 'medium' | 'large'>(
    initialOptions?.portionSize || 'medium'
  );
  const [diningContext, setDiningContext] = useState<'home' | 'restaurant'>(
    initialOptions?.diningContext || 'home'
  );

  useEffect(() => {
    if (visible) {
      // Reset to initial values when opening
      setMealType(initialOptions?.mealType || getMealTypeByTime());
      setCuisines(initialOptions?.cuisines || []);
      setPortionSize(initialOptions?.portionSize || 'medium');
      setDiningContext(initialOptions?.diningContext || 'home');

      // Animate sheet in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate sheet out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const options: CameraOptions = {
      mealType,
      cuisines,
      portionSize,
      diningContext,
    };
    
    onConfirm(options);
  };

  const handleClose = async () => {
    await Haptics.selectionAsync();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Meal Context</Text>
            <Text style={styles.subtitle}>
              Help us analyze your meal more accurately
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Meal Type Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What type of meal is this?</Text>
              <MealTypeSelector
                value={mealType}
                onChange={setMealType}
                horizontal
                showDescriptions
                size="medium"
              />
            </View>

            <Divider spacing="medium" />

            {/* Cuisine Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cuisine Type</Text>
              <Text style={styles.sectionDescription}>
                Select up to 3 cuisines that best describe your meal
              </Text>
              <CuisineChips
                value={cuisines}
                onChange={setCuisines}
                multiple
                maxSelections={3}
                size="small"
              />
            </View>

            <Divider spacing="medium" />

            {/* Portion Size Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Portion Size</Text>
              <RadioGroup
                options={portionSizeOptions}
                value={portionSize}
                onChange={(value) => setPortionSize(value as any)}
                orientation="vertical"
                size="medium"
              />
            </View>

            <Divider spacing="medium" />

            {/* Dining Context Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Where are you eating?</Text>
              <RadioGroup
                options={diningContextOptions}
                value={diningContext}
                onChange={(value) => setDiningContext(value as any)}
                orientation="vertical"
                size="medium"
              />
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              variant="outline"
              onPress={handleClose}
              style={styles.actionButton}
            >
              Skip
            </Button>
            <Button
              variant="primary"
              onPress={handleConfirm}
              style={styles.actionButton}
            >
              Apply Context
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: Theme, insets: any) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: screenHeight * 0.85,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 20,
    },
    keyboardAvoid: {
      flex: 1,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.neutral[300],
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: theme.spacing.s,
      marginBottom: theme.spacing.m,
    },
    header: {
      paddingHorizontal: theme.spacing.l,
      paddingBottom: theme.spacing.m,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.l,
    },
    section: {
      marginBottom: theme.spacing.m,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.s,
    },
    sectionDescription: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.m,
    },
    bottomSpacer: {
      height: theme.spacing.xl,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.l,
      paddingTop: theme.spacing.m,
      paddingBottom: insets.bottom + theme.spacing.m,
      gap: theme.spacing.m,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.neutral[200],
    },
    actionButton: {
      flex: 1,
    },
  });

export default CameraOptionsSheet;