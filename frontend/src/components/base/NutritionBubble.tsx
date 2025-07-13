import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  ViewStyle,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { rs, moderateScale, fontScale } from '@/utils/responsive';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface NutritionBubbleProps {
  value: number;
  label: string;
  unit?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  gradientColors?: string[];
  percentage?: number;
  onPress?: () => void;
  animated?: boolean;
  floatingAnimation?: boolean;
  style?: ViewStyle;
}

export const NutritionBubble: React.FC<NutritionBubbleProps> = ({
  value,
  label,
  unit = 'g',
  size = 'medium',
  color,
  gradientColors,
  percentage,
  onPress,
  animated = true,
  floatingAnimation = true,
  style,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  
  const getBubbleSize = () => {
    switch (size) {
      case 'small':
        return moderateScale(80);
      case 'large':
        return moderateScale(140);
      case 'xlarge':
        return moderateScale(180);
      default:
        return moderateScale(110);
    }
  };
  
  const getColors = (): string[] => {
    if (gradientColors) return gradientColors;
    
    const baseColor = color || theme.colors.primary[500];
    return [
      baseColor + 'FF',
      baseColor + 'CC',
      baseColor + '99',
    ];
  };
  
  useEffect(() => {
    if (animated) {
      // Entry animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }).start();
      
      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated, scaleAnim, glowAnim]);
  
  useEffect(() => {
    if (floatingAnimation && animated) {
      // Floating animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      );
      
      floatAnimation.start();
      rotateAnimation.start();
      
      return () => {
        floatAnimation.stop();
        rotateAnimation.stop();
      };
    }
  }, [floatingAnimation, animated, floatAnim, rotateAnim]);
  
  const handlePress = async () => {
    if (onPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress();
    }
  };
  
  const bubbleSize = getBubbleSize();
  const colors = getColors();
  
  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      {
        translateY: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };
  
  const content = (
    <Animated.View
      style={[
        styles.container,
        { width: bubbleSize, height: bubbleSize },
        animatedStyle,
        style,
      ]}
    >
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowAnim,
            transform: [{ scale: glowAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors[0] + '40', colors[1] + '20', 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 0 }}
          locations={[0, 0.5, 1]}
          style={[
            styles.glow,
            { width: bubbleSize * 1.3, height: bubbleSize * 1.3 },
          ]}
        />
      </Animated.View>
      
      {/* Main bubble */}
      <View style={[styles.bubble, { width: bubbleSize, height: bubbleSize }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Inner light reflection */}
        <LinearGradient
          colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.7, y: 0.7 }}
          style={styles.reflection}
        />
        
        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.value, { fontSize: fontScale(size === 'small' ? 20 : size === 'large' ? 32 : 26) }]}>
            {value}
          </Text>
          <Text style={[styles.unit, { fontSize: fontScale(size === 'small' ? 12 : 14) }]}>
            {unit}
          </Text>
          <Text style={[styles.label, { fontSize: fontScale(size === 'small' ? 10 : 12) }]}>
            {label}
          </Text>
          {percentage !== undefined && (
            <Text style={[styles.percentage, { fontSize: fontScale(size === 'small' ? 10 : 12) }]}>
              {Math.round(percentage)}%
            </Text>
          )}
        </View>
        
        {/* Bottom shadow for 3D effect */}
        <View style={[styles.bottomShadow, getModernShadow('high')]} />
      </View>
    </Animated.View>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    borderRadius: 1000,
  },
  bubble: {
    borderRadius: 1000,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflection: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    top: '10%',
    left: '10%',
    borderRadius: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: 'white',
    fontWeight: 'bold',
  },
  unit: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: -rs.tiny,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: rs.tiny,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentage: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: rs.tiny,
  },
  bottomShadow: {
    position: 'absolute',
    bottom: -10,
    width: '80%',
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});