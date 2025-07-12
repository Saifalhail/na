import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { OptimizedList } from '@/components/base/OptimizedList';
import { AnimatedCard, AnimatedCardPresets } from '@/components/base/AnimatedCard';
import { GradientButton, GradientButtonPresets } from '@/components/base/GradientButton';
import { ProgressRing, MultiProgressRing } from '@/components/base/ProgressRing';
import { StreakCounter } from '@/components/base/StreakCounter';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useMealStore, useMealSelectors } from '@/store/mealStore';
import { usePerformanceMonitor } from '@/utils/performance';
import { HomeTabParamList, MainStackParamList } from '@/navigation/types';
import { formatCalories, formatDate } from '@/utils/formatting';
import { APP_CONFIG } from '@/constants';

const { width: screenWidth } = Dimensions.get('window');

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
  const { user } = useAuthStore();
  const { profile } = useUserStore();
  const { todayStats } = useMealStore();
  const { todaysMeals, todaysNutrition } = useMealSelectors();
  
  // Calculate progress values
  const calorieGoal = profile?.dailyCalorieGoal || 2000;
  const calorieProgress = Math.min(((todayStats?.calories || 0) / calorieGoal) * 100, 100);
  const proteinGoal = profile?.dailyProteinGoal || 50;
  const proteinProgress = Math.min(((todaysNutrition?.protein || 0) / proteinGoal) * 100, 100);
  const carbsGoal = profile?.dailyCarbsGoal || 250;
  const carbsProgress = Math.min(((todaysNutrition?.carbs || 0) / carbsGoal) * 100, 100);
  const fatGoal = profile?.dailyFatGoal || 65;
  const fatProgress = Math.min(((todaysNutrition?.fat || 0) / fatGoal) * 100, 100);
  
  // Calculate streak (mock data for now)
  const [streak, setStreak] = useState(7);

  // Memoize navigation handlers
  const handleCameraPress = useCallback(() => {
    navigation.navigate('Camera');
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleViewHistory = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const handleViewFavorites = useCallback(() => {
    navigation.navigate('Favorites');
  }, [navigation]);

  const handleMealPress = useCallback((mealId: string) => {
    // TODO: Navigate to meal detail screen
    console.log('Meal pressed:', mealId);
  }, []);

  return (
    <Container style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary[500] + '20', theme.colors.background]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
      />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <AnimatedCard
          animationType="fadeIn"
          delay={0}
          style={styles.transparentCard}
          elevation={0}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                Good {getTimeOfDay()}
              </Text>
              <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
                {user?.firstName || 'Welcome'} 👋
              </Text>
            </View>

            <View style={styles.headerRight}>
              <StreakCounter
                count={streak}
                size="medium"
                style={styles.streakCounter}
              />
              <TouchableOpacity onPress={handleProfilePress} style={styles.avatarContainer}>
                <LinearGradient
                  colors={[theme.colors.primary[400], theme.colors.primary[600]]}
                  style={styles.avatar}
                >
                  <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                    {(user?.firstName?.[0] || 'U').toUpperCase()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedCard>

        <Spacer size="xl" />
        
        {/* Hero Section - Daily Progress */}
        <AnimatedCard
          {...AnimatedCardPresets.hero}
          delay={100}
          style={styles.heroCard}
        >
          <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>Today's Progress</Text>
          
          <View style={styles.progressContainer}>
            <MultiProgressRing
              size={180}
              strokeWidth={12}
              rings={[
                { progress: calorieProgress, color: theme.colors.primary[500], label: 'Calories' },
                { progress: proteinProgress, color: '#10b981', label: 'Protein' },
                { progress: carbsProgress, color: '#f59e0b', label: 'Carbs' },
                { progress: fatProgress, color: '#ef4444', label: 'Fat' },
              ]}
            />
            <View style={styles.progressCenter}>
              <Text style={[styles.progressValue, { color: theme.colors.primary[500] }]}>
                {formatCalories(todayStats?.calories || 0)}
              </Text>
              <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
                of {formatCalories(calorieGoal)}
              </Text>
            </View>
          </View>
          
          <View style={styles.macroRow}>
            <MacroIndicator label="Protein" value={todaysNutrition?.protein || 0} unit="g" color="#10b981" />
            <MacroIndicator label="Carbs" value={todaysNutrition?.carbs || 0} unit="g" color="#f59e0b" />
            <MacroIndicator label="Fat" value={todaysNutrition?.fat || 0} unit="g" color="#ef4444" />
          </View>
        </AnimatedCard>

        <Spacer size="xl" />

        {/* Quick Action - Camera */}
        <AnimatedCard
          animationType="slideUp"
          delay={200}
          style={styles.cameraCard}
          touchable
          onPress={handleCameraPress}
        >
          <LinearGradient
            colors={[theme.colors.primary[500] + '10', theme.colors.primary[500] + '05']}
            style={styles.cameraGradient}
          >
            <View style={styles.cameraContent}>
              <View style={styles.cameraLeft}>
                <Text style={[styles.cameraTitle, { color: theme.colors.text.primary }]}>Analyze Your Meal</Text>
                <Text style={[styles.cameraSubtitle, { color: theme.colors.textSecondary }]}>
                  AI-powered nutrition insights
                </Text>
              </View>
              <View style={styles.cameraIcon}>
                <Text style={styles.cameraEmoji}>📸</Text>
              </View>
            </View>
            
            <GradientButton
              onPress={handleCameraPress}
              variant="primary"
              size="medium"
              fullWidth
              icon={<Text style={{ color: '#FFF', fontSize: 16 }}>→</Text>}
              iconPosition="right"
            >
              Start Analysis
            </GradientButton>
          </LinearGradient>
        </AnimatedCard>

        <Spacer size="xl" />

        {/* Quick Stats */}
        <View style={styles.section}>
          <Row style={styles.statsRow}>
            <AnimatedCard
              animationType="scale"
              delay={300}
              style={[styles.statCard, { flex: 1 }]}
            >
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🍽️</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
                {todaysMeals?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Meals Today</Text>
            </AnimatedCard>

            <Spacer size="md" horizontal />

            <AnimatedCard
              animationType="scale"
              delay={400}
              style={[styles.statCard, { flex: 1 }]}
            >
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>💧</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
                {0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Glasses of Water</Text>
            </AnimatedCard>
          </Row>
        </View>

        <Spacer size="xl" />

        {/* Recent Meals */}
        <View style={styles.section}>
          <AnimatedCard
            animationType="fadeIn"
            delay={500}
            style={styles.transparentCard}
            elevation={0}
          >
            <Row style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Recent Meals</Text>
              <TouchableOpacity onPress={handleViewHistory}>
                <Text style={[styles.seeAllText, { color: theme.colors.primary[500] }]}>See All →</Text>
              </TouchableOpacity>
            </Row>
          </AnimatedCard>

          <Spacer size="md" />

          {todaysMeals.length > 0 ? (
            <View>
              {todaysMeals.slice(0, 3).map((meal, index) => (
                <AnimatedCard
                  key={meal.id}
                  animationType="slideUp"
                  delay={600 + index * 100}
                  style={styles.mealCardAnimated}
                  touchable
                  onPress={() => handleMealPress(meal.id)}
                >
                  <MealCard meal={meal} theme={theme} />
                </AnimatedCard>
              ))}
            </View>
          ) : (
            <AnimatedCard
              animationType="fadeIn"
              delay={600}
              style={styles.emptyCard}
            >
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No meals logged yet today
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                Start by analyzing your first meal!
              </Text>
            </AnimatedCard>
          )}
        </View>

        <Spacer size="xl" />

        {/* Quick Actions */}
        <View style={styles.section}>
          <AnimatedCard
            animationType="fadeIn"
            delay={800}
            style={styles.transparentCard}
            elevation={0}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Quick Actions</Text>
          </AnimatedCard>

          <Spacer size="md" />

          <Row style={styles.quickActions}>
            <AnimatedCard
              animationType="scale"
              delay={900}
              style={[styles.quickAction, { flex: 1 }]}
              touchable
              onPress={handleViewFavorites}
            >
              <LinearGradient
                colors={['#ef4444' + '20', '#ef4444' + '10']}
                style={styles.quickActionGradient}
              >
                <Text style={styles.quickActionIcon}>❤️</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text.primary }]}>Favorites</Text>
              </LinearGradient>
            </AnimatedCard>

            <Spacer size="md" horizontal />

            <AnimatedCard
              animationType="scale"
              delay={1000}
              style={[styles.quickAction, { flex: 1 }]}
              touchable
              onPress={handleViewHistory}
            >
              <LinearGradient
                colors={['#3b82f6' + '20', '#3b82f6' + '10']}
                style={styles.quickActionGradient}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text.primary }]}>History</Text>
              </LinearGradient>
            </AnimatedCard>
          </Row>
        </View>

        <Spacer size="xxl" />
      </ScrollView>
    </Container>
  );
});

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

