import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, RefreshControl } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Container, Spacer, Row } from '@/components/layout';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { AnimatedCard } from '@/components/base/AnimatedCard';
import { GradientButton } from '@/components/base/GradientButton';
import { StreakCounter } from '@/components/base/StreakCounter';
import { AnimatedGradientBackground } from '@/components/base/AnimatedGradientBackground';
import { GradientCard } from '@/components/base/GradientCard';
import { GlassCard } from '@/components/base/GlassCard';
import { FloatingActionButton } from '@/components/base/FloatingActionButton';
import { IconButton } from '@/components/base/IconButton';
import { NutritionBubble } from '@/components/base/NutritionBubble';
import { WaveBackground } from '@/components/base/WaveBackground';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useMealStore, useMealSelectors } from '@/store/mealStore';
import { usePerformanceMonitor } from '@/utils/performance';
import { rs, rTouchTarget, layout, dimensions, fontScale, moderateScale } from '@/utils/responsive';
import { HomeTabParamList, MainStackParamList } from '@/navigation/types';
import { formatCalories, formatDate } from '@/utils/formatting';
import { APP_CONFIG } from '@/constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

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
  
  // Memoize progress values to prevent recalculation on every render
  const progressValues = useMemo(() => {
    const calorieGoal = profile?.dailyCalorieGoal || 2000;
    const calorieProgress = Math.round(Math.min(((todayStats?.calories || 0) / calorieGoal) * 100, 100));
    const proteinGoal = profile?.dailyProteinGoal || 50;
    const proteinProgress = Math.round(Math.min(((todaysNutrition?.protein || 0) / proteinGoal) * 100, 100));
    const carbsGoal = profile?.dailyCarbsGoal || 250;
    const carbsProgress = Math.round(Math.min(((todaysNutrition?.carbs || 0) / carbsGoal) * 100, 100));
    const fatGoal = profile?.dailyFatGoal || 65;
    const fatProgress = Math.round(Math.min(((todaysNutrition?.fat || 0) / fatGoal) * 100, 100));
    
    return { calorieProgress, proteinProgress, carbsProgress, fatProgress, calorieGoal };
  }, [profile, todayStats, todaysNutrition]);
  
  // Calculate streak (mock data for now)
  const [streak, setStreak] = useState(7);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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
    console.log('Meal pressed:', mealId);
  }, []);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Refresh data
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <Container style={styles.container}>
      {/* Animated gradient background */}
      <AnimatedGradientBackground 
        type="mesh" 
        animated={true} 
        speed="slow"
      />
      
      {/* Wave decoration */}
      <WaveBackground 
        position="bottom" 
        height={150} 
        colors={[
          theme.colors.primary[300] + '20',
          theme.colors.primary[400] + '15',
          theme.colors.primary[500] + '10',
        ]}
        speed="slow"
      />
      
      <Animated.ScrollView 
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <GlassCard
          animated={true}
          animationDelay={0}
          style={styles.headerCard}
          glassBorder={true}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Animated.View style={{
                transform: [{
                  rotate: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0deg', '360deg'],
                    extrapolate: 'clamp',
                  })
                }]
              }}>
                <Image 
                  source={require('../../assets/logo_cropped.png')} 
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </Animated.View>
              <View style={styles.greetingContainer}>
                <Text 
                  style={[styles.greeting, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Good {getTimeOfDay()}
                </Text>
                <Text 
                  style={[styles.userName, { color: theme.colors.text.primary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user?.first_name || 'Welcome'} 👋
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <StreakCounter
                count={streak}
                size="medium"
                style={styles.streakCounter}
              />
              <IconButton
                icon={
                  <LinearGradient
                    colors={theme.colors.gradients.primary.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}
                  >
                    <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                      {(user?.first_name?.[0] || 'U').toUpperCase()}
                    </Text>
                  </LinearGradient>
                }
                onPress={handleProfilePress}
                variant="gradient"
                size="medium"
                style={styles.avatarButton}
              />
            </View>
          </View>
        </GlassCard>

        <Spacer size="xl" />
        
        {/* Hero Section - Daily Progress */}
        <GradientCard
          variant="primary"
          animationType="zoomIn"
          animationDelay={100}
          style={styles.heroCard}
          elevation="high"
        >
          <Text style={[styles.heroTitle, { color: theme.colors.text.primary }]}>Today's Progress</Text>
          
          {/* 3D Nutrition Bubbles */}
          <View style={styles.nutritionBubblesContainer}>
            <NutritionBubble
              value={todayStats?.calories || 0}
              label="Calories"
              unit="cal"
              size="xlarge"
              percentage={progressValues.calorieProgress}
              gradientColors={theme.colors.gradients.primary.colors}
              floatingAnimation={true}
              onPress={() => console.log('Calories pressed')}
            />
          </View>
          
          <View style={styles.macroRow}>
            <NutritionBubble
              value={todaysNutrition?.protein || 0}
              label="Protein"
              unit="g"
              size="medium"
              percentage={(todaysNutrition?.protein || 0) / (profile?.dailyProteinGoal || 50) * 100}
              gradientColors={theme.colors.gradients.success.colors}
              floatingAnimation={true}
            />
            <NutritionBubble
              value={todaysNutrition?.carbs || 0}
              label="Carbs"
              unit="g"
              size="medium"
              percentage={(todaysNutrition?.carbs || 0) / (profile?.dailyCarbsGoal || 250) * 100}
              gradientColors={theme.colors.gradients.secondary.colors}
              floatingAnimation={true}
            />
            <NutritionBubble
              value={todaysNutrition?.fat || 0}
              label="Fat"
              unit="g"
              size="medium"
              percentage={(todaysNutrition?.fat || 0) / (profile?.dailyFatGoal || 65) * 100}
              gradientColors={theme.colors.gradients.warning.colors}
              floatingAnimation={true}
            />
          </View>
        </GradientCard>

        <Spacer size="xl" />

        {/* Quick Action - Camera */}
        <GlassCard
          animated={true}
          animationDelay={200}
          style={styles.cameraCard}
          onPress={handleCameraPress}
          glassBorder={true}
          intensity={100}
        >
          <LinearGradient
            colors={theme.colors.gradients.primary.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cameraGradientBackground}
          >
            <View style={styles.cameraContent}>
              <View style={styles.cameraLeft}>
                <Text style={[styles.cameraTitle, { color: '#FFFFFF' }]}>Analyze Your Meal</Text>
                <Text style={[styles.cameraSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  AI-powered nutrition insights
                </Text>
              </View>
              <View style={styles.cameraIconContainer}>
                <Animated.View style={[
                  styles.cameraIcon,
                  {
                    transform: [{
                      scale: scrollY.interpolate({
                        inputRange: [0, 100],
                        outputRange: [1, 1.2],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}>
                  <Ionicons name="camera" size={moderateScale(32)} color="#FFFFFF" />
                </Animated.View>
              </View>
            </View>
            
            <View style={styles.cameraButtonContainer}>
              <GradientButton
                onPress={handleCameraPress}
                variant="secondary"
                size="medium"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={moderateScale(20)} color="#FFF" />}
                iconPosition="right"
                style={styles.cameraButton}
              >
                Start Analysis
              </GradientButton>
            </View>
          </LinearGradient>
        </GlassCard>

        <Spacer size="xl" />

        {/* Quick Stats */}
        <View style={styles.section}>
          <Row style={styles.statsRow}>
            <GlassCard
              animated={true}
              animationDelay={300}
              style={[styles.statCard, { flex: 1 }]}
              intensity={90}
            >
              <LinearGradient
                colors={[theme.colors.gradients.ocean.colors[0] + '20', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.statIconContainer}>
                <Ionicons name="restaurant" size={moderateScale(28)} color={theme.colors.primary[500]} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
                {todaysMeals?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Meals Today</Text>
            </GlassCard>

            <Spacer size="md" horizontal />

            <GlassCard
              animated={true}
              animationDelay={400}
              style={[styles.statCard, { flex: 1 }]}
              intensity={90}
            >
              <LinearGradient
                colors={[theme.colors.gradients.info.colors[0] + '20', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.statIconContainer}>
                <Ionicons name="water" size={moderateScale(28)} color={theme.colors.info[500]} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
                {0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Glasses of Water</Text>
            </GlassCard>
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
              {todaysMeals.slice(0, 2).map((meal, index) => (
                <GradientCard
                  key={meal.id}
                  variant="neutral"
                  animationType="slideRight"
                  animationDelay={600 + index * 100}
                  style={styles.mealCardAnimated}
                  onPress={() => handleMealPress(meal.id)}
                  elevation="medium"
                >
                  <MealCard meal={meal} theme={theme} />
                </GradientCard>
              ))}
            </View>
          ) : (
            <AnimatedCard
              animationType="fadeIn"
              delay={600}
              style={styles.emptyCard}
            >
              <Image 
                source={require('../../assets/logo_cropped.png')} 
                style={styles.emptyIcon}
                resizeMode="contain"
              />
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
                colors={[theme.colors.error[500] + '20', theme.colors.error[500] + '10']}
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
                colors={[theme.colors.primary[500] + '20', theme.colors.primary[500] + '10']}
                style={styles.quickActionGradient}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={[styles.quickActionText, { color: theme.colors.text.primary }]}>History</Text>
              </LinearGradient>
            </AnimatedCard>
          </Row>
        </View>

        <Spacer size="xxl" />
      </Animated.ScrollView>
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

const MacroIndicator: React.FC<MacroIndicatorProps> = ({ label, value, unit, color }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.macroItem}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
        {value}{unit}
      </Text>
    </View>
  );
};

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
    height: moderateScale(300),
  },
  scrollContent: {
    paddingHorizontal: layout.containerPadding,
    paddingTop: rs.xlarge,
    paddingBottom: rs.xxlarge,
  },
  transparentCard: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  headerCard: {
    marginBottom: rs.large,
    padding: rs.medium,
  },
  avatarButton: {
    borderRadius: rTouchTarget.medium / 2,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: rTouchTarget.medium / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerLogo: {
    width: moderateScale(40),
    height: moderateScale(40),
    marginRight: rs.medium,
  },
  greetingContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: rs.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.small,
    flexShrink: 0,
  },
  greeting: {
    fontSize: fontScale(16),
    opacity: 0.8,
  },
  userName: {
    fontSize: fontScale(28),
    fontWeight: 'bold',
    marginTop: rs.tiny,
  },
  avatarContainer: {
    marginLeft: rs.medium,
  },
  avatar: {
    width: rTouchTarget.minimum,
    height: rTouchTarget.minimum,
    borderRadius: rTouchTarget.minimum / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontScale(18),
    fontWeight: 'bold',
  },
  streakCounter: {
    marginRight: rs.small,
  },
  quickCaptureButton: {
    position: 'absolute',
    bottom: -rs.large,
    right: rs.large,
    width: rTouchTarget.large,
    height: rTouchTarget.large,
    borderRadius: rTouchTarget.large / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  quickCaptureIcon: {
    fontSize: fontScale(28),
    color: '#FFFFFF',
  },
  heroCard: {
    padding: rs.xlarge,
    alignItems: 'center',
  },
  nutritionBubblesContainer: {
    alignItems: 'center',
    marginVertical: rs.xlarge,
  },
  heroTitle: {
    fontSize: fontScale(20),
    fontWeight: '600',
    marginBottom: rs.large,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: rs.large,
    marginBottom: rs.xxlarge,
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: fontScale(32),
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: rs.large,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    marginBottom: rs.tiny,
  },
  macroLabel: {
    fontSize: fontScale(12),
    marginBottom: rs.tiny,
  },
  macroValue: {
    fontSize: fontScale(16),
    fontWeight: '600',
  },
  cameraCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cameraGradient: {
    padding: rs.large,
    borderRadius: moderateScale(12),
  },
  cameraGradientBackground: {
    flex: 1,
    padding: rs.large,
    borderRadius: moderateScale(16),
  },
  cameraIconContainer: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButtonContainer: {
    marginTop: rs.medium,
  },
  cameraButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cameraContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs.medium,
  },
  cameraLeft: {
    flex: 1,
  },
  cameraTitle: {
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  cameraSubtitle: {
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  cameraIcon: {
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
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
  statsRow: {
    width: '100%',
  },
  statCard: {
    padding: rs.large,
    alignItems: 'center',
  },
  statIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs.medium,
  },
  statIcon: {
    fontSize: fontScale(24),
  },
  statValue: {
    fontSize: fontScale(28),
    fontWeight: 'bold',
    marginBottom: rs.tiny,
  },
  statLabel: {
    fontSize: fontScale(14),
  },
  mealCardAnimated: {
    marginBottom: rs.medium,
  },
  mealCardContent: {
    padding: rs.medium,
  },
  mealInfo: {
    flex: 1,
  },
  mealInfoWithImage: {
    marginLeft: rs.medium,
  },
  mealImage: {
    borderRadius: moderateScale(8),
  },
  mealName: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  mealTime: {
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  mealCalories: {
    fontSize: fontScale(16),
    fontWeight: '600',
  },
  emptyCard: {
    padding: rs.xxlarge,
    alignItems: 'center',
  },
  emptyIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    marginBottom: rs.medium,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: fontScale(16),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: rs.small,
  },
  emptySubtext: {
    fontSize: fontScale(14),
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
    padding: rs.xlarge,
    alignItems: 'center',
    borderRadius: moderateScale(12),
  },
  quickActionIcon: {
    fontSize: fontScale(24),
    marginBottom: rs.small,
  },
  quickActionText: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
});
