import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  ViewStyle,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { getModernShadow } from '@/theme/shadows';
import { rs, moderateScale, fontScale } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export type AchievementLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface AchievementBadgeProps {
  title: string;
  description?: string;
  level?: AchievementLevel;
  icon?: string;
  iconComponent?: React.ReactNode;
  progress?: number;
  maxProgress?: number;
  unlocked?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  animated?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  title,
  description,
  level = 'bronze',
  icon,
  iconComponent,
  progress = 0,
  maxProgress = 100,
  unlocked = true,
  onPress,
  size = 'medium',
  style,
  animated = true,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.8)).current;
  
  const getLevelColors = (): string[] => {
    switch (level) {
      case 'bronze':
        return ['#CD7F32', '#B87333', '#A0522D'];
      case 'silver':
        return ['#C0C0C0', '#A8A8A8', '#808080'];
      case 'gold':
        return ['#FFD700', '#FFC107', '#FFA000'];
      case 'platinum':
        return ['#E5E4E2', '#BFC1C2', '#A8A9AD'];
      case 'diamond':
        return ['#B9F2FF', '#00D4FF', '#00A8E8'];
      default:
        return ['#CD7F32', '#B87333', '#A0522D'];
    }
  };
  
  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return moderateScale(60);
      case 'large':
        return moderateScale(100);
      default:
        return moderateScale(80);
    }
  };
  
  useEffect(() => {
    if (animated && unlocked) {
      // Entry animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
      
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
  }, [animated, unlocked]);
  
  const handlePress = async () => {
    if (onPress && unlocked) {
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
  
  const badgeSize = getBadgeSize();
  const colors = getLevelColors();
  const progressPercentage = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;
  
  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { scale: scaleAnim },
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {/* Outer glow */}
      {unlocked && (
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
              { width: badgeSize * 1.3, height: badgeSize * 1.3 },
            ]}
          />
        </Animated.View>
      )}
      
      {/* Badge background */}
      <View style={[styles.badge, { width: badgeSize, height: badgeSize }]}>
        <LinearGradient
          colors={unlocked ? colors : [theme.colors.neutral[300], theme.colors.neutral[400], theme.colors.neutral[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Inner decoration */}
        <View style={[styles.innerRing, { width: badgeSize * 0.9, height: badgeSize * 0.9 }]} />
        
        {/* Icon */}
        <View style={styles.iconContainer}>
          {iconComponent || (
            icon ? (
              <Text style={[styles.iconText, { fontSize: fontScale(size === 'small' ? 24 : size === 'large' ? 40 : 32) }]}>
                {icon}
              </Text>
            ) : (
              <Ionicons 
                name="trophy" 
                size={moderateScale(size === 'small' ? 24 : size === 'large' ? 40 : 32)} 
                color={unlocked ? '#FFFFFF' : theme.colors.textSecondary}
              />
            )
          )}
        </View>
        
        {/* Progress ring */}
        {maxProgress > 0 && !unlocked && (
          <View style={[StyleSheet.absoluteFillObject, styles.progressContainer]}>
            <View
              style={[
                styles.progressRing,
                {
                  width: badgeSize * 0.95,
                  height: badgeSize * 0.95,
                  borderRadius: badgeSize / 2,
                  borderWidth: 3,
                  borderColor: theme.colors.primary[500],
                  transform: [{ rotate: '-90deg' }],
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    position: 'absolute',
                    top: -1,
                    left: -1,
                    width: badgeSize * 0.95,
                    height: badgeSize * 0.95,
                    borderRadius: badgeSize / 2,
                    borderWidth: 3,
                    borderColor: theme.colors.primary[500],
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent',
                    transform: [{ rotate: `${(progressPercentage / 100) * 180}deg` }],
                  },
                ]}
              />
            </View>
          </View>
        )}
        
        {/* Lock overlay */}
        {!unlocked && (
          <View style={[StyleSheet.absoluteFillObject, styles.lockOverlay]}>
            <Ionicons 
              name="lock-closed" 
              size={moderateScale(size === 'small' ? 16 : size === 'large' ? 24 : 20)} 
              color={theme.colors.textSecondary}
            />
          </View>
        )}
      </View>
      
      {/* Title and description */}
      {(title || description) && (
        <View style={styles.textContainer}>
          <Text style={[
            styles.title, 
            { 
              color: unlocked ? theme.colors.text.primary : theme.colors.textSecondary,
              fontSize: fontScale(size === 'small' ? 12 : size === 'large' ? 16 : 14),
            }
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[
              styles.description, 
              { 
                color: theme.colors.textSecondary,
                fontSize: fontScale(size === 'small' ? 10 : size === 'large' ? 14 : 12),
              }
            ]}>
              {description}
            </Text>
          )}
          {!unlocked && maxProgress > 0 && (
            <Text style={[
              styles.progress,
              { 
                color: theme.colors.primary[500],
                fontSize: fontScale(size === 'small' ? 10 : size === 'large' ? 14 : 12),
              }
            ]}>
              {progress}/{maxProgress}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
  
  if (onPress && unlocked) {
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
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    borderRadius: 1000,
  },
  badge: {
    borderRadius: 1000,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...getModernShadow('high'),
  },
  innerRing: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: 'white',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
  },
  progressFill: {
    position: 'absolute',
  },
  lockOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: rs.small,
    maxWidth: moderateScale(100),
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: rs.tiny,
  },
  progress: {
    fontWeight: '500',
    marginTop: rs.tiny,
  },
});