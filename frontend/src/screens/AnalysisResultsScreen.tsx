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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaContainer, Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { LoadingOverlay, Spinner } from '@/components/base/Loading';
import { Ionicons } from '@/components/IconFallback';
import { GradientIcon } from '@/components/icons/GradientIcon';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import { useAuthStore } from '@/store/authStore';
import { MainStackParamList } from '@/navigation/types';
import { formatCalories, formatMacros } from '@/utils/formatting';
import { LOADING_MESSAGES } from '@/constants';
import {
  rs,
  rTouchTarget,
  scale,
  moderateScale,
  layout,
  dimensions,
  fontScale,
} from '@/utils/responsive';
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

// Generate realistic mock analysis data for demo/offline mode
const generateMockAnalysisData = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): AnalysisData => {
  const mockData = {
    breakfast: {
      total_calories: 380,
      protein: 15,
      carbs: 45,
      fat: 12,
      fiber: 6,
      sugar: 18,
      sodium: 320,
      items: [
        {
          id: 'item-0',
          name: 'Scrambled Eggs',
          calories: 180,
          protein: 12,
          carbs: 2,
          fat: 12,
          fiber: 0,
          sugar: 1,
          sodium: 180,
          quantity: 2,
          unit: 'large eggs',
          confidence: 0.85,
        },
        {
          id: 'item-1', 
          name: 'Whole Wheat Toast',
          calories: 140,
          protein: 4,
          carbs: 28,
          fat: 2,
          fiber: 4,
          sugar: 2,
          sodium: 170,
          quantity: 2,
          unit: 'slices',
          confidence: 0.90,
        },
        {
          id: 'item-2',
          name: 'Orange Juice',
          calories: 60,
          protein: 1,
          carbs: 15,
          fat: 0,
          fiber: 0,
          sugar: 12,
          sodium: 2,
          quantity: 4,
          unit: 'fl oz',
          confidence: 0.75,
        },
      ],
      cuisine_type: 'American',
    },
    lunch: {
      total_calories: 520,
      protein: 28,
      carbs: 58,
      fat: 18,
      fiber: 8,
      sugar: 12,
      sodium: 680,
      items: [
        {
          id: 'item-0',
          name: 'Grilled Chicken Breast',
          calories: 185,
          protein: 35,
          carbs: 0,
          fat: 4,
          fiber: 0,
          sugar: 0,
          sodium: 74,
          quantity: 3,
          unit: 'oz',
          confidence: 0.88,
        },
        {
          id: 'item-1',
          name: 'Brown Rice',
          calories: 110,
          protein: 3,
          carbs: 23,
          fat: 1,
          fiber: 2,
          sugar: 0,
          sodium: 5,
          quantity: 0.5,
          unit: 'cup',
          confidence: 0.82,
        },
        {
          id: 'item-2',
          name: 'Mixed Vegetables',
          calories: 80,
          protein: 3,
          carbs: 18,
          fat: 0,
          fiber: 6,
          sugar: 8,
          sodium: 45,
          quantity: 1,
          unit: 'cup',
          confidence: 0.75,
        },
      ],
      cuisine_type: 'Mediterranean',
    },
    dinner: {
      total_calories: 650,
      protein: 35,
      carbs: 65,
      fat: 22,
      fiber: 9,
      sugar: 15,
      sodium: 890,
      items: [
        {
          id: 'item-0',
          name: 'Salmon Fillet',
          calories: 280,
          protein: 25,
          carbs: 0,
          fat: 20,
          fiber: 0,
          sugar: 0,
          sodium: 50,
          quantity: 4,
          unit: 'oz',
          confidence: 0.90,
        },
        {
          id: 'item-1',
          name: 'Quinoa',
          calories: 160,
          protein: 6,
          carbs: 30,
          fat: 2,
          fiber: 5,
          sugar: 1,
          sodium: 13,
          quantity: 0.75,
          unit: 'cup',
          confidence: 0.80,
        },
        {
          id: 'item-2',
          name: 'Roasted Asparagus',
          calories: 40,
          protein: 4,
          carbs: 8,
          fat: 0,
          fiber: 4,
          sugar: 4,
          sodium: 13,
          quantity: 6,
          unit: 'spears',
          confidence: 0.85,
        },
      ],
      cuisine_type: 'Modern American',
    },
    snack: {
      total_calories: 250,
      protein: 8,
      carbs: 32,
      fat: 9,
      fiber: 7,
      sugar: 16,
      sodium: 140,
      items: [
        {
          id: 'item-0',
          name: 'Greek Yogurt',
          calories: 130,
          protein: 15,
          carbs: 9,
          fat: 0,
          fiber: 0,
          sugar: 9,
          sodium: 65,
          quantity: 1,
          unit: 'cup',
          confidence: 0.88,
        },
        {
          id: 'item-1',
          name: 'Mixed Berries',
          calories: 80,
          protein: 1,
          carbs: 20,
          fat: 0,
          fiber: 7,
          sugar: 12,
          sodium: 2,
          quantity: 0.75,
          unit: 'cup',
          confidence: 0.75,
        },
        {
          id: 'item-2',
          name: 'Granola',
          calories: 40,
          protein: 1,
          carbs: 8,
          fat: 1,
          fiber: 1,
          sugar: 3,
          sodium: 15,
          quantity: 2,
          unit: 'tbsp',
          confidence: 0.70,
        },
      ],
      cuisine_type: 'Healthy',
    },
  };

  const data = mockData[mealType];
  return {
    ...data,
    meal_type: mealType,
  };
};

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
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
    setAnalysisError(null);

    try {
      // Log analysis start
      if (__DEV__) {
        console.log('🔍 [AI ANALYSIS] Starting image analysis...');
        console.log('📸 [AI ANALYSIS] Image URI:', imageUri);
        console.log('👤 [AI ANALYSIS] User type:', user?.id === 'demo-user' ? 'Demo' : 'Regular');
      }

      // Always try actual API call first, even for demo users
      try {
        // Convert image URI to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64 = reader.result?.toString().split(',')[1];

          if (base64) {
            if (__DEV__) {
              console.log('🎯 [AI ANALYSIS] Calling AI API...');
              console.log('📊 [AI ANALYSIS] Image size:', base64.length, 'chars');
            }
            
            // Call AI analysis API
            const result = await aiApi.analyzeImage({
              image: base64,
              imageUri: imageUri,
              metadata: {
                mealType: getMealType(),
              },
            });
            
            if (__DEV__) {
              console.log('✅ [AI ANALYSIS] API Response received:', result);
            }

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
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        
        // If network error, use enhanced demo/offline mode with realistic data
        if (apiError.message?.includes('Network') || apiError.message?.includes('Failed to fetch')) {
          const mockAnalysisData = generateMockAnalysisData(getMealType());
          
          setAnalysisData(mockAnalysisData);
          setMealName(mockAnalysisData.meal_type === 'breakfast' ? 'Morning Meal' 
                      : mockAnalysisData.meal_type === 'lunch' ? 'Lunch Bowl'
                      : mockAnalysisData.meal_type === 'dinner' ? 'Dinner Plate'
                      : 'Healthy Snack');
          
          if (user?.id === 'demo-user') {
            // For demo users, show a more positive message
            Alert.alert(
              'Demo Analysis Complete!',
              'This is a sample analysis result. In the full version, our AI would analyze your actual food photo.',
              [{ text: 'Got it!' }]
            );
          } else {
            Alert.alert(
              'Offline Mode',
              'Unable to connect to the server. Using estimated nutritional values based on common foods. You can edit them manually.',
              [{ text: 'OK' }]
            );
          }
          
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
        } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
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
          order: index,
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

  // Show error state if analysis failed
  if (analysisError && !analysisData) {
    return (
      <SafeAreaContainer style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Image source={{ uri: imageUri }} style={styles.errorImage} />
          <Spacer size="xl" />
          
          <View style={styles.errorContent}>
            <GradientIcon 
              name="alert-circle" 
              size={64} 
              colors={[theme.colors.error[400], theme.colors.error[600]]} 
            />
            <Spacer size="lg" />
            
            <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
              Analysis Failed
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.text.secondary }]}>
              {analysisError.includes('Network') || analysisError.includes('Failed to fetch')
                ? 'Unable to connect to the server. Please check your internet connection and try again.'
                : 'Something went wrong while analyzing your image. Please try again.'}
            </Text>
            
            <Spacer size="xl" />
            
            <View style={styles.errorActions}>
              <Button
                title="Try Again"
                onPress={() => {
                  setAnalysisError(null);
                  analyzeImage();
                }}
                variant="primary"
                style={styles.errorButton}
              />
              <Spacer size="md" />
              <Button
                title="Go Back"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.errorButton}
              />
            </View>
          </View>
        </View>
      </SafeAreaContainer>
    );
  }

  // If still loading or no data, return null (this should be rare)
  if (!analysisData) {
    return (
      <SafeAreaContainer style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
            Preparing analysis...
          </Text>
        </View>
      </SafeAreaContainer>
    );
  }

  return (
    <SafeAreaContainer style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[theme.colors.primary[500], theme.colors.primary[600]]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTabs')}
              style={styles.headerButton}
              accessible={true}
              accessibilityLabel="Go back to home screen"
              accessibilityRole="button"
            >
              <GradientIcon name="arrow-back" size={24} colors={['white', 'rgba(255,255,255,0.9)']} />
              <Text style={styles.headerButtonText}>Home</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Analysis Results</Text>

            <TouchableOpacity
              onPress={() => setShowAddItemModal(true)}
              style={styles.headerButton}
              accessible={true}
              accessibilityLabel="Add new food item to meal"
              accessibilityRole="button"
            >
              <GradientIcon name="add" size={24} colors={['white', 'rgba(255,255,255,0.9)']} />
              <Text style={styles.headerButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section with Image and Quick Stats */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.mealImage} />
              {analysisData.cuisine_type && (
                <View style={[styles.cuisineTag, { backgroundColor: theme.colors.primary[500] }]}>
                  <Text style={styles.cuisineText}>{analysisData.cuisine_type}</Text>
                </View>
              )}
              <View style={styles.confidenceOverlay}>
                <View style={[styles.confidenceBadge, { backgroundColor: theme.colors.success[500] }]}>
                  <GradientIcon name="checkmark" size={16} colors={['white', 'rgba(255,255,255,0.8)']} />
                  <Text style={styles.confidenceBadgeText}>High Confidence</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Cards */}
            <View style={styles.quickStatsContainer}>
              <View style={[styles.quickStatCard, { backgroundColor: theme.colors.primary[50] }]}>
                <Text style={[styles.quickStatValue, { color: theme.colors.primary[600] }]}>
                  {formatCalories(analysisData.total_calories)}
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.colors.primary[500] }]}>
                  Calories
                </Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: theme.colors.primary[50] }]}>
                <Text style={[styles.quickStatValue, { color: theme.colors.primary[600] }]}>
                  {analysisData.items.length}
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.colors.primary[500] }]}>
                  Items
                </Text>
              </View>
              <View style={[styles.quickStatCard, { backgroundColor: theme.colors.primary[50] }]}>
                <Text style={[styles.quickStatValue, { color: theme.colors.primary[600] }]}>
                  {formatMacros(analysisData.protein)}g
                </Text>
                <Text style={[styles.quickStatLabel, { color: theme.colors.primary[500] }]}>
                  Protein
                </Text>
              </View>
            </View>
          </Animated.View>

          <Spacer size="lg" />

          {/* Meal Name Section */}
          <Card style={styles.mealNameCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Meal Name
            </Text>
            <TextInput
              style={[styles.mealNameInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
              value={mealName}
              onChangeText={setMealName}
              placeholder="Name your meal"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </Card>

          <Spacer size="lg" />

          {/* Enhanced Macronutrients Section */}
          <Card style={styles.macrosCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Macronutrients
            </Text>
            <Spacer size="md" />
            
            <View style={styles.macrosGrid}>
              <MacroCard
                label="Protein"
                value={analysisData.protein}
                color={theme.colors.primary[500]}
                icon="💪"
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroCard
                label="Carbs"
                value={analysisData.carbs}
                color={theme.colors.primary[400]}
                icon="🌾"
                theme={theme}
                isAnimating={isRecalculating}
              />
              <MacroCard
                label="Fat"
                value={analysisData.fat}
                color={theme.colors.primary[600]}
                icon="🥑"
                theme={theme}
                isAnimating={isRecalculating}
              />
            </View>

            <Spacer size="lg" />
            
            {/* Additional Nutrients */}
            <View style={[styles.additionalNutrients, { borderTopColor: theme.colors.border }]}>
              <NutrientRow label="Fiber" value={analysisData.fiber} unit="g" theme={theme} />
              <NutrientRow label="Sugar" value={analysisData.sugar} unit="g" theme={theme} />
              <NutrientRow label="Sodium" value={analysisData.sodium} unit="mg" theme={theme} />
            </View>
          </Card>

          <Spacer size="lg" />

          {/* Enhanced Food Items Section */}
          <Card style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Detected Items
              </Text>
              <View style={[styles.itemsCountBadge, { backgroundColor: theme.colors.primary[100] }]}>
                <Text style={[styles.itemsCountText, { color: theme.colors.primary[600] }]}>
                  {analysisData.items.length}
                </Text>
              </View>
            </View>

            <Spacer size="md" />

            {analysisData.items.map((item, index) => (
              <ModernFoodItem
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

          {/* Notes Section */}
          <Card style={styles.notesCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Notes (Optional)
            </Text>
            <Spacer size="sm" />
            <TextInput
              style={[styles.notesInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this meal..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </Card>

          <Spacer size="xl" />

          {/* Enhanced Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              onPress={handleSaveMeal}
              variant="primary"
              size="large"
              fullWidth
              disabled={isSaving || isRecalculating}
              loading={isSaving}
              style={styles.saveButton}
              leftIcon={<GradientIcon name="checkmark" size={20} colors={['white', 'rgba(255,255,255,0.9)']} />}
            >
              {isSaving ? 'Saving Meal...' : 'Save Meal'}
            </Button>

            <Spacer size="md" />

            <View style={styles.secondaryActions}>
              <Button
                onPress={handleRetakePhoto}
                variant="outline"
                size="large"
                style={styles.secondaryButton}
                leftIcon={<Ionicons name="camera" size={18} color={theme.colors.primary[500]} />}
              >
                Retake Photo
              </Button>
              
              <Button
                onPress={() => setShowAddItemModal(true)}
                variant="ghost"
                size="large"
                style={styles.secondaryButton}
                leftIcon={<Ionicons name="add" size={18} color={theme.colors.primary[500]} />}
              >
                Add Item
              </Button>
            </View>
          </View>

          <Spacer size="xxl" />
        </ScrollView>

        {/* Modals and Overlays */}
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
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Quantity</Text>
                  <TextInput
                    style={[styles.portionInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                    value={editingItem.quantity.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setEditingItem({ ...editingItem, quantity: num });
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Unit</Text>
                  <TextInput
                    style={[styles.portionInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
                    value={editingItem.unit}
                    onChangeText={(text) => setEditingItem({ ...editingItem, unit: text })}
                    placeholder="serving"
                  />
                </View>
              </View>
              <Spacer size="lg" />
              <Button onPress={handlePortionUpdate} variant="primary" fullWidth size="large">
                Update Portion
              </Button>
            </View>
          )}
        </Modal>

        <Modal
          visible={showAddItemModal}
          onClose={() => {
            setShowAddItemModal(false);
            setNewItemName('');
          }}
          title="Add New Item"
        >
          <View style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Item Name</Text>
            <TextInput
              style={[styles.addItemInput, { color: theme.colors.text.primary, borderColor: theme.colors.border }]}
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
              size="large"
              disabled={!newItemName.trim()}
            >
              Add Item
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

// Enhanced Macro Card Component
interface MacroCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  theme: any;
  isAnimating: boolean;
}

const MacroCard: React.FC<MacroCardProps> = ({ label, value, color, icon, theme, isAnimating }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnimating) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
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
        styles.macroCard,
        { backgroundColor: color + '10', transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.macroIcon}>{icon}</Text>
      <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
        {formatMacros(value)}g
      </Text>
      <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={[styles.macroIndicator, { backgroundColor: color }]} />
    </Animated.View>
  );
};

// Enhanced Nutrient Row Component
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
      {value}{unit}
    </Text>
  </View>
);

// Modern Food Item Component
interface ModernFoodItemProps {
  item: FoodItem;
  theme: any;
  onEdit: () => void;
  onRemove: () => void;
  isLast: boolean;
}

const ModernFoodItem: React.FC<ModernFoodItemProps> = ({
  item,
  theme,
  onEdit,
  onRemove,
  isLast,
}) => {
  return (
    <View style={styles.foodItemContainer}>
      <View style={[styles.foodItemCard, { backgroundColor: theme.colors.background }]}>
        <View style={styles.foodItemHeader}>
          <View style={styles.foodItemInfo}>
            <Text style={[styles.foodItemName, { color: theme.colors.text.primary }]}>
              {item.name}
            </Text>
            <Text style={[styles.foodItemPortion, { color: theme.colors.textSecondary }]}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.foodItemCaloriesContainer}>
            <Text style={[styles.foodItemCalories, { color: theme.colors.primary[600] }]}>
              {formatCalories(item.calories)}
            </Text>
            {item.confidence && item.confidence > 0.8 && (
              <View style={[styles.confidenceIndicator, { backgroundColor: theme.colors.success[500] }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.foodItemMacros}>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, { color: theme.colors.textSecondary }]}>
              P: {formatMacros(item.protein)}g
            </Text>
          </View>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, { color: theme.colors.textSecondary }]}>
              C: {formatMacros(item.carbs)}g
            </Text>
          </View>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, { color: theme.colors.textSecondary }]}>
              F: {formatMacros(item.fat)}g
            </Text>
          </View>
        </View>

        <View style={styles.foodItemActions}>
          <TouchableOpacity
            onPress={onEdit}
            style={[styles.modernActionButton, { backgroundColor: theme.colors.primary[100] }]}
            accessible={true}
            accessibilityLabel={`Edit ${item.name} portion`}
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={16} color={theme.colors.primary[600]} />
            <Text style={[styles.actionButtonText, { color: theme.colors.primary[600] }]}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onRemove}
            style={[styles.modernActionButton, { backgroundColor: theme.colors.error[100] }]}
            accessible={true}
            accessibilityLabel={`Remove ${item.name} from meal`}
            accessibilityRole="button"
          >
            <Ionicons name="trash" size={16} color={theme.colors.error[600]} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error[600] }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isLast && (
        <View style={[styles.itemDivider, { backgroundColor: theme.colors.borderLight }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingImage: {
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: 16,
  },
  loadingTip: {
    fontSize: fontScale(14),
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginTop: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  mealImage: {
    width: '100%',
    height: moderateScale(220),
    borderRadius: 20,
  },
  cuisineTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cuisineText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  mealNameCard: {
    padding: 20,
  },
  mealNameInput: {
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  macrosCard: {
    padding: 20,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    position: 'relative',
  },
  macroIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  macroIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  additionalNutrients: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsCard: {
    padding: 20,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  foodItemContainer: {
    marginVertical: 6,
  },
  foodItemCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  foodItemPortion: {
    fontSize: 14,
    fontWeight: '500',
  },
  foodItemCaloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodItemCalories: {
    fontSize: 16,
    fontWeight: '700',
  },
  confidenceIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  foodItemMacros: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  macroChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
  },
  macroChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  foodItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modernActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemDivider: {
    height: 1,
    marginTop: 12,
  },
  notesCard: {
    padding: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  actionsContainer: {
    width: '100%',
  },
  saveButton: {
    borderRadius: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
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
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  portionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  addItemInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 6,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorImage: {
    width: screenWidth * 0.6,
    height: screenWidth * 0.4,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorActions: {
    width: '100%',
  },
  errorButton: {
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});