import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { Card } from '@/components/base/Card';
import { GlassCard } from '@/components/base/GlassCard';
import { Button } from '@/components/base/Button';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { ProgressRing } from '@/components/base/ProgressRing';
import { Avatar } from '@/components/base/Avatar';
import { HeaderLogo } from '@/components/base/HeaderLogo';
import { GradientIcon } from '@/components/icons/GradientIcon';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useMealStore, useMealSelectors } from '@/store/mealStore';
import { usePerformanceMonitor } from '@/utils/performance';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { HomeTabParamList, MainStackParamList } from '@/navigation/types';
import { formatCalories, formatDate } from '@/utils/formatting';
import { APP_CONFIG } from '@/constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@/components/IconFallback';
import { staticStyles, createDynamicStyles, mealCardStyles } from './HomeScreen.styles';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<HomeTabParamList, 'Home'>,
  StackNavigationProp<MainStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = React.memo(({ navigation }) => {
  usePerformanceMonitor('HomeScreen');

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useUserStore();
  const { todayStats } = useMealStore();
  const { todaysMeals, todaysNutrition } = useMealSelectors();

  // Memoize progress values to prevent recalculation on every render
  const progressValues = useMemo(() => {
    const calorieGoal = profile?.dailyCalorieGoal || 2000;
    const calorieProgress = Math.round(
      Math.min(((todayStats?.calories || 0) / calorieGoal) * 100, 100)
    );
    const proteinGoal = profile?.dailyProteinGoal || 50;
    const proteinProgress = Math.round(
      Math.min(((todaysNutrition?.protein || 0) / proteinGoal) * 100, 100)
    );
    const carbsGoal = profile?.dailyCarbsGoal || 250;
    const carbsProgress = Math.round(
      Math.min(((todaysNutrition?.carbs || 0) / carbsGoal) * 100, 100)
    );
    const fatGoal = profile?.dailyFatGoal || 65;
    const fatProgress = Math.round(Math.min(((todaysNutrition?.fat || 0) / fatGoal) * 100, 100));

    return { calorieProgress, proteinProgress, carbsProgress, fatProgress, calorieGoal };
  }, [profile, todayStats, todaysNutrition]);

  // Calculate streak (mock data for now)
  const [streak, setStreak] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  // Memoize navigation handlers
  const handleCameraPress = useCallback(() => {
    navigation.navigate('Camera');
  }, [navigation]);

  const handleProfilePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Profile');
  }, [navigation]);

  const handleViewHistory = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const handleViewFavorites = useCallback(() => {
    navigation.navigate('Favorites');
  }, [navigation]);

  const handleMealPress = useCallback(async (mealId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to meal detail screen
    if (__DEV__) {
      console.log('Meal pressed:', mealId);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Refresh data
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  // Use static styles and only compute dynamic styles that actually change
  const dynamicStyles = useMemo(() => createDynamicStyles(theme, insets), [theme, insets]);
  const styles = { ...staticStyles, ...dynamicStyles } as any;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <HeaderLogo size={48} />
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                Good {getTimeOfDay()}
              </Text>
              <Text style={styles.userName}>
                {user?.first_name || 'Welcome'} 👋
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.streakContainer}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            <Avatar
              name={user?.first_name || 'User'}
              size="medium"
              onPress={handleProfilePress}
            />
          </View>
        </View>

        {/* Today's Progress */}
        <GlassCard 
          variant="glass" 
          padding={spacing['5']} 
          style={styles.progressCard}
          glassBorder={true}
          gradient={true}
        >
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          
          <View style={styles.calorieSection}>
            <ProgressRing 
              progress={progressValues.calorieProgress}
              size={140}
              strokeWidth={12}
              color={theme.colors.primary[500]}
              style={styles.calorieRing}
            >
              <Text style={styles.calorieValue}>{todayStats?.calories || 0}</Text>
              <Text style={styles.calorieLabel}>of {progressValues.calorieGoal}</Text>
              <Text style={styles.calorieUnit}>calories</Text>
            </ProgressRing>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{todaysNutrition?.protein || 0}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
              <View style={[styles.macroProgress, { backgroundColor: theme.colors.success[500] }]} />
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{todaysNutrition?.carbs || 0}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <View style={[styles.macroProgress, { backgroundColor: theme.colors.secondary[500] }]} />
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{todaysNutrition?.fat || 0}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
              <View style={[styles.macroProgress, { backgroundColor: theme.colors.warning[500] }]} />
            </View>
          </View>
        </GlassCard>

        {/* Camera Action */}
        <GlassCard 
          variant="frosted" 
          padding={spacing['5']} 
          onPress={handleCameraPress}
          style={styles.cameraCard}
          glassBorder={true}
          gradient={true}
        >
          <View style={styles.cameraContent}>
            <View style={styles.cameraLeft}>
              <View style={styles.cameraIconContainer}>
                <GradientIcon 
                  name="camera" 
                  size={24} 
                />
              </View>
              <View style={styles.cameraTextContainer}>
                <Text style={styles.cameraTitle}>Analyze Your Meal</Text>
                <Text style={styles.cameraSubtitle}>
                  AI-powered nutrition insights
                </Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.text.secondary} 
            />
          </View>
        </GlassCard>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card variant="outlined" padding="medium" style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary[50] }]}>
                <GradientIcon
                  name="restaurant"
                  size={20}
                />
              </View>
              <Text style={styles.statValue}>{todaysMeals?.length || 0}</Text>
              <Text style={styles.statLabel}>Meals Today</Text>
            </View>
          </Card>

          <Card variant="outlined" padding="medium" style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.secondary[50] }]}>
                <GradientIcon 
                  name="water" 
                  size={20} 
                  colors={[theme.colors.secondary[400], theme.colors.secondary[600]]}
                />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Glasses of Water</Text>
            </View>
          </Card>
        </View>

        {/* Recent Meals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Meals</Text>
            <TouchableOpacity onPress={handleViewHistory}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>

          {todaysMeals.length > 0 ? (
            <View style={styles.mealsContainer}>
              {todaysMeals.slice(0, 2).map((meal, index) => (
                <Card
                  key={meal.id}
                  variant="outlined"
                  padding="medium"
                  onPress={() => handleMealPress(meal.id)}
                  pressable
                  style={styles.mealCard}
                >
                  <MealCard meal={meal} theme={theme} />
                </Card>
              ))}
            </View>
          ) : (
            <Card variant="outlined" padding="xl" style={styles.emptyCard}>
              <Image
                source={require('../../assets/logo_cropped.png')}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>
                No meals logged yet today
              </Text>
              <Text style={styles.emptySubtext}>
                Start by analyzing your first meal!
              </Text>
            </Card>
          )}
        </View>

        {/* Nutrition Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Insights</Text>
          
          <GlassCard 
            variant="subtle" 
            padding={spacing['4']} 
            style={styles.tipCard}
            gradient={true}
          >
            <View style={styles.tipContent}>
              <View style={styles.tipIconContainer}>
                <GradientIcon 
                  name="bulb-outline" 
                  size={24}
                  colors={[theme.colors.warning[400], theme.colors.warning[600]]}
                />
              </View>
              <View style={styles.tipTextContainer}>
                <Text style={styles.tipTitle}>Hydration Reminder</Text>
                <Text style={styles.tipText}>
                  Remember to drink water throughout the day. Aim for 8 glasses to stay properly hydrated!
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsRow}>
            <Button
              variant="outline"
              size="large"
              onPress={handleViewFavorites}
              style={styles.quickActionButton}
              icon={<GradientIcon name="heart" size={20} colors={[theme.colors.error[400], theme.colors.error[600]]} />}
              iconPosition="left"
            >
              Favorites
            </Button>

            <Button
              variant="outline"
              size="large"
              onPress={handleViewHistory}
              style={styles.quickActionButton}
              icon={<GradientIcon name="stats-chart" size={20} />}
              iconPosition="left"
            >
              History
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

interface MealCardProps {
  meal: any;
  theme: any;
}

const MealCard: React.FC<MealCardProps> = React.memo(
  ({ meal, theme }) => {
    const textStyles = useMemo(() => ({
      name: { ...mealCardStyles.name, color: theme.colors.text.primary },
      time: { ...mealCardStyles.time, color: theme.colors.text.secondary },
      calories: { ...mealCardStyles.calories, color: theme.colors.primary[500] },
    }), [theme]);
    
    return (
      <View style={mealCardStyles.container}>
        <View style={mealCardStyles.content}>
          {meal.image_url && (
            <OptimizedImage
              source={{ uri: meal.image_url }}
              width={48}
              height={48}
              style={mealCardStyles.image}
              priority="normal"
            />
          )}
          <View style={mealCardStyles.info}>
            <Text style={textStyles.name}>
              {meal.name || 'Untitled Meal'}
            </Text>
            <Text style={textStyles.time}>
              {formatDate(new Date(meal.consumedAt || meal.created_at))}
            </Text>
          </View>
          <Text style={textStyles.calories}>
            {formatCalories(meal.calories || meal.total_calories || 0)}
          </Text>
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.meal.id === nextProps.meal.id && prevProps.meal.calories === nextProps.meal.calories
    );
  }
);

