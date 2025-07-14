import React, { useState, useRef, useEffect } from 'react';
import { borderRadius, layout, rs } from '@/utils/responsive';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  selectedKey?: string;
  onChange?: (key: string) => void;
  variant?: 'underline' | 'solid' | 'pills';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  scrollable?: boolean;
  style?: ViewStyle;
  tabStyle?: ViewStyle;
  indicatorStyle?: ViewStyle;
  labelStyle?: TextStyle;
  testID?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  selectedKey,
  onChange,
  variant = 'underline',
  size = 'medium',
  fullWidth = false,
  scrollable = false,
  style,
  tabStyle,
  indicatorStyle,
  labelStyle,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tabLayouts, setTabLayouts] = useState<Array<{ x: number; width: number }>>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  // Find active index from selectedKey
  useEffect(() => {
    const index = items.findIndex((item) => item.key === selectedKey);
    if (index !== -1) {
      setActiveIndex(index);
      scrollToTab(index);
    }
  }, [selectedKey, items]);

  // Animate indicator when active index or layouts change
  useEffect(() => {
    if (variant === 'underline' && tabLayouts.length > activeIndex) {
      const layout = tabLayouts[activeIndex];
      if (layout) {
        Animated.parallel([
          Animated.spring(indicatorPosition, {
            toValue: layout.x,
            useNativeDriver: false,
            tension: 300,
            friction: 20,
          }),
          Animated.spring(indicatorWidth, {
            toValue: layout.width,
            useNativeDriver: false,
            tension: 300,
            friction: 20,
          }),
        ]).start();
      }
    }
  }, [activeIndex, tabLayouts, variant]);

  const scrollToTab = (index: number) => {
    if (scrollable && scrollViewRef.current && tabLayouts[index]) {
      const layout = tabLayouts[index];
      const screenWidth = Dimensions.get('window').width;
      const scrollX = layout.x + layout.width / 2 - screenWidth / 2;
      scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  };

  const handleTabPress = (item: TabItem, index: number) => {
    if (!item.disabled) {
      setActiveIndex(index);
      onChange?.(item.key);
      scrollToTab(index);
    }
  };

  const handleTabLayout = (event: LayoutChangeEvent, index: number) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const newLayouts = [...prev];
      newLayouts[index] = { x, width };
      return newLayouts;
    });
  };

  const renderTab = (item: TabItem, index: number) => {
    const isActive = index === activeIndex;
    const isDisabled = item.disabled;

    const tabItemStyle = [
      styles.tab,
      styles[`${size}Tab`],
      variant === 'pills' && styles.pillTab,
      variant === 'solid' && styles.solidTab,
      isActive && variant === 'pills' && styles.pillTabActive,
      isActive && variant === 'solid' && styles.solidTabActive,
      isDisabled && styles.disabledTab,
      fullWidth && styles.fullWidthTab,
      tabStyle,
    ].filter(Boolean) as ViewStyle[];

    const tabLabelStyle = [
      styles.label,
      styles[`${size}Label`],
      isActive && styles.activeLabel,
      isActive && variant !== 'underline' && styles.activeLabelContrast,
      isDisabled && styles.disabledLabel,
      labelStyle,
    ].filter(Boolean) as TextStyle[];

    return (
      <TouchableOpacity
        key={item.key}
        style={tabItemStyle}
        onPress={() => handleTabPress(item, index)}
        onLayout={(event) => handleTabLayout(event, index)}
        disabled={isDisabled}
        activeOpacity={0.7}
        testID={`${testID}-tab-${item.key}`}
        accessibilityRole="tab"
        accessibilityState={{
          selected: isActive,
          disabled: isDisabled,
        }}
        accessibilityLabel={item.label}
      >
        {item.icon && <View style={styles.icon}>{item.icon}</View>}
        <Text style={tabLabelStyle} numberOfLines={1}>
          {item.label}
        </Text>
        {item.badge && <View style={styles.badge}>{item.badge}</View>}
      </TouchableOpacity>
    );
  };

  const containerStyle = [
    styles.container,
    variant === 'pills' && styles.pillsContainer,
    style,
  ].filter(Boolean) as ViewStyle[];

  const content = (
    <>
      {items.map(renderTab)}
      {variant === 'underline' && (
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            {
              transform: [{ translateX: indicatorPosition }],
              width: indicatorWidth,
            },
          ]}
        />
      )}
    </>
  );

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          testID={testID}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {content}
    </View>
  );
};

// TabPanel component for tab content
interface TabPanelProps {
  isActive: boolean;
  children: React.ReactNode;
  lazy?: boolean;
  style?: ViewStyle;
}

export const TabPanel: React.FC<TabPanelProps> = ({ isActive, children, lazy = true, style }) => {
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  if (lazy && !hasBeenActive) {
    return null;
  }

  return (
    <View
      style={[{ display: isActive ? 'flex' : 'none' }, style]}
      accessible={isActive}
      accessibilityElementsHidden={!isActive}
    >
      {children}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    pillsContainer: {
      borderBottomWidth: 0,
      paddingHorizontal: theme.spacing.m,
      paddingVertical: theme.spacing.xs,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.m,
    },

    // Tab styles
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.m,
    },
    pillTab: {
      borderRadius: theme.borderRadius.full,
      marginHorizontal: theme.spacing.xxs,
    },
    solidTab: {
      flex: 1,
    },
    pillTabActive: {
      backgroundColor: theme.colors.primary[500],
    },
    solidTabActive: {
      backgroundColor: theme.colors.primary[50],
    },
    fullWidthTab: {
      flex: 1,
    },
    disabledTab: {
      opacity: 0.5,
    },

    // Size variations
    smallTab: {
      paddingVertical: theme.spacing.xs,
      minHeight: 32,
    },
    mediumTab: {
      paddingVertical: theme.spacing.s,
      minHeight: 44,
    },
    largeTab: {
      paddingVertical: theme.spacing.m,
      minHeight: 56,
    },

    // Label styles
    label: {
      fontFamily: theme.typography.fontFamily.medium,
      fontWeight: '500',
      color: theme.colors.neutral[600],
    },
    activeLabel: {
      color: theme.colors.primary[500],
      fontWeight: '600',
    },
    activeLabelContrast: {
      color: theme.colors.white,
    },
    disabledLabel: {
      color: theme.colors.neutral[400],
    },

    // Label sizes
    smallLabel: {
      fontSize: theme.typography.fontSize.xs,
    },
    mediumLabel: {
      fontSize: theme.typography.fontSize.sm,
    },
    largeLabel: {
      fontSize: theme.typography.fontSize.base,
    },

    // Elements
    icon: {
      marginRight: theme.spacing.xs,
    },
    badge: {
      marginLeft: theme.spacing.xs,
    },

    // Indicator
    indicator: {
      position: 'absolute',
      bottom: 0,
      height: 2,
      backgroundColor: theme.colors.primary[500],
    },
  });

export default Tabs;
