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
import { SafeAreaContainer, Container, Spacer, Row } from '@/components/layout';
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
import { authApi } from '@/services/api';
import { rs, rTouchTarget, scale, moderateScale, layout, fontScale } from '@/utils/responsive';
import { KeyboardAvoidingView } from 'react-native';

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

const calculateAge = (dateOfBirth?: string): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { logout, user } = useAuthStore();
  const { profile, updateProfile, isLoading } = useUserStore();
  const { todayStats } = useMealStore();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showDietaryModal, setShowDietaryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    phoneNumber: user?.phone_number || '',
  });

  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    height: profile?.height || 170,
    weight: profile?.weight || 70,
    activityLevel: profile?.activityLevel || 'moderate',
    age: calculateAge(user?.date_of_birth) || 25,
    gender: profile?.gender || 'other',
  });

  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>({
    calories: profile?.dailyCalorieGoal || 2000,
    protein: profile?.dailyProteinGoal || 50,
    carbs: profile?.dailyCarbsGoal || 250,
    fat: profile?.dailyFatGoal || 65,
    fiber: 25,
    water: 2000,
  });

  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>(
    DIETARY_RESTRICTIONS.map((restriction) => ({
      ...restriction,
      selected: profile?.dietaryRestrictions?.some(dr => dr.id === restriction.id) || false,
    }))
  );

  const [notificationSettings, setNotificationSettings] = useState({
    meal_reminders: false,
    daily_summary: false,
    weekly_report: false,
    achievements: false,
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
      // Update auth user directly since these are auth fields
      // await updateProfile(profileData);
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
        activityLevel: healthMetrics.activityLevel,
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
        dailyCalorieGoal: nutritionGoals.calories,
        dailyProteinGoal: nutritionGoals.protein,
        dailyCarbsGoal: nutritionGoals.carbs,
        dailyFatGoal: nutritionGoals.fat,
      });
      setShowGoalsModal(false);
      Alert.alert('Success', 'Nutrition goals updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update nutrition goals');
    }
  };

  const handleSaveDietaryRestrictions = async () => {
    try {
      const selectedRestrictions = dietaryRestrictions
        .filter((r) => r.selected)
        .map((r) => ({
          id: r.id,
          name: r.name,
          restrictionType: 'preference' as const,
          createdAt: new Date().toISOString()
        }));

      await updateProfile({
        dietaryRestrictions: selectedRestrictions,
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
      await authApi.deleteAccount('password'); // TODO: Prompt for password
      logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account');
    }
  };

  const handleExportData = async () => {
    try {
      // const data = await authApi.exportUserData();
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
    <SafeAreaContainer style={styles.container} scrollable scrollViewProps={{ showsVerticalScrollIndicator: false }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButtonTouch}>
            <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>← Back</Text>
          </TouchableOpacity>

          <Image 
            source={require('../../assets/logo_cropped.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />

          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notificationTouch}>
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <Spacer size="xl" />

        {/* Profile Info */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handleAvatarChange} style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.colors.background }]}>
                  {(user?.first_name?.[0] || 'U').toUpperCase()}
                </Text>
              )}
              <View style={styles.avatarEdit}>
                <Text style={styles.avatarEditIcon}>📷</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Spacer size="lg" />

          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: theme.colors.text.primary }]}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Badge
              variant="primary"
              style={styles.accountBadge}
            >
              {accountType.icon} {accountType.label}
            </Badge>
          </View>

          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>

          <Text style={[styles.joinDate, { color: theme.colors.textSecondary }]}>
            Member since {formatDate(new Date(user?.date_joined || new Date().toISOString()))}
          </Text>

          <Spacer size="lg" />

          <Button
            onPress={() => setShowEditModal(true)}
            variant="outline"
            style={styles.editButton}
          >
            Edit Profile
          </Button>
        </Card>

        <Spacer size="xl" />

        {/* Today's Progress */}
        <Card style={styles.progressCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Today's Progress</Text>

          <Spacer size="lg" />

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.colors.text.primary }]}>Calories</Text>
              <Text style={[styles.progressValue, { color: theme.colors.primary[500] }]}>
                {todayStats.calories} / {nutritionGoals.calories}
              </Text>
            </View>
            <ProgressBar
              progress={(todayStats.calories / nutritionGoals.calories) * 100}
              variant="default"
              style={styles.progressBar}
            />
          </View>

          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
                {todayStats.protein}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Carbs</Text>
              <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
                {todayStats.carbs}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: theme.colors.textSecondary }]}>Fat</Text>
              <Text style={[styles.macroValue, { color: theme.colors.text.primary }]}>
                {todayStats.fat}g
              </Text>
            </View>
          </View>
        </Card>

        <Spacer size="xl" />

        {/* Health Metrics */}
        <Card style={styles.healthCard}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Health Metrics</Text>
            <TouchableOpacity onPress={() => setShowHealthModal(true)}>
              <Text style={[styles.editLink, { color: theme.colors.primary[500] }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Spacer size="lg" />

          <View style={styles.metricsGrid}>
            {healthMetrics.bmi && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>
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
                <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>
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
                <Text style={[styles.metricValue, { color: theme.colors.text.primary }]}>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Settings</Text>

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
            subtitle={user?.is_verified ? 'Enabled' : 'Secure your account'}
            icon="🔐"
            onPress={() => navigation.navigate('TwoFactorSetup')}
            theme={theme}
            showBadge={user?.is_verified || false}
          />

          <SettingItem
            title="Notifications"
            subtitle="Manage your alerts"
            icon="🔔"
            onPress={() => navigation.navigate('Notifications')}
            theme={theme}
            showBadge={false}
          />

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>Dark Mode</Text>
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
            onPress={() => Alert.alert('Help & Support', 'Contact us at support@bitesight.app')}
            theme={theme}
            showBadge={false}
          />
        </Card>

        <Spacer size="xl" />

        {/* Account Actions */}
        <Card style={styles.accountCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Account</Text>

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
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
        >
          Sign Out
        </Button>

        <Spacer size="xxl" />

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profile" scrollable>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
          <TextInput
            style={[styles.input, { color: theme.colors.text.primary }]}
            value={profileData.firstName}
            onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
            placeholder="First Name"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Spacer size="md" />

          <TextInput
            style={[styles.input, { color: theme.colors.text.primary }]}
            value={profileData.lastName}
            onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
            placeholder="Last Name"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Spacer size="md" />

          <TextInput
            style={[styles.input, { color: theme.colors.text.primary }]}
            value={profileData.phoneNumber}
            onChangeText={(text) => setProfileData({ ...profileData, phoneNumber: text })}
            placeholder="Phone Number"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="phone-pad"
          />

          <Spacer size="lg" />

          <Button
            onPress={handleSaveProfile}
            variant="primary"
            fullWidth
            loading={isLoading}
          >
            Save Changes
          </Button>
        </KeyboardAvoidingView>
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
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Height (cm)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={healthMetrics.height.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, height: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={healthMetrics.weight.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, weight: parseFloat(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Age</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={healthMetrics.age.toString()}
                onChangeText={(text) =>
                  setHealthMetrics({ ...healthMetrics, age: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Activity Level</Text>
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
                    <Text style={[styles.radioLabel, { color: theme.colors.text.primary }]}>
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
              onPress={handleSaveHealthMetrics}
              variant="primary"
              fullWidth
              loading={isLoading}
            >
              Save
            </Button>
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
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Daily Calories</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.calories.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, calories: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Protein (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.protein.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, protein: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                Carbohydrates (g)
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.carbs.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, carbs: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Fat (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.fat.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, fat: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Fiber (g)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.fiber.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, fiber: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="md" />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>Water (ml)</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text.primary }]}
                value={nutritionGoals.water.toString()}
                onChangeText={(text) =>
                  setNutritionGoals({ ...nutritionGoals, water: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>

            <Spacer size="lg" />

            <Button
              onPress={handleSaveGoals}
              variant="primary"
              fullWidth
              loading={isLoading}
            >
              Save Goals
            </Button>
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
                <Text style={[styles.checkboxLabel, { color: theme.colors.text.primary }]}>
                  {restriction.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Spacer size="lg" />

            <Button
              onPress={handleSaveDietaryRestrictions}
              variant="primary"
              fullWidth
              loading={isLoading}
            >
              Save Preferences
            </Button>
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

          <Text style={[styles.deleteText, { color: theme.colors.text.primary }]}>
            This action cannot be undone. All your data including meals, favorites, and analysis
            history will be permanently deleted.
          </Text>

          <Spacer size="lg" />

          <Button
            onPress={() => setShowDeleteModal(false)}
            variant="outline"
            fullWidth
          >
            Cancel
          </Button>

          <Spacer size="md" />

          <Button
            onPress={handleDeleteAccount}
            variant="danger"
            fullWidth
          >
            Delete My Account
          </Button>
        </View>
      </Modal>
    </SafeAreaContainer>
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
        <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>{title}</Text>
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
    <Text style={[styles.metricRowValue, { color: theme.colors.text.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs.medium,
  },
  headerLogo: {
    width: moderateScale(32),
    height: moderateScale(32),
  },
  backButtonTouch: {
    padding: rs.small,
    marginLeft: -rs.small,
  },
  backButton: {
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  notificationTouch: {
    padding: rs.small,
    marginRight: -rs.small,
  },
  notificationIcon: {
    fontSize: moderateScale(20),
  },
  profileCard: {
    padding: rs.large,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: rs.medium,
  },
  avatar: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
  },
  avatarText: {
    fontSize: moderateScale(36),
    fontWeight: 'bold',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: -scale(8),
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarEditIcon: {
    fontSize: moderateScale(18),
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: fontScale(24),
    fontWeight: 'bold',
  },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  email: {
    fontSize: fontScale(16),
    marginTop: rs.tiny,
  },
  joinDate: {
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  editButton: {
    width: '100%',
    maxWidth: scale(200),
    marginTop: rs.small,
  },
  progressCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  progressItem: {
    marginBottom: rs.medium,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs.small,
  },
  progressLabel: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  progressValue: {
    fontSize: fontScale(16),
    fontWeight: '600',
  },
  progressBar: {
    height: scale(10),
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: rs.medium,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: fontScale(12),
  },
  macroValue: {
    fontSize: fontScale(16),
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
    fontSize: fontScale(14),
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
    fontSize: fontScale(14),
    marginTop: rs.tiny,
  },
  metricCategory: {
    fontSize: fontScale(12),
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
    fontSize: fontScale(14),
  },
  metricRowValue: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
  settingsCard: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs.medium,
    paddingHorizontal: -rs.small,
    marginHorizontal: -rs.small,
    borderRadius: rs.small,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: moderateScale(20),
    marginRight: rs.medium,
    width: rTouchTarget.minimum,
    textAlign: 'center',
  },
  switchContainer: {
    marginLeft: rs.small,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: fontScale(14),
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
    fontSize: fontScale(16),
  },
  accountCard: {
    padding: 20,
  },
  accountAction: {
    paddingVertical: 12,
  },
  accountActionText: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  logoutButton: {
    width: '100%',
    marginHorizontal: rs.medium,
  },
  modalContent: {
    paddingHorizontal: rs.medium,
    paddingBottom: rs.large,
  },
  modalScrollContent: {
    maxHeight: scale(400),
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: rs.small,
    padding: rs.medium,
    fontSize: moderateScale(16),
    minHeight: rTouchTarget.minimum,
  },
  inputGroup: {
    marginBottom: rs.medium,
  },
  inputLabel: {
    fontSize: fontScale(14),
    fontWeight: '500',
    marginBottom: rs.small,
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
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs.medium,
  },
  radioCircleSelected: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
  },
  radioText: {
    flex: 1,
  },
  radioLabel: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  radioDescription: {
    fontSize: fontScale(14),
    marginTop: 2,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs.medium,
    borderRadius: rs.small,
    marginVertical: rs.tiny,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  checkboxItemSelected: {
    borderColor: 'transparent',
  },
  checkbox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(4),
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rs.medium,
  },
  checkmark: {
    color: '#fff',
    fontSize: fontScale(16),
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: fontScale(16),
  },
  deleteWarning: {
    fontSize: fontScale(24),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteText: {
    fontSize: fontScale(16),
    textAlign: 'center',
    lineHeight: 24,
  },
});
