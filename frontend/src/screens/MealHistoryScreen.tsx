import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaContainer } from '@/components/layout';
import { TextInput } from '@/components/base/TextInput';
import { UnifiedButton } from '@/components/base/UnifiedButton';
import { UnifiedCard } from '@/components/base/UnifiedCard';
import { UnifiedIcon, UNIFIED_ICONS } from '@/components/base/UnifiedIcon';
import { UI } from '@/constants/uiConstants';
import { LoadingOverlay, ListSkeleton } from '@/components/base/Loading';
import { ErrorDisplay } from '@/components/base/ErrorDisplay';
import { EmptyState } from '@/components/base/EmptyState';
import { OptimizedList } from '@/components/base/OptimizedList';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import { useDebounce, usePerformanceMonitor } from '@/utils/performance';
import type { Meal } from '@/types/models';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';

interface MealCardProps {
  meal: Meal;
  onPress: (meal: Meal) => void;
  onToggleFavorite: (meal: Meal) => void;
  onDuplicate: (meal: Meal) => void;
  onDelete: (meal: Meal) => void;
}

const MealCard: React.FC<MealCardProps> = React.memo(
  ({ meal, onPress, onToggleFavorite, onDuplicate, onDelete }) => {
    const { theme } = useTheme();

    const formatDate = useCallback((dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }, []);

    const formatCalories = useCallback((calories: number) => {
      return `${Math.round(calories)} cal`;
    }, []);

    return (
      <UnifiedCard
        gradient={true}
        padding="medium"
        borderRadius={spacing['4']}
        onPress={() => onPress(meal)}
        style={styles.mealCard}
        elevated={true}
        animationType="fadeUp"
      >
        <View style={styles.mealHeader}>
          <Text style={[styles.mealName, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <TouchableOpacity onPress={() => onToggleFavorite(meal)} style={styles.favoriteButton}>
            <Text
              style={[
                styles.favoriteIcon,
                { color: meal.isFavorite ? theme.colors.error[500] : theme.colors.text.secondary },
              ]}
            >
              {meal.isFavorite ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mealInfo}>
          <Text style={[styles.mealType, { color: theme.colors.primary[500] }]}>
            {meal.mealType?.charAt(0).toUpperCase() + meal.mealType?.slice(1)}
          </Text>
          <Text style={[styles.mealDate, { color: theme.colors.text.secondary }]}>
            {formatDate(meal.consumedAt)}
          </Text>
        </View>

        <View style={styles.mealNutrition}>
          <Text style={[styles.calories, { color: theme.isDark ? theme.colors.text.primary : '#000000' }]}>
            {formatCalories(meal.totalCalories)}
          </Text>
          <Text style={[styles.macros, { color: theme.isDark ? theme.colors.text.secondary : '#666666' }]}>
            P: {Math.round(meal.totalProtein)}g • C: {Math.round(meal.totalCarbs)}g • F:{' '}
            {Math.round(meal.totalFat)}g
          </Text>
        </View>

        <View style={styles.mealActions}>
          <TouchableOpacity
            onPress={() => onDuplicate(meal)}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary[100] }]}
          >
            <Text style={[styles.actionText, { color: theme.colors.primary[500] }]}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(meal)}
            style={[styles.actionButton, { backgroundColor: theme.colors.error[100] }]}
          >
            <Text style={[styles.actionText, { color: theme.colors.error[500] }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </UnifiedCard>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.meal.id === nextProps.meal.id &&
      prevProps.meal.totalCalories === nextProps.meal.totalCalories &&
      prevProps.meal.isFavorite === nextProps.meal.isFavorite
    );
  }
);

