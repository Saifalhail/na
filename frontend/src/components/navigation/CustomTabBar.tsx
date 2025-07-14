import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@/components/IconFallback';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { spacing, layout } from '@/theme/spacing';
import { getModernShadow } from '@/theme/shadows';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface TabIconProps {
  route: any;
  focused: boolean;
  color: string;
  size: number;
}

const TabIcon = React.memo<TabIconProps>(({ route, focused, color, size }) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  switch (route.name) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'History':
      iconName = focused ? 'time' : 'time-outline';
      break;
    case 'Camera':
      iconName = 'camera';
      break;
    case 'Favorites':
      iconName = focused ? 'heart' : 'heart-outline';
      break;
    case 'Settings':
      iconName = focused ? 'settings' : 'settings-outline';
      break;
    default:
      iconName = 'home-outline';
  }

  return <Ionicons name={iconName} size={size} color={color} />;
}, (prevProps, nextProps) => {
  // Only re-render if route name, focused state, or color changes
  return (
    prevProps.route.name === nextProps.route.name &&
    prevProps.focused === nextProps.focused &&
    prevProps.color === nextProps.color &&
    prevProps.size === nextProps.size
  );
});

const CustomTabBarComponent: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  const handlePress = async (route: any, isFocused: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCamera = route.name === 'Camera';

          if (isCamera) {
            // Special styling for camera button
            return (
              <View key={route.key} style={styles.cameraContainer}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => handlePress(route, isFocused)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[theme.colors.primary[400], theme.colors.primary[600]]}
                    style={styles.cameraButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.cameraIconWrapper}>
                      <Ionicons 
                        name="camera" 
                        size={26} 
                        color={theme.colors.white} 
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => handlePress(route, isFocused)}
              activeOpacity={0.7}
            >
              <TabIcon
                route={route}
                focused={isFocused}
                color={isFocused ? theme.colors.primary[500] : theme.colors.text.secondary}
                size={24}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, insets: any) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderTopWidth: layout.borderWidth.thin,
      borderTopColor: theme.colors.border,
      paddingBottom: insets.bottom || spacing['3'], // 12px default
      paddingTop: spacing['3'], // 12px
      paddingHorizontal: spacing['4'], // 16px
      height: (insets.bottom || 0) + spacing['16'], // 64px + safe area
      alignItems: 'center',
      justifyContent: 'space-around',
      ...getModernShadow('navigation'),
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing['2'], // 8px
    },
    cameraContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -spacing['8'], // -32px to float above
    },
    cameraButton: {
      width: 64, // Larger button
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      ...getModernShadow('floating'),
      elevation: 12,
      borderWidth: 3,
      borderColor: theme.colors.surface,
    },
    cameraButtonGradient: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 29,
    },
    cameraIconWrapper: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 24,
    },
  });

// Memoize the CustomTabBar component
export const CustomTabBar = React.memo(CustomTabBarComponent, (prevProps, nextProps) => {
  // Deep comparison of navigation state
  const stateEqual =
    prevProps.state.index === nextProps.state.index &&
    prevProps.state.routes.length === nextProps.state.routes.length &&
    prevProps.state.routes.every(
      (route, index) => route.key === nextProps.state.routes[index]?.key
    );

  // Compare descriptors (only check keys, as the actual descriptors are reference-equal)
  const descriptorsEqual =
    Object.keys(prevProps.descriptors).length === Object.keys(nextProps.descriptors).length;

  // Navigation object is stable, so reference equality is fine
  const navigationEqual = prevProps.navigation === nextProps.navigation;

  return stateEqual && descriptorsEqual && navigationEqual;
});

export default CustomTabBar;