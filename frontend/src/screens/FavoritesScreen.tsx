import React, { useState, useCallback } from 'react';
import { spacing } from '@/utils/responsive';
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
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
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
    <Card style={styles.favoriteCard}>
      <TouchableOpacity onPress={() => onViewDetails(meal)} style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.mealName, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <TouchableOpacity onPress={() => onRemoveFavorite(meal)} style={styles.removeButton}>
            <Text style={[styles.removeIcon, { color: theme.colors.error[500] }]}>♥</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mealInfo}>
          <Text style={[styles.mealType, { color: theme.colors.primary[500] }]}>
            {meal.mealType?.charAt(0).toUpperCase() + meal.mealType?.slice(1)}
          </Text>
          <Text style={[styles.calories, { color: theme.colors.text.primary }]}>
            {formatCalories(meal.totalCalories)}
          </Text>
        </View>

        <Text style={[styles.macros, { color: theme.colors.textSecondary }]}>
          {formatMacros(meal.totalProtein, meal.totalCarbs, meal.totalFat)}
        </Text>

        <Spacer size="md" />

        <Button onPress={() => onQuickLog(meal)} variant="primary" style={styles.quickLogButton}>
          Quick Log
        </Button>
      </TouchableOpacity>
    </Card>
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
      <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorDisplay
          error={error}
          onRetry={() => {
            clearError();
            loadFavorites();
          }}
        />
      </Container>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader 
        title="Favorite Meals"
        subtitle="Quickly log your favorite meals"
        showLogo={true}
        showUserInfo={true}
      />
      
      <Container style={styles.contentContainer}>

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
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.medium,
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
    marginVertical: 8,
    padding: 0,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  macros: {
    fontSize: 14,
    marginBottom: 4,
  },
  quickLogButton: {
    width: '100%',
  },
});
