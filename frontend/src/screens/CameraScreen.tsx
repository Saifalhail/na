import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Camera, CameraView } from 'expo-camera';
import type { CameraType, FlashMode } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaContainer, SafeAreaHeader } from '@/components/layout';
import { Container, Spacer } from '@/components/layout';
import { UnifiedButton } from '@/components/base/UnifiedButton';
import { UnifiedIcon, UNIFIED_ICONS } from '@/components/base/UnifiedIcon';
import { UnifiedCard } from '@/components/base/UnifiedCard';
import { Ionicons } from '@/components/IconFallback';
import { GradientIcon } from '@/components/icons/GradientIcon';
import { UI } from '@/constants/uiConstants';
import { LoadingOverlay } from '@/components/base/Loading';
import { Badge } from '@/components/base/Badge';
import { useTheme } from '@/hooks/useTheme';
import { MainStackParamList } from '@/navigation/MainNavigator';
import { CAMERA_CONFIG, ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';
import { announce, getActionHint } from '@/utils/accessibility';
import { CameraOptionsSheet, CameraOptions } from '@/components/camera/CameraOptionsSheet';
import { SmartCameraOverlay } from '@/components/camera/SmartCameraOverlay';
import { toastManager } from '@/components/base/Toast';
import { AnalysisRequest } from '@/types/api';
import { rTouchTarget, layout, zIndex, moderateScale, fontScale, spacing } from '@/utils/responsive';
import { metadataCollectionService } from '@/services/metadata/MetadataCollectionService';
import { getModernShadow } from '@/theme/shadows';
import { textPresets } from '@/theme/typography';
import {
  smartPhotoGuidanceService,
  PhotoQualityAssessment,
  RealTimeGuidance,
} from '@/services/camera/SmartPhotoGuidanceService';

type CameraScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Camera'>;
type CameraScreenRouteProp = RouteProp<MainStackParamList, 'Camera'>;

interface Props {
  navigation: CameraScreenNavigationProp;
  route: CameraScreenRouteProp;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const featureItemsAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [type, setType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [cameraOptions, setCameraOptions] = useState<CameraOptions | null>(null);
  const [brightness, setBrightness] = useState(0.5);
  const [distance, setDistance] = useState<'too_close' | 'too_far' | 'optimal'>('optimal');
  const [angle, setAngle] = useState(45);
  const [isOptimalPosition, setIsOptimalPosition] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [photoQuality, setPhotoQuality] = useState<PhotoQualityAssessment | null>(null);
  const [realTimeGuidance, setRealTimeGuidance] = useState<RealTimeGuidance | null>(null);
  const [showQualityIndicator, setShowQualityIndicator] = useState(true);

  const cameraRef = useRef<any>(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get location permission and current location
    getLocationAsync();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(featureItemsAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  // Simplified photo guidance - removed heavy real-time analysis that was causing performance issues
  useEffect(() => {
    if (showCamera && showQualityIndicator) {
      // Set basic optimal state after a short delay to allow camera to stabilize
      const stabilizeTimeout = setTimeout(() => {
        setIsOptimalPosition(true);
        setRealTimeGuidance({
          message: 'Camera ready - tap to capture',
          isReady: true,
          suggestions: [],
        });
      }, 1000);

      return () => {
        clearTimeout(stabilizeTimeout);
      };
    }
  }, [showCamera, showQualityIndicator]);

  // Optimized pulse animation - reduced frequency and duration for better performance
  useEffect(() => {
    let pulseAnimationRef: any;

    if (showCamera && !isOptimalPosition && !isCapturing) {
      pulseAnimationRef = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.03, // Reduced scale to minimize redraws
            duration: 2000, // Increased duration to reduce frequency
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationRef.start();
    } else {
      pulseAnimation.setValue(1);
    }

    return () => {
      if (pulseAnimationRef) {
        pulseAnimationRef.stop();
      }
    };
  }, [showCamera, isOptimalPosition, isCapturing]);

  const requestCameraPermissions = async () => {
    if (__DEV__) {
      console.log('📸 [Camera] Requesting camera permissions...');
    }
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (__DEV__) {
        console.log('📸 [Camera] Permission status:', status);
      }
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        if (__DEV__) {
          console.error('📸 [Camera] Permission denied:', status);
        }
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to analyze your food. Please grant permission in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              if (__DEV__) {
                console.log('Open settings requested');
              }
            }}
          ]
        );
      }
      
      return status === 'granted';
    } catch (error) {
      if (__DEV__) {
        console.error('📸 [Camera] Error requesting permissions:', error);
      }
      Alert.alert('Camera Error', 'Failed to request camera permissions. Please check your device settings.');
      return false;
    }
  };

  const getLocationAsync = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('Location permission not granted');
      }
    }
  };

  const requestGalleryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', ERROR_MESSAGES.GALLERY_PERMISSION);
      return false;
    }
    return true;
  };

  const handleOpenCamera = async () => {
    if (__DEV__) {
      console.log('📸 [Camera] handleOpenCamera called');
    }
    try {
      const hasPermission = await requestCameraPermissions();
      if (__DEV__) {
        console.log('📸 [Camera] Permission result:', hasPermission);
      }
      
      if (hasPermission) {
        // Apply smart defaults based on time of day
        const hour = new Date().getHours();
        let defaultMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'snack';

        if (hour >= 6 && hour < 11) {
          defaultMealType = 'breakfast';
        } else if (hour >= 11 && hour < 15) {
          defaultMealType = 'lunch';
        } else if (hour >= 17 && hour < 21) {
          defaultMealType = 'dinner';
        }

        if (__DEV__) {
          console.log('📸 [Camera] Smart meal type detected:', defaultMealType);
        }

        // Set smart defaults
        setCameraOptions({
          mealType: defaultMealType,
          cuisines: [],
          portionSize: 'medium',
          diningContext: 'home', // Default to home dining
        });

        // Go directly to camera for one-tap experience
        if (__DEV__) {
          console.log('📸 [Camera] Opening camera view...');
        }
        setShowCamera(true);
        toastManager.info(`Smart mode: ${defaultMealType} detected`);
      } else {
        if (__DEV__) {
          console.error('📸 [Camera] Permission denied, showing alert');
        }
        Alert.alert('Permission Required', ERROR_MESSAGES.CAMERA_PERMISSION);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('📸 [Camera] Error in handleOpenCamera:', error);
      }
      Alert.alert('Camera Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleOptionsConfirm = useCallback((options: CameraOptions) => {
    setCameraOptions(options);
    setShowOptionsSheet(false);
    setShowCamera(true);
    toastManager.success('Context applied! Take your photo when ready.');
  }, []);

  const handleOptionsClose = useCallback(() => {
    setShowOptionsSheet(false);
    setShowCamera(true);
  }, []);

  const handleOptimalPosition = useCallback(() => {
    setIsOptimalPosition(true);
    // Auto-capture after 2 seconds when optimal
    if (!isCapturing) {
      captureTimeoutRef.current = setTimeout(() => {
        if (isOptimalPosition) {
          handleTakePicture();
        }
      }, 2000);
    }
  }, [isCapturing, isOptimalPosition]);

  // Removed updateCameraMetrics to improve performance - was running every 2 seconds unnecessarily

  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAMERA_CONFIG.QUALITY,
        skipProcessing: false,
        exif: false, // Disable EXIF to reduce file size
      });

      // Validate photo was captured successfully
      if (!photo || !photo.uri) {
        throw new Error('Failed to capture photo');
      }

      // Collect comprehensive metadata for enhanced AI analysis
      const userContext = {
        mealType: cameraOptions?.mealType,
        cuisine: cameraOptions?.cuisines.join(', '),
        diningContext: cameraOptions?.diningContext,
        notes: cameraOptions?.additionalNotes,
        // Add camera options context
        photoSequenceNumber: 1,
        totalPhotosInSequence: 1,
        photoAngle: 'top-down', // Could be detected from device orientation
      };

      // Collect comprehensive metadata
      const metadata = await metadataCollectionService.collectComprehensiveMetadata(
        photo.uri,
        userContext
      );

      // Detect any photo quality issues
      const qualityIssues = await metadataCollectionService.detectPhotoQualityIssues(photo.uri);
      if (qualityIssues.length > 0) {
        metadata.autoDetectedIssues = qualityIssues;
      }

      // Clear camera state before navigation
      setShowCamera(false);
      setIsCapturing(false);

      // Navigate with proper error handling
      requestAnimationFrame(() => {
        navigation.navigate('AnalysisResults', {
          imageUri: photo.uri,
          metadata,
          context: cameraOptions,
        });
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Error taking photo:', error);
      }
      setIsCapturing(false);

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.GENERIC_ERROR;
      Alert.alert('Camera Error', `Failed to capture photo: ${errorMessage}`);
    }
  };

  // Add alias for handleTakePhoto to fix the missing function error
  const handleTakePhoto = useCallback(async () => {
    return handleTakePicture();
  }, []);

  const handleSelectFromGallery = async () => {
    const hasPermission = await requestGalleryPermissions();
    if (!hasPermission) return;

    setIsLoading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // mediaTypes removed due to compatibility issues
        allowsEditing: CAMERA_CONFIG.ALLOW_EDITING,
        // aspect removed - not needed
        quality: CAMERA_CONFIG.QUALITY,
        allowsMultipleSelection: false,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Validate image URI before navigation
        if (!imageUri) {
          throw new Error('Invalid image selected');
        }

        // Add slight delay to prevent white screen issues
        setTimeout(() => {
          navigation.navigate('AnalysisResults', {
            imageUri,
            source: 'gallery',
          });
        }, 100);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('📸 [Gallery] Error selecting from gallery:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide specific error message for image picker issues
      if (errorMessage.includes('MediaType') || errorMessage.includes('undefined')) {
        if (__DEV__) {
          console.error('📸 [Gallery] ImagePicker API issue detected');
        }
        Alert.alert(
          'Gallery Error', 
          'There was an issue with the image picker. Please try updating the app or contact support.'
        );
      } else {
        Alert.alert('Error', ERROR_MESSAGES.GENERIC_ERROR);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCameraType = () => {
    const newType = type === 'back' ? 'front' : 'back';
    setType(newType);

    // Voice-over feedback for camera direction
    announce(`Switched to ${newType} camera`);
  };

  const toggleFlash = () => {
    setFlashMode((current) => {
      const newMode = current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off';

      // Voice-over feedback for flash setting
      const flashModeNames = {
        off: 'Flash off',
        on: 'Flash on',
        auto: 'Flash auto',
      };
      announce(`${flashModeNames[newMode]}`);

      return newMode;
    });
  };


  const handleGoBack = () => {
    if (showCamera) {
      setShowCamera(false);
    } else {
      navigation.goBack();
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        {/* Camera View - No children allowed inside */}
        <CameraView 
          ref={cameraRef} 
          style={styles.camera} 
          facing={type} 
          flash={flashMode}
        />

        {/* All UI elements positioned absolutely over the camera */}
        {/* Smart Camera Overlay with guidance */}
        <SmartCameraOverlay
          brightness={brightness}
          distance={distance}
          angle={angle}
          isCapturing={isCapturing}
          showGuidance={showGuidance}
          onOptimalPosition={handleOptimalPosition}
        />

        {/* Minimal Header Controls */}
        <View style={styles.minimalHeader}>
          <TouchableOpacity 
            onPress={handleGoBack} 
            style={styles.minimalButton}
            activeOpacity={0.8}
          >
            <GradientIcon name="close" size={24} colors={['white', 'rgba(255,255,255,0.9)']} />
          </TouchableOpacity>

          {/* Simple Flash Toggle */}
          <TouchableOpacity 
            onPress={toggleFlash} 
            style={styles.minimalButton}
            activeOpacity={0.8}
          >
            <GradientIcon 
              name={flashMode === 'on' ? 'flash' : flashMode === 'auto' ? 'flash-outline' : 'flash-off'} 
              size={20} 
              colors={flashMode === 'on' ? [theme.colors.warning[400], theme.colors.warning[600]] : ['white', 'rgba(255,255,255,0.9)']} 
            />
          </TouchableOpacity>
        </View>

        {/* Minimal Bottom Controls */}
        <View style={styles.minimalBottomContainer}>
          <View style={styles.minimalBottomContent}>
            {/* Gallery Button */}
            <TouchableOpacity
              onPress={handleSelectFromGallery}
              style={styles.minimalSecondaryButton}
              activeOpacity={0.8}
            >
              <GradientIcon name="images-outline" size={24} colors={['white', 'rgba(255,255,255,0.9)']} />
            </TouchableOpacity>

            {/* Clean Capture Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                onPress={handleTakePicture}
                style={[
                  styles.cleanCaptureButton,
                  isOptimalPosition && styles.optimalCapture
                ]}
                disabled={isCapturing}
                activeOpacity={0.9}
              >
                <View style={styles.captureButtonRing}>
                  {isCapturing ? (
                    <GradientIcon name="checkmark" size={32} colors={['white', 'rgba(255,255,255,0.9)']} />
                  ) : (
                    <GradientIcon name="camera" size={36} colors={['white', 'rgba(255,255,255,0.9)']} />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Camera Type Toggle */}
            <TouchableOpacity 
              onPress={toggleCameraType} 
              style={styles.minimalSecondaryButton}
              activeOpacity={0.8}
            >
              <GradientIcon name="camera-reverse" size={24} colors={['white', 'rgba(255,255,255,0.9)']} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Options Sheet */}
        <CameraOptionsSheet
          visible={showOptionsSheet}
          onClose={() => setShowOptionsSheet(false)}
          onConfirm={handleOptionsConfirm}
          initialOptions={cameraOptions || undefined}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? theme.colors.background : '#FFFFFF' }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={theme.isDark
          ? ['#1e3a8a', '#1e40af', '#1d4ed8']
          : ['#dbeafe', '#93c5fd', '#ffffff']
        }
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButtonContainer}
          activeOpacity={0.8}
        >
          <BlurView intensity={30} style={styles.backButtonBlur}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.backButtonGradient}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color="white"
              />
            </LinearGradient>
          </BlurView>
        </TouchableOpacity>
        
        <Animated.View style={[
          styles.headerTitleContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            }],
          },
        ]}>
          <Text style={styles.headerTitle}>Capture Meal</Text>
          <Text style={styles.headerSubtitle}>AI-Powered Food Analysis</Text>
        </Animated.View>
        
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero Section */}
        <Animated.View style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
              }
              style={styles.logoGradient}
            >
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>
            AI-Powered Food Analysis
          </Text>
          
          <Text style={styles.subtitle}>
            Capture your meal for instant nutritional insights
          </Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[
          styles.buttonsContainer,
          {
            opacity: featureItemsAnim,
            transform: [{
              translateY: featureItemsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}>
          <UnifiedButton
            onPress={handleOpenCamera}
            variant="primary"
            size="large"
            fullWidth
            disabled={isLoading}
            icon={<UnifiedIcon name={UNIFIED_ICONS.camera} size="large" variant="white" />}
            iconPosition="left"
            style={styles.primaryButton}
          >
            Take Photo
          </UnifiedButton>
          
          <UnifiedButton
            onPress={handleSelectFromGallery}
            variant="secondary"
            size="large"
            fullWidth
            disabled={isLoading}
            icon={<UnifiedIcon name={UNIFIED_ICONS.image} size="large" variant="primary" />}
            iconPosition="left"
            style={styles.primaryButton}
          >
            Upload Photo
          </UnifiedButton>
        </Animated.View>

        {/* Features Section */}
        <Animated.View style={[
          styles.featuresSection,
          {
            opacity: featureItemsAnim,
            transform: [{
              translateY: featureItemsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          },
        ]}>
          <Text style={styles.featuresTitle}>Smart Features</Text>
          
          <View style={styles.featureGrid}>
            <FeatureCard
              icon="nutrition"
              iconColor={theme.colors.success[500]}
              title="Instant Analysis"
              description="Get nutrition facts in seconds"
              theme={theme}
            />
            <FeatureCard
              icon="sparkles"
              iconColor={theme.colors.warning[500]}
              title="AI Powered"
              description="Advanced food recognition"
              theme={theme}
            />
            <FeatureCard
              icon="bar-chart"
              iconColor={theme.colors.info[500]}
              title="Track Progress"
              description="Monitor your nutrition goals"
              theme={theme}
            />
            <FeatureCard
              icon="restaurant"
              iconColor={theme.colors.primary[500]}
              title="Food Database"
              description="Millions of foods recognized"
              theme={theme}
            />
          </View>
        </Animated.View>
        
        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <LinearGradient
            colors={theme.isDark
              ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
              : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']
            }
            style={styles.tipsGradient}
          >
            <Text style={styles.tipsTitle}>📸 Photography Tips</Text>
            
            <View style={styles.tipsList}>
              <TipItem
                icon="sunny"
                text="Use natural lighting when possible"
                theme={theme}
              />
              <TipItem
                icon="scan"
                text="Frame the entire meal in view"
                theme={theme}
              />
              <TipItem
                icon="phone-portrait"
                text="Hold camera at 45° angle"
                theme={theme}
              />
              <TipItem
                icon="contrast"
                text="Avoid harsh shadows"
                theme={theme}
              />
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {isLoading && (
        <LoadingOverlay visible={isLoading} message={LOADING_MESSAGES.PREPARING_CAMERA} />
      )}

      {/* Camera Options Sheet for main screen */}
      <CameraOptionsSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        onConfirm={handleOptionsConfirm}
        initialOptions={cameraOptions || undefined}
      />
    </View>
  );
};

// Feature Card Component
const FeatureCard: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  theme: any;
}> = ({ icon, iconColor, title, description, theme }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={[styles.featureCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.featureCardTouch}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          style={styles.featureCardGradient}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: iconColor + '30' }]}>
            <Ionicons name={icon as any} size={26} color={iconColor} />
          </View>
          <Text style={styles.featureTitle}>
            {title}
          </Text>
          <Text style={styles.featureDescription}>
            {description}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Tip Item Component
const TipItem: React.FC<{
  icon: string;
  text: string;
  theme: any;
}> = ({ icon, text, theme }) => (
  <View style={styles.tipItem}>
    <View style={styles.tipIconContainer}>
      <Ionicons name={icon as any} size={18} color={theme.colors.primary[500]} />
    </View>
    <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight * 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xlarge * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.large,
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: spacing.large,
    zIndex: 10,
  },
  backButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'button'),
  },
  backButtonBlur: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textPresets.h2,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    ...textPresets.caption,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
  headerSpacer: {
    width: 48,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xlarge,
    paddingBottom: spacing.xlarge,
  },
  logoContainer: {
    width: 140,
    height: 140,
    marginBottom: spacing.large,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  title: {
    ...textPresets.h1,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.small,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...textPresets.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: spacing.xlarge,
  },
  // Buttons
  buttonsContainer: {
    paddingHorizontal: spacing.large,
    gap: spacing.large,
  },
  primaryButton: {
    borderRadius: 24,
    overflow: 'hidden',
    ...getModernShadow({ isDark: false }, 'cardElevated'),
    minHeight: 76,
  },
  primaryButtonCamera: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  primaryButtonGallery: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryButtonGradient: {
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.xlarge,
    minHeight: 72,
    justifyContent: 'center',
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.large,
  },
  primaryButtonTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  primaryButtonText: {
    ...textPresets.h3,
    color: 'white',
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryButtonSubtext: {
    ...textPresets.caption,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 16,
  },
  secondaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.medium,
    paddingHorizontal: spacing.large,
    gap: spacing.medium,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryButtonText: {
    ...textPresets.body,
    color: 'white',
    fontWeight: '500',
  },
  // Features Section
  featuresSection: {
    paddingHorizontal: spacing.large,
    marginTop: spacing.xlarge,
  },
  featuresTitle: {
    ...textPresets.h2,
    color: 'white',
    fontWeight: '600',
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.medium,
  },
  featureCard: {
    width: (screenWidth - spacing.large * 2 - spacing.medium) / 2,
  },
  featureCardTouch: {
    borderRadius: 20,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'card'),
  },
  featureCardGradient: {
    padding: spacing.large,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    minHeight: 140,
    justifyContent: 'center',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.medium,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureTitle: {
    ...textPresets.subtitle,
    fontWeight: '700',
    marginBottom: spacing.small,
    textAlign: 'center',
    color: 'white',
  },
  featureDescription: {
    ...textPresets.caption,
    textAlign: 'center',
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  // Tips Section
  tipsSection: {
    marginTop: spacing.xlarge * 2,
    marginHorizontal: spacing.large,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tipsGradient: {
    padding: spacing.large,
  },
  tipsTitle: {
    ...textPresets.h3,
    fontWeight: '600',
    marginBottom: spacing.medium,
    color: 'white',
  },
  tipsList: {
    gap: spacing.medium,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    ...textPresets.body,
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // Minimal Camera Header
  minimalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.large,
    zIndex: zIndex.dropdown,
  },
  minimalButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraHeaderGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.medium,
  },
  cameraHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.medium,
  },
  modernHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'button'),
  },
  headerButtonBlur: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  contextContainer: {
    flex: 1,
    marginHorizontal: spacing.small,
    alignItems: 'center',
  },
  contextBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  contextGradient: {
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
  },
  contextText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  logoWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeaderLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  // Minimal Bottom Controls
  minimalBottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xlarge,
    zIndex: zIndex.dropdown,
  },
  minimalBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalSecondaryButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cleanCaptureButton: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  optimalCapture: {
    backgroundColor: '#10b981',
    borderColor: '#86efac',
  },
  ovalGuideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  ovalGuide: {
    width: screenWidth * 0.85,
    height: screenHeight * 0.4,
    borderRadius: (screenWidth * 0.85) / 2,
    borderWidth: 3,
    borderColor: 'rgba(239, 68, 68, 0.8)', // Red border
    backgroundColor: 'transparent',
    shadowColor: 'rgba(239, 68, 68, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  guideText: {
    position: 'absolute',
    bottom: '25%',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: spacing['4'],
  },
  captureButtonRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomContainer: {
    paddingBottom: Platform.OS === 'ios' ? spacing.xlarge * 2 : spacing.xlarge,
    paddingTop: spacing.large,
  },
  cameraBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.large,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: spacing.medium,
    alignItems: 'center',
  },
  modernSecondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'button'),
  },
  secondaryButtonBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  secondaryButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  modernCaptureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'floating'),
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  captureButtonInnerOptimal: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  modernToggleButton: {
    borderRadius: 25,
    overflow: 'hidden',
    ...getModernShadow({ isDark: true }, 'button'),
  },
  toggleButtonBlur: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  toggleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small + 2,
    gap: spacing.tiny,
    borderRadius: 25,
  },
  toggleButtonText: {
    ...textPresets.caption,
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  guidanceContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing.large,
    right: spacing.large,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
  },
  guidanceText: {
    ...textPresets.body,
    color: 'white',
    textAlign: 'center',
  },
});
