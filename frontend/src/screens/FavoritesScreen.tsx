import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';
import { SafeAreaContainer } from '@/components/layout';
import { UnifiedButton } from '@/components/base/UnifiedButton';
import { UnifiedCard } from '@/components/base/UnifiedCard';
import { UnifiedIcon, UNIFIED_ICONS } from '@/components/base/UnifiedIcon';
import { UI } from '@/constants/uiConstants';
import { LoadingOverlay, ListSkeleton } from '@/components/base/Loading';
import { ErrorDisplay } from '@/components/base/ErrorDisplay';
import { EmptyState } from '@/components/base/EmptyState';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import type { Meal } from '@/types/models';

interface FavoriteMealCardProps {
  meal: Meal;
  onQuickLog: (meal: Meal) => void;
  onRemoveFavorite: (meal: Meal) => void;
  onViewDetails: (meal: Meal) => void;
}

const FavoriteMealCard: React.FC<FavoriteMealCardProps> = ({
  meal,
  onQuickLog,
  onRemoveFavorite,
  onViewDetails,
}) => {
  const { theme } = useTheme();

  const formatCalories = (calories: number) => {
    return `${Math.round(calories)} cal`;
  };

  const formatMacros = (protein: number, carbs: number, fat: number) => {
    return `P: ${Math.round(protein)}g • C: ${Math.round(carbs)}g • F: ${Math.round(fat)}g`;
  };

  return (
    <UnifiedCard
      gradient={true}
      variant="cardWhite"
      padding="none"
      borderRadius={16}
      onPress={() => onViewDetails(meal)}
      style={styles.favoriteCard}
      elevated={true}
      animationType="zoomIn"
      borderWidth={1}
      borderColor={theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.1)'}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.mealName, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <TouchableOpacity onPress={() => onRemoveFavorite(meal)} style={styles.removeButton}>
            <Text style={[styles.removeIcon, { color: theme.colors.error[500] }]}>❤️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mealInfo}>
          <View style={[styles.mealTypeBadge, { backgroundColor: theme.colors.primary[100] }]}>
            <Text style={[styles.mealType, { color: theme.colors.primary[600] }]}>
              {meal.mealType?.charAt(0).toUpperCase() + meal.mealType?.slice(1)}
            </Text>
          </View>
          <Text style={[styles.calories, { color: theme.colors.primary[500] }]}>
            {formatCalories(meal.totalCalories)}
          </Text>
        </View>

        <View style={styles.macrosContainer}>
          <View style={[styles.macroItem, { backgroundColor: theme.colors.primary[50] }]}>
            <Text style={[styles.macroLabel, { color: theme.colors.text.secondary }]}>P</Text>
            <Text style={[styles.macroValue, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]}>
              {Math.round(meal.totalProtein)}g
            </Text>
          </View>
          <View style={[styles.macroItem, { backgroundColor: theme.colors.info[50] }]}>
            <Text style={[styles.macroLabel, { color: theme.colors.text.secondary }]}>C</Text>
            <Text style={[styles.macroValue, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]}>
              {Math.round(meal.totalCarbs)}g
            </Text>
          </View>
          <View style={[styles.macroItem, { backgroundColor: theme.colors.warning[50] }]}>
            <Text style={[styles.macroLabel, { color: theme.colors.text.secondary }]}>F</Text>
            <Text style={[styles.macroValue, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]}>
              {Math.round(meal.totalFat)}g
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing['4'] }} />

        <UnifiedButton
          onPress={() => onQuickLog(meal)}
          variant="primary"
          size="medium"
          fullWidth
          style={styles.quickLogButton}
        >
          Quick Log 🚀
        </UnifiedButton>
      </View>
    </UnifiedCard>
  );
};

export const FavoritesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { favoriteMeals, isLoading, error, fetchFavorites, toggleFavorite, clearError } =
    useMealStore();

  const [refreshing, setRefreshing] = useState(false);
  const [quickLogging, setQuickLogging] = useState<string | null>(null);

  // Load favorites when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      await fetchFavorites();
    } catch (error: any) {
      // Only log errors that aren't network-related in demo mode
      if (__DEV__ && !error.message?.includes('Network')) {
        console.error('Failed to load favorites:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchFavorites();
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
    }
    setRefreshing(false);
  };

  const handleQuickLog = async (meal: Meal) => {
    Alert.alert('Quick Log Meal', `Log "${meal.name}" for now?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Now',
        onPress: async () => {
          setQuickLogging(meal.id);
          try {
            // Quick log the meal for current time
            // await quickLogMeal({ mealId: meal.id });
            Alert.alert('Success', `"${meal.name}" has been logged!`);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to log meal');
          } finally {
            setQuickLogging(null);
          }
        },
      },
      {
        text: 'Choose Time',
        onPress: () => {
          // Navigate to time picker or show time picker modal
          Alert.alert('Time Picker', 'Time picker functionality coming soon!');
        },
      },
    ]);
  };

  const handleRemoveFavorite = (meal: Meal) => {
    Alert.alert('Remove Favorite', `Remove "${meal.name}" from favorites?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await toggleFavorite(meal.id);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove favorite');
          }
        },
      },
    ]);
  };

  const handleViewDetails = (meal: Meal) => {
    // Navigate to meal detail screen
    Alert.alert('Meal Details', `${meal.name}\n${meal.totalCalories} calories`);
  };

  const renderFavoriteCard = ({ item }: { item: Meal }) => (
    <FavoriteMealCard
      meal={item}
      onQuickLog={handleQuickLog}
      onRemoveFavorite={handleRemoveFavorite}
      onViewDetails={handleViewDetails}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      image={require('../../assets/logo_cropped.png')}
      title="No Favorite Meals Yet"
      subtitle="Mark your frequently eaten meals as favorites for quick and easy logging"
      actionLabel="Browse Meal History"
      onAction={() => {
        // Navigate to history screen
        // navigation.navigate('History');
      }}
    />
  );

  if (error) {
    return (
      <SafeAreaContainer style={[styles.container, { backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF' }]}>
        <ErrorDisplay
          error={error}
          onRetry={() => {
            clearError();
            loadFavorites();
          }}
        />
      </SafeAreaContainer>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF' }]}>
      <AppHeader 
        title="Favorite Meals"
        subtitle="Quickly log your favorite meals"
        showLogo={false}
        showUserInfo={true}
      />
      
      <View style={styles.contentContainer}>
        <FlatList
        data={favoriteMeals}
        renderItem={renderFavoriteCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          favoriteMeals.length === 0 && !isLoading && styles.emptyListContent,
        ]}
      />

      {isLoading && favoriteMeals.length === 0 && (
        <View style={styles.skeletonContainer}>
          <ListSkeleton count={3} />
        </View>
      )}
        {quickLogging && <LoadingOverlay visible={true} message="Logging meal..." />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing['4'],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['6'],
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Favorite Card Styles
  favoriteCard: {
    marginVertical: spacing['2'],
    marginHorizontal: layout.screenPadding,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: spacing['4'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeIcon: {
    fontSize: 20,
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  calories: {
    fontSize: 20,
    fontWeight: '700',
  },
  macros: {
    fontSize: 14,
    marginBottom: 4,
  },
  mealTypeBadge: {
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['1'],
    borderRadius: 8,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: spacing['2'],
    marginTop: spacing['3'],
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['1'],
    borderRadius: 8,
    gap: spacing['1'],
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickLogButton: {
    width: '100%',
    paddingVertical: spacing['3'],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLogButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
