import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useUserStore();
  const { todayStats, fetchMeals } = useMealStore();
  const { todaysMeals, todaysNutrition } = useMealSelectors();

  // Animation values - use lazy initialization to avoid creating new objects on every render
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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

    return { 
      calorieProgress, 
      proteinProgress, 
      carbsProgress, 
      fatProgress, 
      calorieGoal,
      proteinGoal,
      carbsGoal,
      fatGoal 
    };
  }, [profile, todayStats, todaysNutrition]);

  // Calculate streak (mock data for now)
  const [streak, setStreak] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  // Memoize time of day calculation to avoid recalculation
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  const timeOfDayEmoji = useMemo(() => {
    switch (timeOfDay) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      default: return '🌙';
    }
  }, [timeOfDay]);

  // Load initial data
  useEffect(() => {
    fetchMeals();
    
    // Animate in content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Memoize navigation handlers
  const handleCameraPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (__DEV__) {
      console.log('📸 [HOME] Camera button pressed');
    }
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
    const refreshStartTime = performance.now();
    if (__DEV__) {
      console.log('🏠 [HOME] Refresh started');
    }
    
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await fetchMeals();
      const refreshEndTime = performance.now();
      if (__DEV__) {
        console.log(`⏱️ [PERFORMANCE] Refresh took ${(refreshEndTime - refreshStartTime).toFixed(2)}ms`);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('🔄 [HOME] Refresh error:', error);
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetchMeals]);

  // Use static styles and only compute dynamic styles that actually change
  const dynamicStyles = useMemo(() => createDynamicStyles(theme, insets), [theme, insets]);
  const styles = useMemo(() => ({ ...staticStyles, ...dynamicStyles, ...createModernStyles(theme) }), [dynamicStyles, theme]);

  // Memoize interpolated values to avoid recalculation
  const headerOpacity = useMemo(() => scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  }), [scrollY]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {/* Animated Background Gradient - Memoized */}
      <LinearGradient
        colors={theme.isDark 
          ? ['#1a1f36', '#0f1419', '#000000']
          : ['#dbeafe', '#93c5fd', '#ffffff']
        }
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
        scrollEventThrottle={32}
      >
        {/* Modern Redesigned Header */}
        <Animated.View style={[styles.modernHeader, { opacity: headerOpacity }]}>
          {/* Main Header Container */}
          <LinearGradient
            colors={theme.isDark 
              ? ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)', 'transparent']
              : ['rgba(59, 130, 246, 0.08)', 'rgba(37, 99, 235, 0.04)', 'transparent']
            }
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <BlurView intensity={theme.isDark ? 20 : 30} style={styles.headerBlur}>
              <View style={styles.headerTop}>
                {/* Logo and Greeting Section */}
                <View style={styles.headerLeft}>
                  <View style={styles.logoContainer}>
                    <LinearGradient
                      colors={[theme.colors.primary[400], theme.colors.primary[600]]}
                      style={styles.logoGradient}
                    >
                      <Image
                        source={require('../../assets/logo_cropped.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  </View>
                  <View style={styles.greetingSection}>
                    <Text style={styles.modernGreeting}>
                      {timeOfDayEmoji} Good {timeOfDay}
                    </Text>
                    <Text style={styles.modernUserName}>
                      {user?.first_name || 'Friend'}!
                    </Text>
                  </View>
                </View>

                {/* Profile and Actions Section */}
                <View style={styles.headerRight}>
                  {/* Notifications Button */}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Notifications')}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                      style={styles.actionButtonGradient}
                    >
                      <GradientIcon name="notifications-outline" size={20} colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']} />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Profile Button with Streak */}
                  <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton}>
                    <LinearGradient
                      colors={[theme.colors.primary[400], theme.colors.primary[600]]}
                      style={styles.avatarGradient}
                    >
                      <Avatar
                        name={user?.first_name || 'User'}
                        size="medium"
                        style={styles.avatar}
                      />
                    </LinearGradient>
                    <View style={styles.streakBadge}>
                      <LinearGradient
                        colors={[theme.colors.warning[400], theme.colors.warning[600]]}
                        style={styles.streakGradient}
                      >
                        <Text style={styles.streakText}>🔥 {streak}</Text>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Motivational Quote with Modern Styling */}
              <View style={styles.quoteContainer}>
                <LinearGradient
                  colors={theme.isDark 
                    ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                    : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)']
                  }
                  style={styles.quoteGradient}
                >
                  <Text style={styles.motivationalQuote}>
                    "Every healthy choice is a step towards a better you!"
                  </Text>
                </LinearGradient>
              </View>
            </BlurView>
          </LinearGradient>
        </Animated.View>

        {/* Hero Progress Card */}
        <Animated.View style={{ 
          opacity: fadeAnim, 
          transform: [{ scale: scaleAnim }] 
        }}>
          <LinearGradient
            colors={theme.isDark 
              ? ['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.15)']
              : ['rgba(59, 130, 246, 0.08)', 'rgba(37, 99, 235, 0.08)']
            }
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.blurContainer, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)' }]}>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>Today's Nutrition</Text>
                
                <View style={styles.calorieRingContainer}>
                  <ProgressRing 
                    progress={progressValues.calorieProgress}
                    size={180}
                    strokeWidth={16}
                    color={theme.colors.primary[500]}
                    backgroundColor={theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                    style={styles.calorieRing}
                  >
                    <Text style={styles.calorieMainValue}>{todayStats?.calories || 0}</Text>
                    <Text style={styles.calorieSubtext}>of {progressValues.calorieGoal}</Text>
                    <Text style={styles.calorieLabel}>calories</Text>
                  </ProgressRing>
                </View>

                <View style={styles.macroContainer}>
                  <MacroCard
                    label="Protein"
                    value={todaysNutrition?.protein || 0}
                    goal={progressValues.proteinGoal}
                    progress={progressValues.proteinProgress}
                    color={theme.colors.primary[600]}
                    icon="🥩"
                    theme={theme}
                  />
                  <MacroCard
                    label="Carbs"
                    value={todaysNutrition?.carbs || 0}
                    goal={progressValues.carbsGoal}
                    progress={progressValues.carbsProgress}
                    color={theme.colors.primary[500]}
                    icon="🌾"
                    theme={theme}
                  />
                  <MacroCard
                    label="Fat"
                    value={todaysNutrition?.fat || 0}
                    goal={progressValues.fatGoal}
                    progress={progressValues.fatProgress}
                    color={theme.colors.primary[400]}
                    icon="🥑"
                    theme={theme}
                  />
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Floating Camera Button - Optimized */}
        <TouchableOpacity 
          onPress={handleCameraPress}
          style={styles.floatingCameraButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary[400], theme.colors.primary[600]]}
            style={styles.cameraGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <GradientIcon name="camera" size={28} colors={['white', 'rgba(255,255,255,0.9)']} />
            <Text style={styles.cameraButtonText}>Analyze Meal</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="🍽️"
            value={todaysMeals?.length || 0}
            label="Meals"
            color={theme.colors.primary[500]}
            theme={theme}
          />
          <StatCard
            icon="💧"
            value={0}
            label="Water (L)"
            color={theme.colors.info[500]}
            theme={theme}
          />
          <StatCard
            icon="🏃"
            value={0}
            label="Steps"
            color={theme.colors.primary[600]}
            theme={theme}
          />
          <StatCard
            icon="😴"
            value={0}
            label="Sleep (h)"
            color={theme.colors.primary[400]}
            theme={theme}
          />
        </View>

        {/* Recent Meals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Meals</Text>
            <TouchableOpacity onPress={handleViewHistory}>
              <LinearGradient
                colors={[theme.colors.primary[400], theme.colors.primary[600]]}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>View All</Text>
                <GradientIcon name="arrow-forward" size={16} colors={['white', 'rgba(255,255,255,0.8)']} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {todaysMeals.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealsScrollContainer}
            >
              {todaysMeals.map((meal, index) => (
                <ModernMealCard 
                  key={meal.id} 
                  meal={meal} 
                  theme={theme}
                  onPress={() => handleMealPress(meal.id)}
                  index={index}
                />
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity onPress={handleCameraPress} style={styles.emptyStateCard}>
              <LinearGradient
                colors={theme.isDark 
                  ? ['rgba(138, 92, 255, 0.1)', 'rgba(92, 138, 255, 0.1)']
                  : ['rgba(138, 92, 255, 0.05)', 'rgba(92, 138, 255, 0.05)']
                }
                style={styles.emptyStateGradient}
              >
                <Text style={styles.emptyStateEmoji}>📸</Text>
                <Text style={styles.emptyStateTitle}>No meals logged yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap to analyze your first meal of the day!
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Tips Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Tips</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            contentContainerStyle={styles.tipsContainer}
          >
            <TipCard
              emoji="💡"
              title="Stay Hydrated"
              text="Drink at least 8 glasses of water daily to maintain optimal body function."
              gradient={['#4ECDC4', '#44A08D']}
              theme={theme}
            />
            <TipCard
              emoji="🥗"
              title="Eat the Rainbow"
              text="Include colorful fruits and vegetables for maximum nutrient variety."
              gradient={['#FA709A', '#FEE140']}
              theme={theme}
            />
            <TipCard
              emoji="⏰"
              title="Mindful Eating"
              text="Take time to enjoy your meals. Eating slowly aids digestion."
              gradient={['#667eea', '#764ba2']}
              theme={theme}
            />
          </ScrollView>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
});

// Helper Components
const MacroCard: React.FC<{
  label: string;
  value: number;
  goal: number;
  progress: number;
  color: string;
  icon: string;
  theme: Theme;
}> = React.memo(({ label, value, goal, progress, color, icon, theme }) => {
  const styles = useMemo(() => createMacroStyles(theme), [theme]);
  
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroIcon}>{icon}</Text>
      <Text style={styles.macroValue}>{value}g</Text>
      <Text style={styles.macroGoal}>/ {goal}g</Text>
      <View style={styles.macroProgressBar}>
        <View 
          style={[
            styles.macroProgressFill,
            { 
              backgroundColor: color,
              width: `${progress}%`
            }
          ]} 
        />
      </View>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
});

const StatCard = React.memo<{
  icon: string;
  value: number;
  label: string;
  color: string;
  theme: Theme;
}>(({ icon, value, label, color, theme }) => {
  const styles = createStatStyles(theme);
  
  return (
    <View style={[styles.statCard, { borderColor: color + '20' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

StatCard.displayName = 'StatCard';

const ModernMealCard = React.memo<{
  meal: any;
  theme: Theme;
  onPress: () => void;
  index: number;
}>(({ meal, theme, onPress, index }) => {
  const styles = createMealCardStyles(theme);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 100,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={theme.isDark 
            ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
            : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']
          }
          style={styles.mealCard}
        >
          {meal.image_url ? (
            <OptimizedImage
              source={{ uri: meal.image_url }}
              width={styles.mealImage.width}
              height={styles.mealImage.height}
              style={styles.mealImage}
              priority="high"
            />
          ) : (
            <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
              <Text style={styles.mealImageEmoji}>🍽️</Text>
            </View>
          )}
          
          <View style={styles.mealContent}>
            <Text style={styles.mealName} numberOfLines={2}>
              {meal.name || 'Untitled Meal'}
            </Text>
            <Text style={styles.mealTime}>
              {formatDate(new Date(meal.consumedAt || meal.created_at))}
            </Text>
            
            <View style={styles.mealStats}>
              <View style={styles.mealCalories}>
                <Text style={styles.mealCaloriesValue}>
                  {meal.calories || meal.total_calories || 0}
                </Text>
                <Text style={styles.mealCaloriesLabel}>cal</Text>
              </View>
              
              <View style={styles.mealMacros}>
                <Text style={styles.mealMacro}>P: {meal.protein || 0}g</Text>
                <Text style={styles.mealMacro}>C: {meal.carbs || 0}g</Text>
                <Text style={styles.mealMacro}>F: {meal.fat || 0}g</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

ModernMealCard.displayName = 'ModernMealCard';

const TipCard: React.FC<{
  emoji: string;
  title: string;
  text: string;
  gradient: string[];
  theme: Theme;
}> = ({ emoji, title, text, gradient, theme }) => {
  const styles = createTipStyles(theme);
  
  return (
    <LinearGradient
      colors={gradient}
      style={styles.tipCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.tipEmoji}>{emoji}</Text>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </LinearGradient>
  );
};

// Styles
const createModernStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 400,
  },
  scrollContent: {
    paddingBottom: spacing['20'],
  },
  modernHeader: {
    marginHorizontal: spacing['4'],
    marginTop: spacing['8'],
    marginBottom: spacing['4'],
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    borderRadius: 20,
  },
  headerBlur: {
    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    padding: spacing['5'],
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing['4'],
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  greetingSection: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
  },
  modernGreeting: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  modernUserName: {
    ...textPresets.h2,
    color: theme.colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  profileButton: {
    position: 'relative',
  },
  avatarGradient: {
    borderRadius: 30,
    padding: 2,
  },
  avatar: {
    backgroundColor: 'white',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  streakGradient: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  quoteContainer: {
    marginTop: spacing['4'],
    borderRadius: 16,
    overflow: 'hidden',
  },
  quoteGradient: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  streakText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '700',
  },
  motivationalQuote: {
    ...textPresets.body,
    color: theme.colors.text.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  heroCard: {
    marginHorizontal: spacing['5'],
    marginTop: spacing['4'],
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: spacing['6'],
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing['4'],
  },
  calorieRingContainer: {
    marginVertical: spacing['4'],
  },
  calorieMainValue: {
    ...textPresets.h1,
    color: theme.colors.primary[500],
    fontSize: 48,
    fontWeight: '700',
  },
  calorieSubtext: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  calorieLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing['4'],
  },
  floatingCameraButton: {
    marginHorizontal: spacing['5'],
    marginTop: spacing['6'],
    marginBottom: spacing['4'],
  },
  cameraGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4'],
    paddingHorizontal: spacing['6'],
    borderRadius: 30,
    elevation: 8,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cameraButtonText: {
    ...textPresets.button,
    color: 'white',
    marginLeft: spacing['2'],
    fontSize: 18,
    fontWeight: '600',
  },
  cameraPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    opacity: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing['5'],
    marginTop: spacing['4'],
    gap: spacing['3'],
  },
  section: {
    marginTop: spacing['6'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['5'],
    marginBottom: spacing['3'],
  },
  sectionTitle: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  seeAllText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '600',
    marginRight: 4,
  },
  mealsScrollContainer: {
    paddingHorizontal: spacing['5'],
    gap: spacing['3'],
  },
  emptyStateCard: {
    marginHorizontal: spacing['5'],
  },
  emptyStateGradient: {
    padding: spacing['8'],
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: spacing['3'],
  },
  emptyStateTitle: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing['2'],
  },
  emptyStateSubtext: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  tipsContainer: {
    paddingHorizontal: spacing['5'],
    gap: spacing['3'],
  },
});

const createMacroStyles = (theme: Theme) => StyleSheet.create({
  macroCard: {
    alignItems: 'center',
    flex: 1,
  },
  macroIcon: {
    fontSize: 24,
    marginBottom: spacing['2'],
  },
  macroValue: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  macroGoal: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  macroProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    marginTop: spacing['2'],
    marginBottom: spacing['1'],
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
});

const createStatStyles = (theme: Theme) => StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: (screenWidth - spacing['5'] * 2 - spacing['3'] * 3) / 4,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    padding: spacing['4'],
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing['2'],
  },
  statValue: {
    ...textPresets.h3,
    fontWeight: '700',
  },
  statLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    fontSize: 11,
  },
});

const createMealCardStyles = (theme: Theme) => StyleSheet.create({
  mealCard: {
    width: screenWidth * 0.7,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mealImage: {
    width: '100%',
    height: 140,
    borderRadius: 20,
  },
  mealImagePlaceholder: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealImageEmoji: {
    fontSize: 48,
  },
  mealContent: {
    padding: spacing['4'],
  },
  mealName: {
    ...textPresets.subtitle,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing['1'],
  },
  mealTime: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    marginBottom: spacing['3'],
  },
  mealStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealCalories: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mealCaloriesValue: {
    ...textPresets.h3,
    color: theme.colors.primary[500],
    fontWeight: '700',
  },
  mealCaloriesLabel: {
    ...textPresets.caption,
    color: theme.colors.primary[500],
    marginLeft: 2,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: spacing['2'],
  },
  mealMacro: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    fontSize: 11,
  },
});

const createTipStyles = (theme: Theme) => StyleSheet.create({
  tipCard: {
    width: screenWidth - spacing['5'] * 2,
    padding: spacing['6'],
    borderRadius: 20,
    alignItems: 'center',
  },
  tipEmoji: {
    fontSize: 32,
    marginBottom: spacing['3'],
  },
  tipTitle: {
    ...textPresets.h3,
    color: 'white',
    fontWeight: '700',
    marginBottom: spacing['2'],
  },
  tipText: {
    ...textPresets.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
});

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};