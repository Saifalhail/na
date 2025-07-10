import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

// Container component
interface ContainerProps extends ViewProps {
  safe?: boolean;
  scroll?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  center?: boolean;
  scrollProps?: ScrollViewProps;
}

export const Container: React.FC<ContainerProps> = ({
  safe = true,
  scroll = false,
  padding = 'medium',
  center = false,
  scrollProps,
  children,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const containerStyle: ViewStyle[] = [
    styles.container,
    styles[`${padding}Padding`],
    ...(center ? [styles.center] : []),
    style as ViewStyle,
  ];

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[containerStyle, styles.scrollContent]}
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );

  if (safe) {
    return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
  }

  return content;
};

// Row component
interface RowProps extends ViewProps {
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: number;
}

export const Row: React.FC<RowProps> = ({
  align = 'center',
  justify = 'start',
  wrap = false,
  gap = 0,
  children,
  style,
  ...props
}) => {
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems:
      align === 'start'
        ? 'flex-start'
        : align === 'end'
          ? 'flex-end'
          : align === 'stretch'
            ? 'stretch'
            : 'center',
    justifyContent:
      justify === 'start'
        ? 'flex-start'
        : justify === 'end'
          ? 'flex-end'
          : justify === 'between'
            ? 'space-between'
            : justify === 'around'
              ? 'space-around'
              : justify === 'evenly'
                ? 'space-evenly'
                : 'center',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    gap,
  };

  return (
    <View style={[rowStyle, style]} {...props}>
      {children}
    </View>
  );
};

// Column component
interface ColumnProps extends ViewProps {
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: number;
}

export const Column: React.FC<ColumnProps> = ({
  align = 'stretch',
  justify = 'start',
  gap = 0,
  children,
  style,
  ...props
}) => {
  const columnStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems:
      align === 'start'
        ? 'flex-start'
        : align === 'end'
          ? 'flex-end'
          : align === 'center'
            ? 'center'
            : 'stretch',
    justifyContent:
      justify === 'start'
        ? 'flex-start'
        : justify === 'end'
          ? 'flex-end'
          : justify === 'between'
            ? 'space-between'
            : justify === 'around'
              ? 'space-around'
              : justify === 'evenly'
                ? 'space-evenly'
                : 'center',
    gap,
  };

  return (
    <View style={[columnStyle, style]} {...props}>
      {children}
    </View>
  );
};

// Spacer component
interface SpacerProps {
  size?: 'xs' | 'xsmall' | 's' | 'small' | 'm' | 'medium' | 'l' | 'large' | 'xl' | 'xlarge' | 'xxl';
  horizontal?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({ size = 'medium', horizontal = false }) => {
  const { theme } = useTheme();

  const spacing = {
    xs: theme.spacing.xs,
    xsmall: theme.spacing.xs,
    s: theme.spacing.s,
    small: theme.spacing.s,
    m: theme.spacing.m,
    medium: theme.spacing.m,
    l: theme.spacing.l,
    large: theme.spacing.l,
    xl: theme.spacing.xl,
    xlarge: theme.spacing.xl,
    xxl: theme.spacing.xxl || theme.spacing.xl * 1.5,
  };

  const spacerStyle: ViewStyle = horizontal ? { width: spacing[size] } : { height: spacing[size] };

  return <View style={spacerStyle} />;
};

// Divider component
interface DividerProps {
  color?: string;
  thickness?: number;
  spacing?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  color,
  thickness = 1,
  spacing = 'medium',
  style,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const dividerStyle: ViewStyle[] = [
    styles.divider,
    {
      backgroundColor: color || theme.colors.neutral[300],
      height: thickness,
    },
    styles[`${spacing}Spacing`],
    style as ViewStyle,
  ];

  return <View style={dividerStyle} />;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    nonePadding: {
      padding: 0,
    },
    smallPadding: {
      padding: theme.spacing.s,
    },
    mediumPadding: {
      padding: theme.spacing.m,
    },
    largePadding: {
      padding: theme.spacing.l,
    },
    divider: {
      width: '100%',
    },
    noneSpacing: {
      marginVertical: 0,
    },
    smallSpacing: {
      marginVertical: theme.spacing.s,
    },
    mediumSpacing: {
      marginVertical: theme.spacing.m,
    },
    largeSpacing: {
      marginVertical: theme.spacing.l,
    },
  });

// Export all components as default for convenience
export default {
  Container,
  Row,
  Column,
  Spacer,
  Divider,
};