interface MacroIndicatorProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

const MacroIndicator: React.FC<MacroIndicatorProps> = ({ label, value, unit, color }) => (
  <View style={styles.macroItem}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <Text style={styles.macroLabel}>{label}</Text>
    <Text style={styles.macroValue}>
      {value}{unit}
    </Text>
  </View>
);

interface MealCardProps {
  meal: any;
  theme: any;
}

const MealCard: React.FC<MealCardProps> = React.memo(
  ({ meal, theme }) => (
    <View style={styles.mealCardContent}>
        <Row>
          {meal.image_url && (
            <OptimizedImage
              source={{ uri: meal.image_url }}
              width={60}
              height={60}
              style={styles.mealImage}
              priority="normal"
            />
          )}
          <View style={[styles.mealInfo, meal.image_url && styles.mealInfoWithImage]}>
            <Text style={[styles.mealName, { color: theme.colors.text.primary }]}>
              {meal.name || 'Untitled Meal'}
            </Text>
            <Text style={[styles.mealTime, { color: theme.colors.textSecondary }]}>
              {formatDate(new Date(meal.consumedAt || meal.created_at))}
            </Text>
          </View>
          <Text style={[styles.mealCalories, { color: theme.colors.primary[500] }]}>
            {formatCalories(meal.calories || meal.total_calories || 0)}
          </Text>
        </Row>
    </View>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.meal.id === nextProps.meal.id && prevProps.meal.calories === nextProps.meal.calories
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  transparentCard: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 16,
    opacity: 0.8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  avatarContainer: {
    marginLeft: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakCounter: {
    marginRight: 8,
  },
  heroCard: {
    padding: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cameraCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cameraGradient: {
    padding: 20,
    borderRadius: 12,
  },
  cameraContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraLeft: {
    flex: 1,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cameraSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  cameraIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmoji: {
    fontSize: 24,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    width: '100%',
  },
  statCard: {
    padding: 20,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  mealCardAnimated: {
    marginBottom: 12,
  },
  mealCardContent: {
    padding: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealInfoWithImage: {
    marginLeft: 12,
  },
  mealImage: {
    borderRadius: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
  },
  mealTime: {
    fontSize: 14,
    marginTop: 2,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  quickActions: {
    width: '100%',
  },
  quickAction: {
    padding: 0,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
