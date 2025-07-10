import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { Container, Spacer, Row } from '@/components/layout';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { LoadingOverlay } from '@/components/base/Loading';
import { Badge } from '@/components/base/Badge';
import { ProgressBar } from '@/components/base/ProgressBar';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useMealStore } from '@/store/mealStore';
import { MainStackParamList } from '@/navigation/types';
import { formatDate } from '@/utils/formatting';
import { userApi } from '@/services/api/endpoints/user';

type ProfileScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

interface HealthMetrics {
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  age: number;
  gender: 'male' | 'female' | 'other';
  bmi?: number;
  bmr?: number;
  tdee?: number;
}

interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

interface DietaryRestriction {
  id: string;
  name: string;
  selected: boolean;
}

const DIETARY_RESTRICTIONS: DietaryRestriction[] = [
  { id: 'vegetarian', name: 'Vegetarian', selected: false },
  { id: 'vegan', name: 'Vegan', selected: false },
  { id: 'gluten_free', name: 'Gluten Free', selected: false },
  { id: 'dairy_free', name: 'Dairy Free', selected: false },
  { id: 'nut_free', name: 'Nut Free', selected: false },
  { id: 'keto', name: 'Keto', selected: false },
  { id: 'paleo', name: 'Paleo', selected: false },
  { id: 'halal', name: 'Halal', selected: false },
  { id: 'kosher', name: 'Kosher', selected: false },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', description: '1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', description: '3-5 days/week' },
  { value: 'active', label: 'Active', description: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Physical job or athlete' },
];

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { logout, user: authUser } = useAuthStore();
  const { user, updateProfile, isLoading } = useUserStore();
  const { todayStats } = useMealStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showDietaryModal, setShowDietaryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    height: user?.height || 170,
    weight: user?.weight || 70,
    activityLevel: user?.activity_level || 'moderate',
    age: user?.age || 25,
    gender: user?.gender || 'other',
  });

  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({
    calories: user?.daily_calorie_goal || 2000,
    protein: user?.daily_protein_goal || 50,
    carbs: user?.daily_carbs_goal || 250,
    fat: user?.daily_fat_goal || 65,
    fiber: user?.daily_fiber_goal || 25,
    water: user?.daily_water_goal || 2000,
  });

  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>(
    DIETARY_RESTRICTIONS.map((restriction) => ({
      ...restriction,
      selected: user?.dietary_restrictions?.includes(restriction.id) || false,
    }))
  );

  const [notificationSettings, setNotificationSettings] = useState({
    meal_reminders: user?.notification_preferences?.meal_reminders || false,
    daily_summary: user?.notification_preferences?.daily_summary || false,
    weekly_report: user?.notification_preferences?.weekly_report || false,
    achievements: user?.notification_preferences?.achievements || false,
  });

  useEffect(() => {
    calculateHealthMetrics();
  }, [
    healthMetrics.height,
    healthMetrics.weight,
    healthMetrics.age,
    healthMetrics.gender,
    healthMetrics.activityLevel,
  ]);

  const calculateHealthMetrics = () => {
    const heightInM = healthMetrics.height / 100;
    const bmi = healthMetrics.weight / (heightInM * heightInM);

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr = 0;
    if (healthMetrics.gender === 'male') {
      bmr = 10 * healthMetrics.weight + 6.25 * healthMetrics.height - 5 * healthMetrics.age + 5;
    } else {
      bmr = 10 * healthMetrics.weight + 6.25 * healthMetrics.height - 5 * healthMetrics.age - 161;
    }

    // Calculate TDEE based on activity level
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[healthMetrics.activityLevel];

    setHealthMetrics((prev) => ({
      ...prev,
      bmi: Math.round(bmi * 10) / 10,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    }));
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileData);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSaveHealthMetrics = async () => {
    try {
      await updateProfile({
        height: healthMetrics.height,
        weight: healthMetrics.weight,
        activity_level: healthMetrics.activityLevel,
        age: healthMetrics.age,
        gender: healthMetrics.gender,
      });
      setShowHealthModal(false);
      Alert.alert('Success', 'Health metrics updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update health metrics');
    }
  };

  const handleSaveGoals = async () => {
    try {
      await updateProfile({
        daily_calorie_goal: nutritionGoals.calories,
        daily_protein_goal: nutritionGoals.protein,
        daily_carbs_goal: nutritionGoals.carbs,
        daily_fat_goal: nutritionGoals.fat,
        daily_fiber_goal: nutritionGoals.fiber,
        daily_water_goal: nutritionGoals.water,
      });
      setShowGoalsModal(false);
      Alert.alert('Success', 'Nutrition goals updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update nutrition goals');
    }
  };

  const handleSaveDietaryRestrictions = async () => {
    try {
      const selectedRestrictions = dietaryRestrictions.filter((r) => r.selected).map((r) => r.id);

      await updateProfile({
        dietary_restrictions: selectedRestrictions,
      });
      setShowDietaryModal(false);
      Alert.alert('Success', 'Dietary preferences updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update dietary preferences');
    }
  };

  const handleAvatarChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      // TODO: Upload avatar to server
      Alert.alert('Coming Soon', 'Avatar upload will be available soon!');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userApi.deleteAccount();
      logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account');
    }
  };

  const handleExportData = async () => {
    try {
      const data = await userApi.exportUserData();
      Alert.alert('Success', 'Your data has been sent to your email');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getAccountTypeInfo = () => {
    const accountType = user?.account_type || 'free';
    const types = {
      free: { label: 'Free', color: theme.colors.neutral[500], icon: '🆓' },
      premium: { label: 'Premium', color: theme.colors.primary[500], icon: '⭐' },
      professional: { label: 'Professional', color: theme.colors.secondary[500], icon: '💎' },
    };
    return types[accountType] || types.free;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3498db' };
    if (bmi < 25) return { label: 'Normal', color: '#2ecc71' };
    if (bmi < 30) return { label: 'Overweight', color: '#f39c12' };
    return { label: 'Obese', color: '#e74c3c' };
  };

  const accountType = getAccountTypeInfo();

  return (
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('NotificationScreen')}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <Spacer size="xl" />

        {/* Profile Info */}
        <Card style={styles.profileCard}>
          <TouchableOpacity onPress={handleAvatarChange}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary[500] }]}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.colors.background }]}>
                  {(user?.first_name?.[0] || 'U').toUpperCase()}
                </Text>
              )}
              <View style={styles.avatarEdit}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Spacer size="lg" />

          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Badge
              text={accountType.label}
              color={accountType.color}
              icon={accountType.icon}
              style={styles.accountBadge}
            />
          </View>

          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>

          <Text style={[styles.joinDate, { color: theme.colors.textSecondary }]}>
            Member since {formatDate(user?.created_at || new Date().toISOString())}
          </Text>

          <Spacer size="lg" />

          <Button
            title="Edit Profile"
            onPress={() => setShowEditModal(true)}
            variant="outline"
            style={styles.editButton}
          />
        </Card>

        <Spacer size="xl" />

        {/* Today's Progress */}
        <Card style={styles.progressCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Progress</Text>

          <Spacer size="lg" />

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.colors.text }]}>Calories</Text>
              <Text style={[styles.progressValue, { color: theme.colors.primary[500] }]}>
                {todayStats.calories} / {nutritionGoals.calories}
              </Text>
            </View>
            <ProgressBar
              progress={todayStats.calories / nutritionGoals.calories}
              color={theme.colors.primary[500]}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                {todayStats.protein}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Carbs</Text>
              <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                {todayStats.carbs}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Fat</Text>
              <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                {todayStats.fat}g
              </Text>
            </View>
          </View>
        </Card>

        <Spacer size="xl" />

        {/* Health Metrics */}
        <Card style={styles.healthCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Health Metrics</Text>
            <TouchableOpacity onPress={() => setShowHealthModal(true)}>
              <Text style={[styles.editLink, { color: theme.colors.primary[500] }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Spacer size="lg" />

          <View style={styles.metricsGrid}>
            {healthMetrics.bmi && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                  {healthMetrics.bmi}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>BMI</Text>
                <Text
                  style={[
                    styles.metricCategory,
                    { color: getBMICategory(healthMetrics.bmi).color },
                  ]}
                >
                  {getBMICategory(healthMetrics.bmi).label}
                </Text>
              </View>
            )}

            {healthMetrics.bmr && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                  {healthMetrics.bmr}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>BMR</Text>
                <Text style={[styles.metricCategory, { color: theme.colors.textSecondary }]}>
                  kcal/day
                </Text>
              </View>
            )}

            {healthMetrics.tdee && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.colors.text }]}>
                  {healthMetrics.tdee}
                </Text>
                <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
                  TDEE
                </Text>
                <Text style={[styles.metricCategory, { color: theme.colors.textSecondary }]}>
                  kcal/day
                </Text>
              </View>
            )}
          </View>

          <Spacer size="md" />

          <View style={[styles.metricDetails, { backgroundColor: theme.colors.surface }]}>
            <MetricRow label="Height" value={`${healthMetrics.height} cm`} theme={theme} />
            <MetricRow label="Weight" value={`${healthMetrics.weight} kg`} theme={theme} />
            <MetricRow
              label="Activity"
              value={
                ACTIVITY_LEVELS.find((a) => a.value === healthMetrics.activityLevel)?.label || ''
              }
              theme={theme}
            />
          </View>
        </Card>

        <Spacer size="xl" />

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>

          <Spacer size="lg" />

          <SettingItem
            title="Nutrition Goals"
            subtitle="Set your daily targets"
            icon="🎯"
            onPress={() => setShowGoalsModal(true)}
            theme={theme}
            showBadge={false}
          />

          <SettingItem
            title="Dietary Preferences"
            subtitle={`${dietaryRestrictions.filter((r) => r.selected).length} restrictions set`}
            icon="🥗"
            onPress={() => setShowDietaryModal(true)}
            theme={theme}
            showBadge={dietaryRestrictions.filter((r) => r.selected).length > 0}
          />

          <SettingItem
            title="Two-Factor Authentication"
            subtitle={authUser?.two_factor_enabled ? 'Enabled' : 'Secure your account'}
            icon="🔐"
            onPress={() => navigation.navigate('TwoFactorSetup')}
            theme={theme}
            showBadge={authUser?.two_factor_enabled}
          />

          <SettingItem
            title="Notifications"
            subtitle="Manage your alerts"
            icon="🔔"
            onPress={() => navigation.navigate('NotificationScreen')}
            theme={theme}
            showBadge={false}
          />

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                  {themeMode === 'dark' ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
              thumbColor={theme.colors.background}
            />
          </View>

          <SettingItem
            title="Privacy & Security"
            subtitle="Manage your data"
            icon="🔒"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
            theme={theme}
            showBadge={false}
          />

          <SettingItem
            title="Help & Support"
            subtitle="Get help or contact us"
            icon="❓"
            onPress={() => Alert.alert('Help & Support', 'Contact us at support@nutritionai.app')}
            theme={theme}
            showBadge={false}
          />
        </Card>

        <Spacer size="xl" />

        {/* Account Actions */}
        <Card style={styles.accountCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>

          <Spacer size="lg" />

          <TouchableOpacity onPress={handleExportData} style={styles.accountAction}>
            <Text style={[styles.accountActionText, { color: theme.colors.primary[500] }]}>
              Export My Data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowDeleteModal(true)} style={styles.accountAction}>
            <Text style={[styles.accountActionText, { color: theme.colors.error[500] }]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </Card>

        <Spacer size="xl" />

        {/* Logout */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        />

        <Spacer size="xxl" />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile">
        <View style={styles.modalContent}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={profileData.first_name}
            onChangeText={(text) => setProfileData({ ...profileData, first_name: text })}
            placeholder="First Name"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Spacer size="md" />

          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={profileData.last_name}
            onChangeText={(text) => setProfileData({ ...profileData, last_name: text })}
            placeholder="Last Name"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Spacer size="md" />

          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={profileData.phone}
            onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
            placeholder="Phone Number"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="phone-pad"
          />

          <Spacer size="lg" />

          <Button
            title="Save Changes"
            onPress={handleSaveProfile}
            variant="primary"
            fullWidth
            loading={isLoading}
          />
        </View>
      </Modal>

      {/* Health Metrics Modal */}
      <Modal
        visible={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        title="Health Metrics"
      >
        <ScrollView style={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Height (cm)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={healthMetrics.height.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, height: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={healthMetrics.weight.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, weight: parseFloat(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Age</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={healthMetrics.age.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, age: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Activity Level</Text>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.radioOption,
                    healthMetrics.activityLevel === level.value && styles.radioOptionSelected,
                    healthMetrics.activityLevel === level.value && {
                      backgroundColor: theme.colors.primary[100],
                    },
                  ]}
                  onPress={() =>
                    setHealthMetrics({ ...healthMetrics, activityLevel: level.value as any })
                  }
                >
                  <View style={styles.radioCircle}>
                    {healthMetrics.activityLevel === level.value && (
                      <View
                        style={[
                          styles.radioCircleSelected,
                          { backgroundColor: theme.colors.primary[500] },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.radioText}>
                    <Text style={[styles.radioLabel, { color: theme.colors.text }]}>
                      {level.label}
                    </Text>
                    <Text style={[styles.radioDescription, { color: theme.colors.textSecondary }]}>
                      {level.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Spacer size="lg" />

            <Button
              title="Save"
              onPress={handleSaveHealthMetrics}
              variant="primary"
              fullWidth
              loading={isLoading}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Goals Modal */}
      <Modal
        visible={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        title="Nutrition Goals"
      >
        <ScrollView style={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Daily Calories</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.calories.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, calories: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Protein (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.protein.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, protein: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Carbohydrates (g)
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.carbs.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, carbs: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Fat (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.fat.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, fat: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Fiber (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.fiber.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, fiber: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Water (ml)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={nutritionGoals.water.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, water: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="lg" />

            <Button
              title="Save Goals"
              onPress={handleSaveGoals}
              variant="primary"
              fullWidth
              loading={isLoading}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Dietary Restrictions Modal */}
      <Modal
        visible={showDietaryModal}
        onClose={() => setShowDietaryModal(false)}
        title="Dietary Preferences"
      >
        <ScrollView style={styles.modalScrollContent}>
          <View style={styles.modalContent}>
            {dietaryRestrictions.map((restriction) => (
              <TouchableOpacity
                key={restriction.id}
                style={[
                  styles.checkboxItem,
                  restriction.selected && styles.checkboxItemSelected,
                  restriction.selected && { backgroundColor: theme.colors.primary[50] },
                ]}
                onPress={() => {
                  setDietaryRestrictions((prev) =>
                    prev.map((r) => (r.id === restriction.id ? { ...r, selected: !r.selected } : r))
                  );
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    restriction.selected && { backgroundColor: theme.colors.primary[500] },
                  ]}
                >
                  {restriction.selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                  {restriction.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Spacer size="lg" />

            <Button
              title="Save Preferences"
              onPress={handleSaveDietaryRestrictions}
              variant="primary"
              fullWidth
              loading={isLoading}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <View style={styles.modalContent}>
          <Text style={[styles.deleteWarning, { color: theme.colors.error[500] }]}>⚠️ Warning</Text>

          <Spacer size="md" />

          <Text style={[styles.deleteText, { color: theme.colors.text }]}>
            This action cannot be undone. All your data including meals, favorites, and analysis
            history will be permanently deleted.
          </Text>

          <Spacer size="lg" />

          <Button
            title="Cancel"
            onPress={() => setShowDeleteModal(false)}
            variant="outline"
            fullWidth
          />

          <Spacer size="md" />

          <Button
            title="Delete My Account"
            onPress={handleDeleteAccount}
            variant="danger"
            fullWidth
          />
        </View>
      </Modal>
    </Container>
  );
};

interface SettingItemProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  theme: any;
  showBadge: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  theme,
  showBadge,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.settingItem}>
    <View style={styles.settingContent}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
    <View style={styles.settingRight}>
      {showBadge && (
        <View style={[styles.settingBadge, { backgroundColor: theme.colors.primary[500] }]} />
      )}
      <Text style={[styles.settingArrow, { color: theme.colors.textSecondary }]}>→</Text>
    </View>
  </TouchableOpacity>
);

interface MetricRowProps {
  label: string;
  value: string;
  theme: any;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, theme }) => (
  <View style={styles.metricRow}>
    <Text style={[styles.metricRowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.metricRowValue, { color: theme.colors.text }]}>{value}</Text>
  </View>
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
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  notificationIcon: {
    fontSize: 20,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEditIcon: {
    fontSize: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
  joinDate: {
    fontSize: 14,
    marginTop: 4,
  },
  editButton: {
    width: '100%',
    maxWidth: 200,
  },
  progressCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  healthCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  metricCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  metricDetails: {
    padding: 16,
    borderRadius: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricRowLabel: {
    fontSize: 14,
  },
  metricRowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsCard: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settingArrow: {
    fontSize: 16,
  },
  accountCard: {
    padding: 20,
  },
  accountAction: {
    paddingVertical: 12,
  },
  accountActionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    width: '100%',
  },
  modalContent: {
    padding: 20,
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  radioOptionSelected: {
    borderColor: 'transparent',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioText: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  radioDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  checkboxItemSelected: {
    borderColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  deleteWarning: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
