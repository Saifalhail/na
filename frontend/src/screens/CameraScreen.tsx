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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Camera, CameraView } from 'expo-camera';
import type { CameraType, FlashMode } from 'expo-camera';
import { Container, Spacer } from '@/components/layout';
import { Button } from '@/components/base/Button';
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

  const cameraRef = useRef<any>(null);
  const guideAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start guide animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(guideAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(guideAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for capture button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Get location permission and current location
    getLocationAsync();

    return () => {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
      }
    };
  }, []);

  const requestCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const getLocationAsync = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    } catch (error) {
      console.log('Location permission not granted');
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
    const hasPermission = await requestCameraPermissions();
    if (hasPermission) {
      // Show options sheet first
      setShowOptionsSheet(true);
    } else {
      Alert.alert('Permission Required', ERROR_MESSAGES.CAMERA_PERMISSION);
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

  // Simulate brightness detection (in real app, would use camera exposure)
  const updateCameraMetrics = useCallback(() => {
    if (cameraRef.current) {
      // Simulate metrics - in production, use actual camera data
      setBrightness(0.6 + Math.random() * 0.2);
      setDistance(Math.random() > 0.7 ? 'optimal' : Math.random() > 0.5 ? 'too_close' : 'too_far');
      setAngle(35 + Math.random() * 20);
    }
  }, []);

  useEffect(() => {
    if (showCamera) {
      const interval = setInterval(updateCameraMetrics, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [showCamera, updateCameraMetrics]);

  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAMERA_CONFIG.QUALITY,
        skipProcessing: false,
      });

      // Prepare metadata for analysis
      const metadata: AnalysisRequest['metadata'] = {
        mealType: cameraOptions?.mealType,
        cuisine: cameraOptions?.cuisines.join(', '),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      if (location) {
        metadata.location = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      setShowCamera(false);
      navigation.navigate('AnalysisResults', { 
        imageUri: photo.uri,
        metadata,
        context: cameraOptions,
      });
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsCapturing(false);
    }
  };

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
        navigation.navigate('AnalysisResults', { imageUri });
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', ERROR_MESSAGES.GENERIC_ERROR);
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
    setFlashMode(current => {
      const newMode = current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off';
      
      // Voice-over feedback for flash setting
      const flashModeNames = {
        'off': 'Flash off',
        'on': 'Flash on',
        'auto': 'Flash auto'
      };
      announce(`${flashModeNames[newMode]}`);
      
      return newMode;
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on':
        return '🔦';
      case 'auto':
        return '⚡️';
      default:
        return '🚫';
    }
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
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={type}
          flash={flashMode}
        >
          <View style={styles.cameraOverlay}>
            {/* Header Controls */}
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={handleGoBack} style={styles.cameraControl}>
                <Text style={styles.controlIcon}>✕</Text>
              </TouchableOpacity>

              <View style={styles.cameraHeaderRight}>
                <TouchableOpacity onPress={toggleFlash} style={styles.cameraControl}>
                  <Text style={styles.controlIcon}>{getFlashIcon()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={toggleCameraType}
                  style={[styles.cameraControl, { marginLeft: 16 }]}
                >
                  <Text style={styles.controlIcon}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Smart Camera Overlay */}
            <SmartCameraOverlay
              brightness={brightness}
              distance={distance}
              angle={angle}
              isCapturing={isCapturing}
              showGuidance={showGuidance}
              onOptimalPosition={handleOptimalPosition}
            />
            
            {/* Context Badge */}
            {cameraOptions && (
              <View style={styles.contextBadge}>
                <Badge
                  variant="primary"
                  size="medium"
                >
                  {`${cameraOptions.mealType} • ${cameraOptions.cuisines.length > 0 ? cameraOptions.cuisines[0] : 'All cuisines'}`}
                </Badge>
              </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.cameraBottom}>
              <TouchableOpacity
                onPress={() => setShowOptionsSheet(true)}
                style={styles.contextButton}
                accessible={true}
                accessibilityLabel="Change meal context"
                accessibilityHint={getActionHint('open context options')}
                accessibilityRole="button"
              >
                <Text style={styles.contextButtonText}>⚙️</Text>
              </TouchableOpacity>

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
                  accessibilityHint={getActionHint('capture')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isCapturing }}
                >
                  <View style={[
                    styles.captureButtonInner,
                    isOptimalPosition && styles.captureButtonInnerOptimal,
                  ]} />
                </TouchableOpacity>
              </Animated.View>
              
              <TouchableOpacity
                onPress={() => {
                  setShowGuidance(!showGuidance);
                  announce(showGuidance ? 'Guidance overlay hidden' : 'Guidance overlay shown');
                }}
                style={styles.guidanceToggle}
                accessible={true}
                accessibilityLabel="Toggle guidance overlay"
                accessibilityHint={getActionHint('toggle guidance')}
                accessibilityRole="button"
              >
                <Text style={styles.guidanceToggleText}>{showGuidance ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSelectFromGallery}
                style={styles.galleryButton}
                accessible={true}
                accessibilityLabel="Select from gallery"
                accessibilityHint={getActionHint('open gallery')}
                accessibilityRole="button"
              >
                <Text style={styles.galleryButtonText}>🖼️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
        
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
    <Container style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack}>
            <Text style={[styles.backButton, { color: theme.colors.primary[500] }]}>← Back</Text>
          </TouchableOpacity>
        </View>

        <Spacer size="xl" />

        <View style={styles.centerContent}>
          <View style={[styles.cameraIcon, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>

          <Spacer size="xl" />

          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Capture Your Meal</Text>

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
            >
              📸 Take Photo
            </Button>

            <Spacer size="lg" />

            <Button
              onPress={handleSelectFromGallery}
              variant="outline"
              disabled={isLoading}
              style={styles.button}
              accessibilityLabel="Choose from gallery"
              accessibilityHint={getActionHint('open gallery')}
            >
              🖼️ Choose from Gallery
            </Button>
          </View>
        </View>

        <View style={styles.tips}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text.primary }]}>
            Tips for best results:
          </Text>

          <Spacer size="small" />

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Ensure good lighting - natural light works best
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🍽️</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Show the entire meal in frame
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>📐</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Take photo from above at 45° angle
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🚫</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Avoid shadows and reflections
            </Text>
          </View>
        </View>
      </View>

      {isLoading && <LoadingOverlay visible={isLoading} message={LOADING_MESSAGES.PREPARING_CAMERA} />}
      
      {/* Camera Options Sheet for main screen */}
      <CameraOptionsSheet
        visible={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        onConfirm={handleOptionsConfirm}
        initialOptions={cameraOptions || undefined}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconText: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttons: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    width: '100%',
  },
  tips: {
    paddingBottom: 40,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tipText: {
    fontSize: 14,
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
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  cameraHeaderRight: {
    flexDirection: 'row',
  },
  cameraControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    color: '#fff',
    fontSize: 20,
  },
  guidanceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateGuide: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.6,
    borderWidth: 2,
    borderRadius: 16,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#fff',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  guidanceText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraBottom: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    padding: 4,
  },
  captureButtonActive: {
    backgroundColor: '#ddd',
  },
  captureButtonOptimal: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
  },
  captureButtonInnerOptimal: {
    borderColor: '#fff',
    backgroundColor: '#4CAF50',
  },
  contextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextButtonText: {
    fontSize: 24,
  },
  contextBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 20,
  },
  guidanceToggle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceToggleText: {
    fontSize: 24,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButtonText: {
    fontSize: 24,
  },
});
