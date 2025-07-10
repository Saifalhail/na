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
  Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { Loading } from '@/components/base/Loading';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import { useAuthStore } from '@/store/authStore';
import { MainStackParamList } from '@/navigation/types';
import { formatCalories, formatMacros } from '@/utils/formatting';
import { LOADING_MESSAGES } from '@/constants';
import { aiApi } from '@/services/api/endpoints/ai';

type AnalysisResultsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'AnalysisResults'>;
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
            context: {
              meal_type: getMealType(),
              user_preferences: user?.dietary_restrictions || [],
            }
          });
          
          // Transform API response to our format
          const transformedData: AnalysisData = {
            total_calories: result.total_calories,
            protein: result.macronutrients.protein,
            carbs: result.macronutrients.carbohydrates,
            fat: result.macronutrients.fat,
            fiber: result.macronutrients.fiber || 0,
            sugar: result.macronutrients.sugar || 0,
            sodium: result.micronutrients?.sodium || 0,
            items: result.items.map((item: any, index: number) => ({
              id: `item-${index}`,
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbohydrates,
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
      Alert.alert(
        'Analysis Failed',
        'Unable to analyze the image. Please try again.',
        [
          { text: 'Retry', onPress: analyzeImage },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMealType = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 21) return 'dinner';
    return 'snack';
  };

  const generateMealName = (data: AnalysisData) => {
    const mainItems = data.items.slice(0, 2).map(item => item.name).join(' & ');
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
      const updatedItems = analysisData.items.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
      
      // Call recalculation API
      const result = await aiApi.recalculateNutrition({
        items: updatedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      
      // Update analysis data
      const newData: AnalysisData = {
        ...analysisData,
        total_calories: result.total_calories,
        protein: result.macronutrients.protein,
        carbs: result.macronutrients.carbohydrates,
        fat: result.macronutrients.fat,
        fiber: result.macronutrients.fiber || 0,
        sugar: result.macronutrients.sugar || 0,
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
    
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = analysisData.items.filter(item => item.id !== itemId);
            
            if (updatedItems.length === 0) {
              Alert.alert('Cannot Remove', 'You must have at least one item in your meal.');
              return;
            }
            
            setIsRecalculating(true);
            
            try {
              // Recalculate totals
              const newTotals = updatedItems.reduce((acc, item) => ({
                total_calories: acc.total_calories + item.calories,
                protein: acc.protein + item.protein,
                carbs: acc.carbs + item.carbs,
                fat: acc.fat + item.fat,
                fiber: acc.fiber + (item.fiber || 0),
                sugar: acc.sugar + (item.sugar || 0),
                sodium: acc.sodium + (item.sodium || 0),
              }), {
                total_calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
              });
              
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
      ]
    );
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
          ...analysisData.items.map(item => ({
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
        calories: Math.round(result.total_calories - analysisData.total_calories),
        protein: Math.round(result.macronutrients.protein - analysisData.protein),
        carbs: Math.round(result.macronutrients.carbohydrates - analysisData.carbs),
        fat: Math.round(result.macronutrients.fat - analysisData.fat),
        quantity: 1,
        unit: 'serving',
      };
      
      setAnalysisData({
        ...analysisData,
        total_calories: result.total_calories,
        protein: result.macronutrients.protein,
        carbs: result.macronutrients.carbohydrates,
        fat: result.macronutrients.fat,
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
        meal_type: analysisData.meal_type || getMealType(),
        calories: analysisData.total_calories,
        protein: analysisData.protein,
        carbs: analysisData.carbs,
        fat: analysisData.fat,
        fiber: analysisData.fiber,
        sugar: analysisData.sugar,
        sodium: analysisData.sodium,
        image_url: imageUri,
        items: analysisData.items,
        notes: notes,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Success', 'Meal saved successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('HomeTabs') }
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
          <Loading message={LOADING_MESSAGES.ANALYZING_IMAGE} />
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
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('HomeTabs')}>
              <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>
                ← Home
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowAddItemModal(true)}>
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
              style={[styles.mealNameInput, { color: theme.colors.text }]}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Name your meal"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </Card>

          <Spacer size="lg" />

          {/* Total Calories with animated bubbles */}
          <Card style={styles.caloriesCard}>
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
              <View style={[styles.confidenceDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
                High confidence analysis
              </Text>
            </View>
          </Card>

          <Spacer size="lg" />

          {/* Interactive Macros Bubbles */}
          <Card style={styles.macrosCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Macronutrients
            </Text>
            
            <Spacer size="md" />
            
            <View style={styles.bubblesContainer}>
              <MacroBubble
                label="Protein"
                value={analysisData.protein}
                color="#4ECDC4"
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroBubble
                label="Carbs"
                value={analysisData.carbs}
                color="#45B7D1"
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroBubble
                label="Fat"
                value={analysisData.fat}
                color="#F7DC6F"
                theme={theme}
                isAnimating={isRecalculating}
              />
            </View>
            
            {/* Additional nutrients */}
            <View style={styles.additionalNutrients}>
              <NutrientRow label="Fiber" value={analysisData.fiber} unit="g" theme={theme} />
              <NutrientRow label="Sugar" value={analysisData.sugar} unit="g" theme={theme} />
              <NutrientRow label="Sodium" value={analysisData.sodium} unit="mg" theme={theme} />
            </View>
          </Card>

          <Spacer size="lg" />

          {/* Interactive Food Items */}
          <Card style={styles.itemsCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
            <Text style={[styles.notesLabel, { color: theme.colors.text }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text }]}
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
              title={isSaving ? "Saving..." : "Save Meal"}
              onPress={handleSaveMeal}
              variant="primary"
              disabled={isSaving || isRecalculating}
              style={styles.saveButton}
            />
            
            <Spacer size="md" />
            
            <Button
              title="Retake Photo"
              onPress={handleRetakePhoto}
              variant="outline"
              style={styles.retakeButton}
            />
          </View>

          <Spacer size="xxl" />
        </ScrollView>

        {/* Portion Edit Modal */}
        <Modal
          visible={showPortionModal}
          onClose={() => setShowPortionModal(false)}
          title="Edit Portion"
        >
          {editingItem && (
            <View style={styles.modalContent}>
              <Text style={[styles.modalItemName, { color: theme.colors.text }]}>
                {editingItem.name}
              </Text>
              
              <Spacer size="lg" />
              
              <View style={styles.portionInputContainer}>
                <TextInput
                  style={[styles.portionInput, { color: theme.colors.text }]}
                  value={editingItem.quantity.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setEditingItem({ ...editingItem, quantity: num });
                  }}
                  keyboardType="numeric"
                  placeholder="1"
                />
                <TextInput
                  style={[styles.unitInput, { color: theme.colors.text }]}
                  value={editingItem.unit}
                  onChangeText={(text) => setEditingItem({ ...editingItem, unit: text })}
                  placeholder="serving"
                />
              </View>
              
              <Spacer size="lg" />
              
              <Button
                title="Update"
                onPress={handlePortionUpdate}
                variant="primary"
                fullWidth
              />
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
              style={[styles.addItemInput, { color: theme.colors.text }]}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Enter food item name"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            
            <Spacer size="lg" />
            
            <Button
              title="Add"
              onPress={handleAddItem}
              variant="primary"
              fullWidth
              disabled={!newItemName.trim()}
            />
          </View>
        </Modal>

        {/* Recalculating Overlay */}
        {isRecalculating && (
          <View style={styles.recalculatingOverlay}>
            <Loading message="Recalculating nutrition..." />
          </View>
        )}
      </Container>
    </KeyboardAvoidingView>
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
  
  useEffect(() => {
    if (isAnimating) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAnimating]);
  
  return (
    <Animated.View 
      style={[
        styles.macroBubble,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.macroBubbleInner, { backgroundColor: color + '20' }]}>
        <View style={[styles.macroIndicator, { backgroundColor: color }]} />
        <Text style={[styles.macroValue, { color: theme.colors.text }]}>
          {formatMacros(value)}
        </Text>
        <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
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
    <Text style={[styles.nutrientLabel, { color: theme.colors.textSecondary }]}>
      {label}
    </Text>
    <Text style={[styles.nutrientValue, { color: theme.colors.text }]}>
      {value}{unit}
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
  isLast 
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
  return (
    <View style={styles.foodItemContainer}>
      <Animated.View
        style={[
          styles.foodItem,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.foodItemTouchable}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          <View style={styles.foodItemContent}>
            <View style={styles.foodItemHeader}>
              <Text style={[styles.foodItemName, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              {item.confidence && item.confidence > 0.8 && (
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceBadgeText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.foodItemPortion, { color: theme.colors.textSecondary }]}>
              {item.quantity} {item.unit}
            </Text>
            <Text style={[styles.foodItemMacros, { color: theme.colors.textSecondary }]}>
              P: {formatMacros(item.protein)} • C: {formatMacros(item.carbs)} • F: {formatMacros(item.fat)}
            </Text>
          </View>
          <View style={styles.foodItemRight}>
            <Text style={[styles.foodItemCalories, { color: theme.colors.primary[500] }]}>
              {formatCalories(item.calories)}
            </Text>
            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={onRemove}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  loadingTip: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
  },
  mealImage: {
    width: '100%',
    height: 200,
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
    fontSize: 12,
    fontWeight: '600',
  },
  mealNameCard: {
    padding: 16,
  },
  mealNameInput: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  caloriesCard: {
    padding: 24,
    alignItems: 'center',
  },
  caloriesTitle: {
    fontSize: 16,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 8,
  },
  recalculatingValue: {
    opacity: 0.5,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
  },
  macrosCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  macroBubble: {
    alignItems: 'center',
  },
  macroBubbleInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 20,
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
    position: 'relative',
    marginVertical: 4,
  },
  foodItem: {
    backgroundColor: '#fff',
    zIndex: 1,
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
    fontSize: 16,
    fontWeight: '500',
  },
  confidenceBadge: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceBadgeText: {
    color: '#fff',
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    marginTop: 4,
    padding: 4,
  },
  editIcon: {
    fontSize: 16,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
  },
  itemDivider: {
    height: 1,
    marginTop: 8,
  },
  notesCard: {
    padding: 16,
  },
  notesLabel: {
    fontSize: 16,
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
    fontSize: 18,
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
    fontSize: 16,
    textAlign: 'center',
  },
  unitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  addItemInput: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
});