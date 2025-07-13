import React, { useMemo } from 'react';
import { rs } from '@/utils/responsive';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedCard } from '@/components/base/AnimatedCard';
import { ProgressRing } from '@/components/base/ProgressRing';
import { Row } from '@/components/layout';
import { useTheme } from '@/hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

interface MealTimingData {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
}

interface NutritionDashboardProps {
  nutritionData: NutritionData;
  goals: NutritionGoals;
  mealTiming: MealTimingData;
  weeklyData?: Array<{ day: string; calories: number }>;
  onExport?: () => void;
}

export const NutritionDashboard: React.FC<NutritionDashboardProps> = ({
  nutritionData,
  goals,
  mealTiming,
  weeklyData = [],
  onExport,
}) => {
  const { theme } = useTheme();

  // Calculate percentages
  const percentages = useMemo(() => ({
    calories: Math.min((nutritionData.calories / goals.calories) * 100, 100),
    protein: Math.min((nutritionData.protein / goals.protein) * 100, 100),
    carbs: Math.min((nutritionData.carbs / goals.carbs) * 100, 100),
    fat: Math.min((nutritionData.fat / goals.fat) * 100, 100),
    fiber: Math.min((nutritionData.fiber / goals.fiber) * 100, 100),
  }), [nutritionData, goals]);

  // Calculate macro distribution
  const macroDistribution = useMemo(() => {
    const totalCalories = nutritionData.protein * 4 + nutritionData.carbs * 4 + nutritionData.fat * 9;
    if (totalCalories === 0) return { protein: 0, carbs: 0, fat: 0 };
    
    return {
      protein: ((nutritionData.protein * 4) / totalCalories) * 100,
      carbs: ((nutritionData.carbs * 4) / totalCalories) * 100,
      fat: ((nutritionData.fat * 9) / totalCalories) * 100,
    };
  }, [nutritionData]);

  // Find max value for weekly chart scaling
  const maxWeeklyCalories = Math.max(...weeklyData.map(d => d.calories), goals.calories);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Nutrition Dashboard
        </Text>
        {onExport && (
          <TouchableOpacity onPress={onExport} style={styles.exportButton}>
            <Text style={[styles.exportText, { color: theme.colors.primary[500] }]}>
              Export 📊
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily Overview */}
      <AnimatedCard animationType="fadeIn" delay={100} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
          Daily Overview
        </Text>
        
        <View style={styles.overviewContainer}>
          <View style={styles.mainProgress}>
            <ProgressRing
              progress={percentages.calories}
              size={120}
              strokeWidth={12}
              color={theme.colors.primary[500]}
            />
            <View style={styles.mainProgressLabel}>
              <Text style={[styles.calorieValue, { color: theme.colors.text.primary }]}>
                {nutritionData.calories}
              </Text>
              <Text style={[styles.calorieLabel, { color: theme.colors.textSecondary }]}>
                of {goals.calories} cal
              </Text>
            </View>
          </View>

          <View style={styles.macroContainer}>
            <MacroProgress
              label="Protein"
              value={nutritionData.protein}
              goal={goals.protein}
              percentage={percentages.protein}
              color="#10b981"
              unit="g"
            />
            <MacroProgress
              label="Carbs"
              value={nutritionData.carbs}
              goal={goals.carbs}
              percentage={percentages.carbs}
              color="#f59e0b"
              unit="g"
            />
            <MacroProgress
              label="Fat"
              value={nutritionData.fat}
              goal={goals.fat}
              percentage={percentages.fat}
              color="#ef4444"
              unit="g"
            />
          </View>
        </View>
      </AnimatedCard>

      {/* Macro Distribution */}
      <AnimatedCard animationType="slideUp" delay={200} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
          Macro Distribution
        </Text>
        
        <View style={styles.distributionContainer}>
          <View style={styles.pieChart}>
            <MacroPieChart distribution={macroDistribution} />
          </View>
          
          <View style={styles.legendContainer}>
            <LegendItem label="Protein" percentage={macroDistribution.protein} color="#10b981" />
            <LegendItem label="Carbs" percentage={macroDistribution.carbs} color="#f59e0b" />
            <LegendItem label="Fat" percentage={macroDistribution.fat} color="#ef4444" />
          </View>
        </View>
      </AnimatedCard>

      {/* Meal Timing */}
      <AnimatedCard animationType="slideUp" delay={300} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
          Meal Timing Distribution
        </Text>
        
        <View style={styles.mealTimingContainer}>
          <MealTimingBar
            label="Breakfast"
            value={mealTiming.breakfast}
            total={nutritionData.calories}
            icon="☀️"
            theme={theme}
          />
          <MealTimingBar
            label="Lunch"
            value={mealTiming.lunch}
            total={nutritionData.calories}
            icon="🌞"
            theme={theme}
          />
          <MealTimingBar
            label="Dinner"
            value={mealTiming.dinner}
            total={nutritionData.calories}
            icon="🌙"
            theme={theme}
          />
          <MealTimingBar
            label="Snacks"
            value={mealTiming.snacks}
            total={nutritionData.calories}
            icon="🍿"
            theme={theme}
          />
        </View>
      </AnimatedCard>

      {/* Weekly Trend */}
      {weeklyData.length > 0 && (
        <AnimatedCard animationType="slideUp" delay={400} style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
            Weekly Trend
          </Text>
          
          <View style={styles.weeklyChart}>
            {weeklyData.map((day, index) => (
              <View key={day.day} style={styles.dayColumn}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar,
                      {
                        height: `${(day.calories / maxWeeklyCalories) * 100}%`,
                        backgroundColor: day.calories > goals.calories 
                          ? theme.colors.error[500] 
                          : theme.colors.primary[500],
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.dayLabel, { color: theme.colors.textSecondary }]}>
                  {day.day}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.goalLine}>
            <View style={[styles.goalLineDashed, { borderColor: theme.colors.primary[300] }]} />
            <Text style={[styles.goalLineLabel, { color: theme.colors.primary[500] }]}>
              Goal: {goals.calories} cal
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* Micronutrients */}
      <AnimatedCard animationType="slideUp" delay={500} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
          Micronutrients
        </Text>
        
        <View style={styles.microContainer}>
          <MicronutrientItem
            label="Fiber"
            value={nutritionData.fiber}
            goal={goals.fiber}
            unit="g"
            icon="🌾"
            theme={theme}
          />
          <MicronutrientItem
            label="Sugar"
            value={nutritionData.sugar}
            goal={50} // Default goal
            unit="g"
            icon="🍬"
            theme={theme}
          />
          <MicronutrientItem
            label="Sodium"
            value={nutritionData.sodium}
            goal={2300} // Default goal
            unit="mg"
            icon="🧂"
            theme={theme}
          />
          <MicronutrientItem
            label="Water"
            value={8} // Mock data
            goal={goals.water}
            unit="cups"
            icon="💧"
            theme={theme}
          />
        </View>
      </AnimatedCard>
    </ScrollView>
  );
};

// Sub-components
const MacroProgress: React.FC<{
  label: string;
  value: number;
  goal: number;
  percentage: number;
  color: string;
  unit: string;
}> = ({ label, value, goal, percentage, color, unit }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.macroItem}>
      <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <ProgressRing
        progress={percentage}
        size={60}
        strokeWidth={6}
        color={color}
      />
      <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
        {value}{unit}
      </Text>
      <Text style={[styles.macroGoal, { color: theme.colors.textSecondary }]}>
        of {goal}{unit}
      </Text>
    </View>
  );
};

