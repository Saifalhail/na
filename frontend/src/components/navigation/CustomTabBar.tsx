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

interface TabIconProps {
  route: any;
  focused: boolean;
  color: string;
  size: number;
}

const TabIcon: React.FC<TabIconProps> = ({ route, focused, color, size }) => {
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
};

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
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
                  activeOpacity={0.8}
                >
                  <View style={styles.cameraIconWrapper}>
                    <Ionicons 
                      name="camera" 
                      size={28} 
                      color={theme.colors.white} 
                    />
                  </View>
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
      marginTop: -spacing['6'], // -24px to float above
    },
    cameraButton: {
      width: spacing['14'], // 56px
      height: spacing['14'], // 56px
      borderRadius: spacing['7'], // 28px (half of width)
      backgroundColor: theme.colors.primary[500],
      alignItems: 'center',
      justifyContent: 'center',
      ...getModernShadow('button'),
      elevation: 8,
    },
    cameraIconWrapper: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default CustomTabBar;