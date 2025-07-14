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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Camera, CameraView } from 'expo-camera';
import type { CameraType, FlashMode } from 'expo-camera';
import { SafeAreaContainer, SafeAreaHeader } from '@/components/layout';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
import { Ionicons } from '@/components/IconFallback';
import { LoadingOverlay } from '@/components/base/Loading';
import { Badge } from '@/components/base/Badge';
import { useTheme } from '@/hooks/useTheme';
import { MainStackParamList } from '@/navigation/types';
import { CAMERA_CONFIG, ERROR_MESSAGES, LOADING_MESSAGES } from '@/constants';
import { announce, getActionHint } from '@/utils/accessibility';
import { CameraOptionsSheet, CameraOptions } from '@/components/camera/CameraOptionsSheet';
import { SmartCameraOverlay } from '@/components/camera/SmartCameraOverlay';
import { toastManager } from '@/components/base/Toast';
import { AnalysisRequest } from '@/types/api';
import { rTouchTarget, layout, zIndex, moderateScale, fontScale, spacing } from '@/utils/responsive';
import { metadataCollectionService } from '@/services/metadata/MetadataCollectionService';
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: CAMERA_CONFIG.ALLOW_EDITING,
        aspect: CAMERA_CONFIG.ASPECT_RATIO,
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
      
      // Provide specific error message for MediaTypeOptions issue
      if (errorMessage.includes('MediaTypeOptions') || errorMessage.includes('undefined')) {
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

        {/* Header Controls with SafeArea */}
        <SafeAreaHeader transparent style={styles.cameraHeader}>
          <View style={styles.cameraHeaderContent}>
            <TouchableOpacity onPress={handleGoBack} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Context Badge or Logo */}
            {cameraOptions ? (
              <Badge variant="primary" size="small" style={styles.contextBadgeHeader}>
                {`${cameraOptions.mealType} • ${cameraOptions.cuisines[0] || 'All'}`}
              </Badge>
            ) : (
              <Image
                source={require('../../assets/logo_cropped.png')}
                style={styles.cameraHeaderLogo}
                resizeMode="contain"
              />
            )}

            <View style={styles.headerRightButtons}>
              <TouchableOpacity onPress={toggleFlash} style={styles.headerButton}>
                <Ionicons 
                  name={flashMode === 'on' ? 'flash' : flashMode === 'auto' ? 'flash-outline' : 'flash-off'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCameraType} style={styles.headerButton}>
                <Ionicons name="camera-reverse" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaHeader>

        {/* Simplified Bottom Controls */}
        <View style={styles.cameraBottomContainer}>
          <View style={styles.cameraBottomContent}>
            {/* Secondary controls */}
            <View style={styles.secondaryControls}>
              <TouchableOpacity
                onPress={() => setShowOptionsSheet(true)}
                style={styles.secondaryButton}
                accessible={true}
                accessibilityLabel="Change meal context"
                accessibilityRole="button"
              >
                <Ionicons name="settings" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSelectFromGallery}
                style={styles.secondaryButton}
                accessible={true}
                accessibilityLabel="Select from gallery"
                accessibilityRole="button"
              >
                <Ionicons name="images" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Main capture button */}
            <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                onPress={handleTakePicture}
                style={[
                  styles.captureButton,
                  isCapturing && styles.captureButtonActive,
                  isOptimalPosition && styles.captureButtonOptimal,
                ]}
                disabled={isCapturing}
                accessible={true}
                accessibilityLabel="Capture photo"
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.captureButtonInner,
                    isOptimalPosition && styles.captureButtonInnerOptimal,
                  ]}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Toggle guidance */}
            <TouchableOpacity
              onPress={() => {
                setShowGuidance(!showGuidance);
                announce(showGuidance ? 'Guidance hidden' : 'Guidance shown');
              }}
              style={styles.toggleButton}
              accessible={true}
              accessibilityLabel="Toggle guidance"
              accessibilityRole="button"
            >
              <Ionicons 
                name={showGuidance ? 'eye' : 'eye-off'} 
                size={20} 
                color="rgba(255,255,255,0.8)" 
              />
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
    <SafeAreaContainer style={styles.container} scrollable>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButtonTouch}>
            <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Spacer size="xl" />

        <View style={styles.centerContent}>
          <View style={styles.cameraIcon}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.cameraIconImage}
              resizeMode="contain"
            />
          </View>

          <Spacer size="xl" />

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Capture Your Meal
          </Text>

          <Spacer size="md" />

          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Take a photo of your meal or select from your gallery to get instant nutritional
            analysis
          </Text>

          <Spacer size="xxl" />

          <View style={styles.buttons}>
            <Button
              onPress={handleOpenCamera}
              variant="primary"
              disabled={isLoading}
              style={styles.button}
              accessibilityLabel="Take photo"
              accessibilityHint={getActionHint('camera')}
              icon={<Ionicons name="camera" size={20} color="#fff" />}
              iconPosition="left"
            >
              Take Photo
            </Button>

            <Spacer size="lg" />

            <Button
              onPress={handleSelectFromGallery}
              variant="outline"
              disabled={isLoading}
              style={styles.button}
              accessibilityLabel="Choose from gallery"
              accessibilityHint={getActionHint('open gallery')}
              icon={<Ionicons name="images" size={20} color={theme.colors.primary[500]} />}
              iconPosition="left"
            >
              Choose from Gallery
            </Button>
          </View>
        </View>

        <View style={styles.tips}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text.primary }]}>
            Tips for best results:
          </Text>

          <Spacer size="small" />

          <View style={styles.tipItem}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning[500]} style={styles.tipIconView} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Ensure good lighting - natural light works best
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="restaurant" size={20} color={theme.colors.primary[500]} style={styles.tipIconView} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Show the entire meal in frame
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="resize" size={20} color={theme.colors.info[500]} style={styles.tipIconView} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Take photo from above at 45° angle
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="ban" size={20} color={theme.colors.error[500]} style={styles.tipIconView} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Avoid shadows and reflections
            </Text>
          </View>
        </View>
      </View>

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
    </SafeAreaContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.medium,
  },
  backButtonTouch: {
    padding: spacing.small,
    marginLeft: -spacing.small,
  },
  backButton: {
    fontSize: fontScale(16),
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: moderateScale(120),
    height: moderateScale(120),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.large,
  },
  cameraIconImage: {
    width: moderateScale(120),
    height: moderateScale(120),
  },
  title: {
    fontSize: fontScale(28),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  subtitle: {
    fontSize: fontScale(16),
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.large,
    marginBottom: spacing.xlarge,
  },
  buttons: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    width: '100%',
    marginBottom: spacing.medium,
  },
  tips: {
    marginTop: spacing.xlarge,
    paddingBottom: spacing.xlarge,
  },
  tipsTitle: {
    fontSize: fontScale(16),
    fontWeight: '600',
    marginBottom: spacing.medium,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.small,
  },
  tipIconView: {
    marginRight: spacing.small,
    marginTop: spacing.tiny,
    width: 24,
  },
  tipText: {
    fontSize: fontScale(14),
    lineHeight: 20,
    flex: 1,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // Header styles
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.dropdown,
  },
  cameraHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    width: rTouchTarget.minimum,
    height: rTouchTarget.minimum,
    borderRadius: rTouchTarget.minimum / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: fontScale(20),
    fontWeight: '600',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  contextBadgeHeader: {
    flex: 1,
    marginHorizontal: spacing.small,
  },
  cameraHeaderLogo: {
    width: moderateScale(32),
    height: moderateScale(32),
    flex: 1,
  },
  // Bottom controls
  cameraBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.xlarge,
    zIndex: zIndex.dropdown,
  },
  cameraBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.containerPadding,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  secondaryButton: {
    width: rTouchTarget.small,
    height: rTouchTarget.small,
    borderRadius: rTouchTarget.small / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  secondaryButtonText: {
    fontSize: fontScale(24),
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captureButton: {
    width: rTouchTarget.large,
    height: rTouchTarget.large,
    borderRadius: rTouchTarget.large / 2,
    backgroundColor: '#fff',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  captureButtonActive: {
    backgroundColor: '#f0f0f0',
    transform: [{ scale: 0.95 }],
  },
  captureButtonOptimal: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: rTouchTarget.large / 2 - 6,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
  },
  captureButtonInnerOptimal: {
    borderColor: '#fff',
    backgroundColor: '#4CAF50',
    borderWidth: 4,
  },
  toggleButton: {
    position: 'absolute',
    right: layout.containerPadding,
    bottom: spacing.small,
    width: rTouchTarget.minimum,
    height: rTouchTarget.minimum,
    borderRadius: rTouchTarget.minimum / 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: fontScale(20),
  },
});