const MacroPieChart: React.FC<{ distribution: any }> = ({ distribution }) => {
  // Simple visual representation - in production, use a proper chart library
  return (
    <View style={styles.pieChartVisual}>
      <LinearGradient
        colors={['#10b981', '#f59e0b', '#ef4444']}
        style={styles.pieGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
};

const LegendItem: React.FC<{ label: string; percentage: number; color: string }> = ({ 
  label, 
  percentage, 
  color 
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.colors.text.primary }]}>
        {label}
      </Text>
      <Text style={[styles.legendValue, { color: theme.colors.textSecondary }]}>
        {percentage.toFixed(0)}%
      </Text>
    </View>
  );
};

const MealTimingBar: React.FC<{
  label: string;
  value: number;
  total: number;
  icon: string;
  theme: any;
}> = ({ label, value, total, icon, theme }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <View style={styles.timingItem}>
      <View style={styles.timingHeader}>
        <Text style={styles.timingIcon}>{icon}</Text>
        <Text style={[styles.timingLabel, { color: theme.colors.text.primary }]}>
          {label}
        </Text>
        <Text style={[styles.timingValue, { color: theme.colors.textSecondary }]}>
          {value} cal
        </Text>
      </View>
      <View style={[styles.timingBarBg, { backgroundColor: theme.colors.neutral[200] }]}>
        <LinearGradient
          colors={[theme.colors.primary[400], theme.colors.primary[600]]}
          style={[styles.timingBar, { width: `${percentage}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
};

const MicronutrientItem: React.FC<{
  label: string;
  value: number;
  goal: number;
  unit: string;
  icon: string;
  theme: any;
}> = ({ label, value, goal, unit, icon, theme }) => {
  const percentage = Math.min((value / goal) * 100, 100);
  const isOverGoal = value > goal;
  
  return (
    <View style={styles.microItem}>
      <Text style={styles.microIcon}>{icon}</Text>
      <Text style={[styles.microLabel, { color: theme.colors.text.primary }]}>
        {label}
      </Text>
      <Text style={[
        styles.microValue, 
        { color: isOverGoal ? theme.colors.error : theme.colors.text.primary }
      ]}>
        {value}{unit}
      </Text>
      <View style={[styles.microBar, { backgroundColor: theme.colors.neutral[200] }]}>
        <View 
          style={[
            styles.microProgress, 
            { 
              width: `${percentage}%`,
              backgroundColor: isOverGoal ? theme.colors.error : theme.colors.success,
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  exportButton: {
    padding: 8,
  },
  exportText: {
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainProgress: {
    position: 'relative',
    marginRight: 24,
  },
  mainProgressLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -20 }],
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  calorieLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  macroContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  macroGoal: {
    fontSize: 10,
    marginTop: 2,
  },
  distributionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieChart: {
    marginRight: 24,
  },
  pieChartVisual: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  pieGradient: {
    flex: 1,
  },
  legendContainer: {
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealTimingContainer: {
    gap: 12,
  },
  timingItem: {
    marginBottom: 12,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  timingLabel: {
    flex: 1,
    fontSize: 14,
  },
  timingValue: {
    fontSize: 14,
  },
  timingBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timingBar: {
    height: '100%',
    borderRadius: 4,
  },
  weeklyChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '60%',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 12,
  },
  goalLine: {
    position: 'relative',
  },
  goalLineDashed: {
    position: 'absolute',
    top: -135,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderStyle: 'dashed',
  },
  goalLineLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  microContainer: {
    gap: 12,
  },
  microItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  microIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  microLabel: {
    flex: 1,
    fontSize: 14,
  },
  microValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  microBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  microProgress: {
    height: '100%',
    borderRadius: 3,
  },
});