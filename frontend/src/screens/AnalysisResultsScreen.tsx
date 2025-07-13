import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { SafeAreaContainer, Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { LoadingOverlay, Spinner } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import { useAuthStore } from '@/store/authStore';
import { MainStackParamList } from '@/navigation/types';
import { formatCalories, formatMacros } from '@/utils/formatting';
import { LOADING_MESSAGES } from '@/constants';
import { rs, rTouchTarget, scale, moderateScale, layout, dimensions, fontScale } from '@/utils/responsive';
import { MealType, Meal } from '@/types/models';
import { aiApi } from '@/services/api/endpoints/ai';
import { getModernShadow } from '@/theme/shadows';

type AnalysisResultsScreenNavigationProp = StackNavigationProp<
  MainStackParamList,
  'AnalysisResults'
>;
type AnalysisResultsScreenRouteProp = RouteProp<MainStackParamList, 'AnalysisResults'>;

interface Props {
  navigation: AnalysisResultsScreenNavigationProp;
  route: AnalysisResultsScreenRouteProp;
}

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  quantity: number;
  unit: string;
  confidence?: number;
}

interface AnalysisData {
  total_calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  items: FoodItem[];
  meal_type?: string;
  cuisine_type?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const AnalysisResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { imageUri } = route.params;
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mealName, setMealName] = useState('');
  const [notes, setNotes] = useState('');

  const { addMeal } = useMealStore();
  const { user } = useAuthStore();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    analyzeImage();
  }, [imageUri]);

  const analyzeImage = async () => {
    setIsAnalyzing(true);

    try {
      // Convert image URI to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];

        if (base64) {
          // Call AI analysis API
          const result = await aiApi.analyzeImage({
            image: base64,
            imageUri: imageUri,
            metadata: {
              mealType: getMealType(),
            },
          });

          // Transform API response to our format
          const transformedData: AnalysisData = {
            total_calories: result.total_calories || 0,
            protein: result.macronutrients?.protein || 0,
            carbs: result.macronutrients?.carbs || 0,
            fat: result.macronutrients?.fat || 0,
            fiber: result.macronutrients?.fiber || 0,
            sugar: result.macronutrients?.sugar || 0,
            sodium: result.micronutrients?.sodium || 0,
            items: (result.items || []).map((item: any, index: number) => ({
              id: `item-${index}`,
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber || 0,
              sugar: item.sugar || 0,
              sodium: item.sodium || 0,
              quantity: item.quantity || 1,
              unit: item.unit || 'serving',
              confidence: item.confidence,
            })),
            meal_type: result.meal_type,
            cuisine_type: result.cuisine_type,
          };

          setAnalysisData(transformedData);
          setMealName(generateMealName(transformedData));

          // Animate in results
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Analysis Failed', 'Unable to analyze the image. Please try again.', [
        { text: 'Retry', onPress: analyzeImage },
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMealType = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 21) return 'dinner';
    return 'snack';
  };

  const generateMealName = (data: AnalysisData) => {
    const mainItems = data.items
      .slice(0, 2)
      .map((item) => item.name)
      .join(' & ');
    return mainItems || 'My Meal';
  };

  const handlePortionEdit = (item: FoodItem) => {
    setEditingItem(item);
    setShowPortionModal(true);
  };

  const handlePortionUpdate = async () => {
    if (!editingItem || !analysisData) return;

    setShowPortionModal(false);
    setIsRecalculating(true);

    try {
      // Recalculate nutrition based on new portion
      const updatedItems = analysisData.items.map((item) =>
        item.id === editingItem.id ? editingItem : item
      );

      // Call recalculation API
      const result = await aiApi.recalculateNutrition({
        items: updatedItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });

      // Update analysis data
      const newData: AnalysisData = {
        ...analysisData,
        total_calories: result.total_calories || 0,
        protein: result.macronutrients?.protein || 0,
        carbs: result.macronutrients?.carbs || 0,
        fat: result.macronutrients?.fat || 0,
        fiber: result.macronutrients?.fiber || 0,
        sugar: result.macronutrients?.sugar || 0,
        sodium: result.micronutrients?.sodium || 0,
        items: updatedItems,
      };

      setAnalysisData(newData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to recalculate nutrition');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleItemRemove = async (itemId: string) => {
    if (!analysisData) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedItems = analysisData.items.filter((item) => item.id !== itemId);

          if (updatedItems.length === 0) {
            Alert.alert('Cannot Remove', 'You must have at least one item in your meal.');
            return;
          }

          setIsRecalculating(true);

          try {
            // Recalculate totals
            const newTotals = updatedItems.reduce(
              (acc, item) => ({
                total_calories: acc.total_calories + item.calories,
                protein: acc.protein + item.protein,
                carbs: acc.carbs + item.carbs,
                fat: acc.fat + item.fat,
                fiber: acc.fiber + (item.fiber || 0),
                sugar: acc.sugar + (item.sugar || 0),
                sodium: acc.sodium + (item.sodium || 0),
              }),
              {
                total_calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
              }
            );

            setAnalysisData({
              ...analysisData,
              ...newTotals,
              items: updatedItems,
            });

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } finally {
            setIsRecalculating(false);
          }
        },
      },
    ]);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !analysisData) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    setShowAddItemModal(false);
    setIsRecalculating(true);

    try {
      // Get nutrition for new item
      const result = await aiApi.recalculateNutrition({
        items: [
          ...analysisData.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
          })),
          {
            name: newItemName,
            quantity: 1,
            unit: 'serving',
          },
        ],
      });

      // Create new item from result
      const newItem: FoodItem = {
        id: `item-${Date.now()}`,
        name: newItemName,
        calories: Math.round((result.total_calories || 0) - analysisData.total_calories),
        protein: Math.round((result.macronutrients?.protein || 0) - analysisData.protein),
        carbs: Math.round((result.macronutrients?.carbs || 0) - analysisData.carbs),
        fat: Math.round((result.macronutrients?.fat || 0) - analysisData.fat),
        quantity: 1,
        unit: 'serving',
      };

      setAnalysisData({
        ...analysisData,
        total_calories: result.total_calories || 0,
        protein: result.macronutrients?.protein || 0,
        carbs: result.macronutrients?.carbs || 0,
        fat: result.macronutrients?.fat || 0,
        items: [...analysisData.items, newItem],
      });

      setNewItemName('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!analysisData) return;

    setIsSaving(true);

    try {
      await addMeal({
        name: mealName,
        mealType: (analysisData.meal_type as MealType) || getMealType(),
        totalCalories: analysisData.total_calories,
        totalProtein: analysisData.protein,
        totalCarbs: analysisData.carbs,
        totalFat: analysisData.fat,
        totalFiber: analysisData.fiber,
        totalSugar: analysisData.sugar,
        totalSodium: analysisData.sodium,
        image: imageUri,
        mealItems: analysisData.items.map((item, index) => ({
          id: item.id,
          foodItem: item,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber || 0,
          sugar: item.sugar || 0,
          sodium: item.sodium || 0,
          order: index
        })),
        notes: notes,
      } as unknown as Partial<Meal>);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success', 'Meal saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('HomeTabs') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetakePhoto = () => {
    navigation.goBack();
  };

  if (isAnalyzing) {
    return (
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Image source={{ uri: imageUri }} style={styles.loadingImage} />
          <Spacer size="xl" />
          <LoadingOverlay visible={isAnalyzing} message={LOADING_MESSAGES.ANALYZING_IMAGE} />
          <Spacer size="lg" />
          <Text style={[styles.loadingTip, { color: theme.colors.textSecondary }]}>
            Our AI is identifying foods and calculating nutrition...
          </Text>
        </View>
      </Container>
    );
  }

  if (!analysisData) {
    return null;
  }

  return (
    <SafeAreaContainer style={styles.container} scrollable scrollViewProps={{ showsVerticalScrollIndicator: false }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('HomeTabs')}
              accessible={true}
              accessibilityLabel="Go back to home screen"
              accessibilityRole="button"
            >
              <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>← Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowAddItemModal(true)}
              accessible={true}
              accessibilityLabel="Add new food item to meal"
              accessibilityRole="button"
            >
              <Text style={[styles.addButton, { color: theme.colors.primary[500] }]}>
                + Add Item
              </Text>
            </TouchableOpacity>
          </View>

          <Spacer size="lg" />

          {/* Image with overlay */}
          <Animated.View
            style={[
              styles.imageContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image source={{ uri: imageUri }} style={styles.mealImage} />
            {analysisData.cuisine_type && (
              <View style={[styles.cuisineTag, { backgroundColor: theme.colors.primary[500] }]}>
                <Text style={styles.cuisineText}>{analysisData.cuisine_type}</Text>
              </View>
            )}
          </Animated.View>

          <Spacer size="xl" />

          {/* Meal Name Input */}
          <Card style={styles.mealNameCard}>
            <TextInput
              style={[styles.mealNameInput, { color: theme.colors.text.primary }]}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Name your meal"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </Card>

          <Spacer size="lg" />

          {/* Total Calories with animated bubbles */}
          <Card style={[styles.caloriesCard, getModernShadow('card')]}>
            <Text style={[styles.caloriesTitle, { color: theme.colors.textSecondary }]}>
              Total Calories
            </Text>
            <Animated.Text
              style={[
                styles.caloriesValue,
                { color: theme.colors.primary[500] },
                isRecalculating && styles.recalculatingValue,
              ]}
            >
              {formatCalories(analysisData.total_calories)}
            </Animated.Text>

            {/* Confidence indicator */}
            <View style={styles.confidenceContainer}>
              <View style={[styles.confidenceDot, { backgroundColor: theme.colors.success[500] }]} />
              <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
                High confidence analysis
              </Text>
            </View>
          </Card>

          <Spacer size="lg" />

          {/* Interactive Macros Bubbles */}
          <Card style={[styles.macrosCard, getModernShadow('card')]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Macronutrients</Text>

            <Spacer size="md" />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bubblesScrollContainer}
              style={styles.bubblesScroll}
            >
              <MacroBubble
                label="Protein"
                value={analysisData.protein}
                color={theme.colors.success[500]}
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroBubble
                label="Carbs"
                value={analysisData.carbs}
                color={theme.colors.secondary[500]}
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroBubble
                label="Fat"
                value={analysisData.fat}
                color={theme.colors.warning[500]}
                theme={theme}
                isAnimating={isRecalculating}
              />
            </ScrollView>

            {/* Additional nutrients */}
            <View style={styles.additionalNutrients}>
              <NutrientRow label="Fiber" value={analysisData.fiber} unit="g" theme={theme} />
              <NutrientRow label="Sugar" value={analysisData.sugar} unit="g" theme={theme} />
              <NutrientRow label="Sodium" value={analysisData.sodium} unit="mg" theme={theme} />
            </View>
          </Card>

          <Spacer size="lg" />

          {/* Interactive Food Items */}
          <Card style={[styles.itemsCard, getModernShadow('card')]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Detected Items ({analysisData.items.length})
            </Text>

            <Spacer size="md" />

            {analysisData.items.map((item, index) => (
              <InteractiveFoodItem
                key={item.id}
                item={item}
                theme={theme}
                onEdit={() => handlePortionEdit(item)}
                onRemove={() => handleItemRemove(item.id)}
                isLast={index === analysisData.items.length - 1}
              />
            ))}
          </Card>

          <Spacer size="lg" />

          {/* Notes */}
          <Card style={styles.notesCard}>
            <Text style={[styles.notesLabel, { color: theme.colors.text.primary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text.primary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this meal..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </Card>

          <Spacer size="xl" />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              onPress={handleSaveMeal}
              variant="primary"
              disabled={isSaving || isRecalculating}
              style={styles.saveButton}
            >
              {isSaving ? 'Saving...' : 'Save Meal'}
            </Button>

            <Spacer size="md" />

            <Button
              onPress={handleRetakePhoto}
              variant="outline"
              style={styles.retakeButton}
            >
              Retake Photo
            </Button>
          </View>

          <Spacer size="xxl" />
        {/* Portion Edit Modal */}
        <Modal
          visible={showPortionModal}
          onClose={() => setShowPortionModal(false)}
          title="Edit Portion"
        >
          {editingItem && (
            <View style={styles.modalContent}>
              <Text style={[styles.modalItemName, { color: theme.colors.text.primary }]}>
                {editingItem.name}
              </Text>

              <Spacer size="lg" />

              <View style={styles.portionInputContainer}>
                <TextInput
                  style={[styles.portionInput, { color: theme.colors.text.primary }]}
                  value={editingItem.quantity.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setEditingItem({ ...editingItem, quantity: num });
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <TextInput
                  style={[styles.unitInput, { color: theme.colors.text.primary }]}
                  value={editingItem.unit}
                  onChangeText={(text) => setEditingItem({ ...editingItem, unit: text })}
                  placeholder="serving"
                />
              </View>

              <Spacer size="lg" />

              <Button onPress={handlePortionUpdate} variant="primary" fullWidth>Update</Button>
            </View>
          )}
        </Modal>

        {/* Add Item Modal */}
        <Modal
          visible={showAddItemModal}
          onClose={() => {
            setShowAddItemModal(false);
            setNewItemName('');
          }}
          title="Add Item"
        >
          <View style={styles.modalContent}>
            <TextInput
              style={[styles.addItemInput, { color: theme.colors.text.primary }]}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Enter food item name"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />

            <Spacer size="lg" />

            <Button
              onPress={handleAddItem}
              variant="primary"
              fullWidth
              disabled={!newItemName.trim()}
            >
              Add
            </Button>
          </View>
        </Modal>

        {/* Recalculating Overlay */}
        {isRecalculating && (
          <View style={styles.recalculatingOverlay}>
            <LoadingOverlay visible={true} message="Recalculating nutrition..." />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaContainer>
  );
};

// Interactive Macro Bubble Component
interface MacroBubbleProps {
  label: string;
  value: number;
  color: string;
  theme: any;
  isAnimating: boolean;
}

const MacroBubble: React.FC<MacroBubbleProps> = ({ label, value, color, theme, isAnimating }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Simple pulse animation when recalculating
  useEffect(() => {
    if (isAnimating) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAnimating]);

  return (
    <Animated.View 
      style={[
        styles.macroBubble, 
        { 
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={[styles.macroBubbleInner, { backgroundColor: color + '15' }]}>
        <View style={[styles.macroIndicator, { backgroundColor: color }]} />
        <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>{formatMacros(value)}</Text>
        <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
    </Animated.View>
  );
};

// Nutrient Row Component
interface NutrientRowProps {
  label: string;
  value: number;
  unit: string;
  theme: any;
}

const NutrientRow: React.FC<NutrientRowProps> = ({ label, value, unit, theme }) => (
  <View style={styles.nutrientRow}>
    <Text style={[styles.nutrientLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.nutrientValue, { color: theme.colors.text.primary }]}>
      {value}
      {unit}
    </Text>
  </View>
);

// Interactive Food Item Component
interface InteractiveFoodItemProps {
  item: FoodItem;
  theme: any;
  onEdit: () => void;
  onRemove: () => void;
  isLast: boolean;
}

const InteractiveFoodItem: React.FC<InteractiveFoodItemProps> = ({
  item,
  theme,
  onEdit,
  onRemove,
  isLast,
}) => {
  return (
    <View style={styles.foodItemContainer}>
      <TouchableOpacity 
        style={styles.foodItemTouchable} 
        onPress={onEdit} 
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`Edit ${item.name}, ${item.quantity} ${item.unit}, ${formatCalories(item.calories)}`}
        accessibilityRole="button"
      >
        <View style={styles.foodItemContent}>
          <View style={styles.foodItemHeader}>
            <Text style={[styles.foodItemName, { color: theme.colors.text.primary }]}>{item.name}</Text>
            {item.confidence && item.confidence > 0.8 && (
              <View style={[styles.confidenceBadge, { backgroundColor: theme.colors.success[500] }]}>
                <Text style={styles.confidenceBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={[styles.foodItemPortion, { color: theme.colors.textSecondary }]}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={[styles.foodItemMacros, { color: theme.colors.textSecondary }]}>
            P: {formatMacros(item.protein)} • C: {formatMacros(item.carbs)} • F:{' '}
            {formatMacros(item.fat)}
          </Text>
        </View>
        <View style={styles.foodItemRight}>
          <Text style={[styles.foodItemCalories, { color: theme.colors.primary[500] }]}>
            {formatCalories(item.calories)}
          </Text>
          <Row gap={8}>
            <TouchableOpacity 
              onPress={onEdit} 
              style={styles.actionButton}
              accessible={true}
              accessibilityLabel={`Edit ${item.name} portion`}
              accessibilityRole="button"
            >
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onRemove} 
              style={[styles.actionButton, { backgroundColor: theme.colors.error[100] }]}
              accessible={true}
              accessibilityLabel={`Remove ${item.name} from meal`}
              accessibilityRole="button"
            >
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          </Row>
        </View>
      </TouchableOpacity>

      {!isLast && (
        <View style={[styles.itemDivider, { backgroundColor: theme.colors.borderLight }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: rs.large,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingImage: {
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: 12,
  },
  loadingTip: {
    fontSize: fontScale(14),
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  addButton: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
  },
  mealImage: {
    width: '100%',
    height: moderateScale(200),
    borderRadius: 12,
  },
  cuisineTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cuisineText: {
    color: '#fff',
    fontSize: fontScale(12),
    fontWeight: '600',
  },
  mealNameCard: {
    padding: 16,
  },
  mealNameInput: {
    fontSize: fontScale(20),
    fontWeight: '600',
    textAlign: 'center',
  },
  caloriesCard: {
    padding: 24,
    alignItems: 'center',
  },
  caloriesTitle: {
    fontSize: fontScale(16),
  },
  caloriesValue: {
    fontSize: fontScale(48),
    fontWeight: 'bold',
    marginTop: rs.small,
  },
  recalculatingValue: {
    opacity: 0.5,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rs.medium,
  },
  confidenceDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: 4,
    marginRight: rs.small,
  },
  confidenceText: {
    fontSize: fontScale(12),
  },
  macrosCard: {
    padding: rs.large,
    marginHorizontal: layout.containerPadding,
  },
  sectionTitle: {
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  bubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: rs.large,
  },
  macroBubble: {
    alignItems: 'center',
    position: 'relative',
  },
  macroBubbleInner: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: fontScale(20),
    fontWeight: '600',
  },
  macroLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  additionalNutrients: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  nutrientLabel: {
    fontSize: 14,
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemsCard: {
    padding: 20,
  },
  foodItemContainer: {
    marginVertical: 4,
  },
  foodItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodItemContent: {
    flex: 1,
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodItemName: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  confidenceBadge: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadgeText: {
    color: '#fff',
    fontSize: fontScale(12),
    fontWeight: 'bold',
  },
  foodItemPortion: {
    fontSize: 14,
    marginTop: 2,
  },
  foodItemMacros: {
    fontSize: 14,
    marginTop: 2,
  },
  foodItemRight: {
    alignItems: 'flex-end',
  },
  foodItemCalories: {
    fontSize: fontScale(16),
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: fontScale(16),
  },
  itemDivider: {
    height: 1,
    marginTop: rs.small,
  },
  notesCard: {
    padding: 16,
  },
  notesLabel: {
    fontSize: fontScale(16),
    fontWeight: '500',
    marginBottom: 8,
  },
  notesInput: {
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
  retakeButton: {
    width: '100%',
  },
  modalContent: {
    padding: 20,
  },
  modalItemName: {
    fontSize: fontScale(18),
    fontWeight: '600',
    textAlign: 'center',
  },
  portionInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  portionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: fontScale(16),
    textAlign: 'center',
  },
  unitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: fontScale(16),
    textAlign: 'center',
  },
  addItemInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: fontScale(16),
  },
  recalculatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubblesScrollContainer: {
    paddingHorizontal: rs.medium,
    gap: rs.small,
  },
  bubblesScroll: {
    flexGrow: 0,
    marginVertical: rs.medium,
  },
});