export const MealHistoryScreen: React.FC = React.memo(() => {
  usePerformanceMonitor('MealHistoryScreen');

  const { theme } = useTheme();
  const {
    meals,
    isLoading,
    error,
    filters,
    fetchMeals,
    setFilters,
    clearFilters,
    toggleFavorite,
    duplicateMeal,
    deleteMeal,
    clearError,
  } = useMealStore();

  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Load meals when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [])
  );

  const loadMeals = async () => {
    try {
      await fetchMeals();
    } catch (error) {
      console.error('Failed to load meals:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMeals();
    } catch (error) {
      console.error('Failed to refresh meals:', error);
    }
    setRefreshing(false);
  };

  // Auto-search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery !== filters.search) {
      setFilters({ search: debouncedSearchQuery });
      fetchMeals();
    }
  }, [debouncedSearchQuery]);

  const handleSearch = useCallback(() => {
    setFilters({ search: searchQuery });
    fetchMeals();
  }, [searchQuery, setFilters, fetchMeals]);

  const handleClearSearch = () => {
    setSearchQuery('');
    clearFilters();
    fetchMeals();
  };

  const handleMealPress = (meal: Meal) => {
    // Navigate to meal detail screen
    // navigation.navigate('MealDetail', { mealId: meal.id });
    Alert.alert('Meal Details', `${meal.name}\n${meal.totalCalories} calories`);
  };

  const handleToggleFavorite = async (meal: Meal) => {
    try {
      await toggleFavorite(meal.id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle favorite');
    }
  };

  const handleDuplicate = async (meal: Meal) => {
    try {
      await duplicateMeal(meal.id);
      Alert.alert('Success', 'Meal duplicated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to duplicate meal');
    }
  };

  const handleDelete = (meal: Meal) => {
    Alert.alert('Delete Meal', `Are you sure you want to delete "${meal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal(meal.id);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete meal');
          }
        },
      },
    ]);
  };

  const renderMealCard = ({ item }: { item: Meal }) => (
    <MealCard
      meal={item}
      onPress={handleMealPress}
      onToggleFavorite={handleToggleFavorite}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      image={require('../../assets/logo_cropped.png')}
      title={filters.search ? "No meals found" : "Your meal history is empty"}
      subtitle={
        filters.search
          ? 'Try adjusting your search or filters'
          : 'Start tracking your meals to see nutritional insights and progress over time'
      }
      actionLabel={filters.search ? "Clear Filters" : "Log Your First Meal"}
      onAction={filters.search ? handleClearSearch : () => {
        // Navigate to camera screen
        // navigation.navigate('Camera');
      }}
    />
  );

  if (error) {
    return (
      <SafeAreaContainer style={styles.container}>
        <ErrorDisplay
          error={error}
          onRetry={() => {
            clearError();
            loadMeals();
          }}
        />
      </SafeAreaContainer>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF' }]}>
      <AppHeader 
        title="Meal History"
        subtitle="Track your nutrition journey"
        showLogo={true}
        showUserInfo={true}
      />
      
      <SafeAreaContainer style={styles.contentContainer} edges={['bottom']}>
        <View style={styles.header}>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search meals..."
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={styles.searchInput}
            />
          </View>
          <Button onPress={handleSearch} variant="primary" style={styles.searchButton}>
            Search
          </Button>
        </View>

        {(filters.search || filters.mealType) && (
          <View style={styles.activeFilters}>
            <Text style={[styles.activeFiltersText, { color: theme.colors.text.secondary }]}>
              Active filters
            </Text>
            <Button onPress={handleClearSearch} variant="text" style={styles.clearFiltersButton}>
              Clear All
            </Button>
          </View>
        )}
        </View>

        <OptimizedList
        data={meals}
        renderItem={renderMealCard}
        keyExtractor={(item) => item.id}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          meals.length === 0 && !isLoading && styles.emptyListContent,
        ]}
        itemHeight={140} // Approximate height of MealCard
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={100}
        windowSize={10}
        initialNumToRender={7}
        onEndReached={() => {
          // TODO: Implement pagination
          if (__DEV__) {
            console.log('Load more meals');
          }
        }}
        onEndReachedThreshold={0.5}
      />

      {isLoading && meals.length === 0 && (
        <View style={styles.skeletonContainer}>
          <ListSkeleton count={5} />
        </View>
      )}
      </SafeAreaContainer>
    </View>
  );
});

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
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing['4'],
    paddingBottom: spacing['4'],
  },
  title: {
    ...textPresets.h1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderRadius: 12,
    marginBottom: spacing['2'],
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing['2'],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearchButton: {
    padding: spacing['2'],
    marginLeft: spacing['2'],
  },
  clearSearchIcon: {
    fontSize: 16,
  },
  searchInputWrapper: {
    flex: 1,
    marginRight: spacing['2'],
  },
  searchButton: {
    paddingHorizontal: spacing['4'],
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['3'],
  },
  activeFiltersText: {
    ...textPresets.body,
  },
  clearFiltersButton: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['8'],
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
    marginBottom: 20,
  },
  clearButton: {
    minWidth: 120,
  },
  // Meal Card Styles
  mealCard: {
    marginHorizontal: layout.screenPadding,
    marginVertical: spacing['2'],
    padding: spacing['4'],
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  mealHeader: {
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
  favoriteButton: {
    padding: spacing['2'],
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing['2'],
  },
  favoriteIcon: {
    fontSize: 24,
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeBadge: {
    paddingHorizontal: spacing['2'],
    paddingVertical: spacing['1'],
    borderRadius: 8,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mealDate: {
    fontSize: 14,
  },
  mealNutrition: {
    marginBottom: 12,
  },
  calories: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  macros: {
    fontSize: 14,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: spacing['2'],
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
  mealActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: spacing['3'],
    paddingVertical: spacing['2'],
    borderRadius: 10,
    flex: 1,
    marginHorizontal: spacing['1'],
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
