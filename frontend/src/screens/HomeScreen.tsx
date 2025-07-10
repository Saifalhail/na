import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { OptimizedList } from '@/components/base/OptimizedList';
import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from '@/store/userStore';
import { useMealStore, useMealSelectors } from '@/store/mealStore';
import { usePerformanceMonitor } from '@/utils/performance';
import { HomeTabParamList, MainStackParamList } from '@/navigation/types';
import { formatCalories, formatDate } from '@/utils/formatting';
import { APP_CONFIG } from '@/constants';

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
  const { user } = useUserStore();
  const { todayStats, meals } = useMealStore();
  const { todaysMeals, todaysNutrition } = useMealSelectors();

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
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
              Good {getTimeOfDay()}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.first_name || 'Welcome'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleProfilePress}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary[500] }]}>
              <Text style={[styles.avatarText, { color: theme.colors.background }]}>
                {(user?.first_name?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Spacer size="xl" />

        {/* Quick Action - Camera */}
        <Card style={styles.cameraCard}>
          <Text style={[styles.cameraTitle, { color: theme.colors.text }]}>Analyze Your Meal</Text>
          <Text style={[styles.cameraSubtitle, { color: theme.colors.textSecondary }]}>
            Take a photo to get instant nutritional analysis
          </Text>

          <Spacer size="lg" />

          <Button
            title="📸 Start Analysis"
            onPress={handleCameraPress}
            variant="primary"
            style={styles.cameraButton}
          />
        </Card>

        <Spacer size="xl" />

        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Summary</Text>

          <Spacer size="md" />

          <Row style={styles.statsRow}>
            <StatCard
              title="Calories"
              value={formatCalories(todayStats?.calories || 0)}
              subtitle={`of ${formatCalories(user?.profile?.daily_calorie_goal || 2000)}`}
              color={theme.colors.primary[500]}
              theme={theme}
            />

            <Spacer size="md" horizontal />

            <StatCard
              title="Meals"
              value={(todayStats?.meals || 0).toString()}
              subtitle="logged today"
              color={theme.colors.secondary[500]}
              theme={theme}
            />
          </Row>
        </View>

        <Spacer size="xl" />

        {/* Recent Meals */}
        <View style={styles.section}>
          <Row style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Meals</Text>
            <TouchableOpacity onPress={handleViewHistory}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary[500] }]}>See All</Text>
            </TouchableOpacity>
          </Row>

          <Spacer size="md" />

          {todaysMeals.length > 0 ? (
            <OptimizedList
              data={todaysMeals.slice(0, 3)}
              renderItem={({ item, index }) => (
                <View>
                  <MealCard meal={item} onPress={() => handleMealPress(item.id)} theme={theme} />
                  {index < 2 && <Spacer size="md" />}
                </View>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              itemHeight={120}
            />
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No meals yet. Start by analyzing your first meal!
              </Text>
            </Card>
          )}
        </View>

        <Spacer size="xl" />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>

          <Spacer size="md" />

          <Row style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
              onPress={handleViewFavorites}
            >
              <Text style={styles.quickActionIcon}>❤️</Text>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Favorites</Text>
            </TouchableOpacity>

            <Spacer size="md" horizontal />

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
              onPress={handleViewHistory}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>History</Text>
            </TouchableOpacity>
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

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  theme: any;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, subtitle, color, theme }) => (
  <Card style={[styles.statCard, { flex: 1 }]}>
    <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
  </Card>
));

interface MealCardProps {
  meal: any;
  onPress: () => void;
  theme: any;
}

const MealCard: React.FC<MealCardProps> = React.memo(
  ({ meal, onPress, theme }) => (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.mealCard}>
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
            <Text style={[styles.mealName, { color: theme.colors.text }]}>
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
      </Card>
    </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraCard: {
    padding: 24,
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  cameraButton: {
    width: '100%',
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
    padding: 16,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  mealCard: {
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
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  quickActions: {
    width: '100%',
  },
  quickAction: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
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
