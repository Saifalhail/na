import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getSafeAreaPadding, rs, layout } from '@/utils/responsive';

interface SafeAreaContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  backgroundColor?: string;
  noPadding?: boolean;
}

export const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  scrollable = false,
  scrollViewProps,
  backgroundColor,
  noPadding = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate safe area padding based on specified edges
  const safePadding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.background,
    ...safePadding,
    ...style,
  };

  const contentStyle: ViewStyle = {
    paddingHorizontal: noPadding ? 0 : layout.containerPadding,
  };

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            contentStyle,
            { paddingBottom: safePadding.paddingBottom + rs.large },
            scrollViewProps?.contentContainerStyle,
          ]}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[containerStyle, contentStyle]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});

// Header-specific safe area container
interface SafeAreaHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  transparent?: boolean;
}

export const SafeAreaHeader: React.FC<SafeAreaHeaderProps> = ({
  children,
  style,
  transparent = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? 'transparent' : theme.colors.surface,
          paddingHorizontal: layout.containerPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const headerStyles = StyleSheet.create({
  header: {
    paddingBottom: rs.medium,
  },
});

// Bottom tab bar safe area container
interface SafeAreaTabBarProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SafeAreaTabBar: React.FC<SafeAreaTabBarProps> = ({
  children,
  style,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          paddingBottom: insets.bottom,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};