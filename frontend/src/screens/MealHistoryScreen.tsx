import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Container, Spacer } from '@/components/layout';
import { TextInput } from '@/components/base/TextInput';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { LoadingOverlay } from '@/components/base/Loading';
import { ErrorDisplay } from '@/components/base/ErrorDisplay';
import { OptimizedList } from '@/components/base/OptimizedList';
import { OptimizedImage } from '@/components/base/OptimizedImage';
import { useTheme } from '@/hooks/useTheme';
import { useMealStore } from '@/store/mealStore';
import { useDebounce, usePerformanceMonitor } from '@/utils/performance';
import type { Meal } from '@/types/models';

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
      <Card style={styles.mealCard} onPress={() => onPress(meal)}>
        <View style={styles.mealHeader}>
          <Text style={[styles.mealName, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <TouchableOpacity onPress={() => onToggleFavorite(meal)} style={styles.favoriteButton}>
            <Text
              style={[
                styles.favoriteIcon,
                { color: meal.isFavorite ? theme.colors.error[500] : theme.colors.textSecondary },
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
          <Text style={[styles.mealDate, { color: theme.colors.textSecondary }]}>
            {formatDate(meal.consumedAt)}
          </Text>
        </View>

        <View style={styles.mealNutrition}>
          <Text style={[styles.calories, { color: theme.colors.text.primary }]}>
            {formatCalories(meal.totalCalories)}
          </Text>
          <Text style={[styles.macros, { color: theme.colors.textSecondary }]}>
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
      </Card>
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
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>No meals found</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {filters.search
          ? 'Try adjusting your search or filters'
          : 'Start logging your meals to see them here'}
      </Text>
      {filters.search && (
        <Button onPress={handleClearSearch} variant="outline" style={styles.clearButton}>
          Clear Filters
        </Button>
      )}
    </View>
  );

  if (error) {
    return (
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorDisplay
          error={error}
          onRetry={() => {
            clearError();
            loadMeals();
          }}
        />
      </Container>
    );
  }

  return (
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Meal History</Text>

        <Spacer size="md" />

        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search meals..."
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            style={styles.searchInput}
          />
          <Button onPress={handleSearch} variant="primary" style={styles.searchButton}>
            Search
          </Button>
        </View>

        {(filters.search || filters.mealType) && (
          <View style={styles.activeFilters}>
            <Text style={[styles.activeFiltersText, { color: theme.colors.textSecondary }]}>
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
          console.log('Load more meals');
        }}
        onEndReachedThreshold={0.5}
      />

      {isLoading && <LoadingOverlay visible={true} message="Loading meals..." />}
    </Container>
  );
});

const styles = StyleSheet.create({
  container: {
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
  },
  searchButton: {
    paddingHorizontal: 20,
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  activeFiltersText: {
    fontSize: 14,
  },
  clearFiltersButton: {
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginVertical: 8,
    padding: 16,
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
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  mealDate: {
    fontSize: 14,
  },
  mealNutrition: {
    marginBottom: 12,
  },
  calories: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macros: {
    fontSize: 14,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
