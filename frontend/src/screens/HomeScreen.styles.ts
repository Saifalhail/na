import { StyleSheet } from 'react-native';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { textPresets } from '@/theme/typography';

// Static styles that don't depend on theme
export const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing['4'], // 16px
    paddingBottom: spacing['24'], // 96px for bottom tab + content
    gap: spacing['6'], // 24px between sections
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['4'], // 16px
    paddingHorizontal: spacing['2'], // 8px
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing['3'], // 12px
  },
  headerLogo: {
    width: spacing['10'], // 40px
    height: spacing['10'], // 40px
  },
  greetingContainer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'], // 12px
  },
  streakContainer: {
    alignItems: 'center',
  },
  // Progress
  progressCard: {
    alignItems: 'center',
  },
  calorieSection: {
    alignItems: 'center',
    marginVertical: spacing['6'], // 24px
  },
  calorieRing: {
    marginBottom: spacing['2'], // 8px
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: spacing['4'], // 16px
    borderTopWidth: 1,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  // Camera
  cameraCard: {
    marginVertical: 0,
  },
  cameraContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cameraIconContainer: {
    width: spacing['12'], // 48px
    height: spacing['12'], // 48px
    borderRadius: spacing['6'], // 24px
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing['4'], // 16px
  },
  cameraTextContainer: {
    flex: 1,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing['3'], // 12px
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: spacing['10'], // 40px
    height: spacing['10'], // 40px
    borderRadius: spacing['5'], // 20px
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3'], // 12px
  },
  // Sections
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['4'], // 16px
  },
  // Meals
  mealsContainer: {
    gap: spacing['3'], // 12px
  },
  mealCard: {
    marginVertical: 0,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: spacing['12'], // 48px
    height: spacing['12'], // 48px
    marginBottom: spacing['4'], // 16px
    opacity: 0.6,
  },
  // Quick Actions
  // Nutrition Tips
  tipCard: {
    marginTop: spacing['3'], // 12px
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'], // 12px
  },
  tipIconContainer: {
    width: spacing['10'], // 40px
    height: spacing['10'], // 40px
    borderRadius: spacing['5'], // 20px
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTextContainer: {
    flex: 1,
    gap: spacing['1'], // 4px
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing['3'], // 12px
    marginTop: spacing['4'], // 16px
  },
  quickActionButton: {
    flex: 1,
  },
  // Macro progress bars
  macroProgress: {
    width: spacing['8'], // 32px
    height: spacing['1'], // 4px
    borderRadius: spacing['0.5'], // 2px
  },
});

// Dynamic styles that depend on theme
export const createDynamicStyles = (theme: Theme, insets: any) => ({
  container: {
    backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF',
    paddingTop: insets.top,
  },
  // Text styles
  greeting: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    marginBottom: spacing['0.5'], // 2px
  },
  userName: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  streakNumber: {
    ...textPresets.h3,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.bold,
  },
  streakLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  calorieValue: {
    ...textPresets.h2,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  calorieLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
  },
  calorieUnit: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
  },
  macroValue: {
    ...textPresets.body,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: spacing['1'], // 4px
  },
  macroLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    marginBottom: spacing['2'], // 8px
  },
  cameraIconContainer: {
    backgroundColor: theme.colors.primary[50],
  },
  cameraTitle: {
    ...textPresets.body,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: spacing['0.5'], // 2px
  },
  cameraSubtitle: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
  },
  statValue: {
    ...textPresets.h3,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: spacing['1'], // 4px
  },
  statLabel: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  seeAllText: {
    ...textPresets.body,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyText: {
    ...textPresets.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2'], // 8px
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptySubtext: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  tipTitle: {
    ...textPresets.body,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: spacing['1'], // 4px
  },
  tipText: {
    ...textPresets.caption,
    color: theme.colors.text.secondary,
    lineHeight: spacing['5'], // 20px
  },
  // Borders
  macroRow: {
    borderTopColor: theme.colors.border,
  },
});

// Meal card styles (separate for better performance)
export const mealCardStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'], // 12px
  },
  image: {
    borderRadius: spacing['2'], // 8px
  },
  info: {
    flex: 1,
  },
  name: {
    ...textPresets.body,
    fontWeight: '500',
    marginBottom: spacing['0.5'], // 2px
  },
  time: {
    ...textPresets.caption,
  },
  calories: {
    ...textPresets.body,
    fontWeight: '600',
  },
});