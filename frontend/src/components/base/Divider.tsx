import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/theme';
import { rs } from '@/utils/responsive';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';

interface DividerProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  thickness?: number;
  color?: string;
  spacing?: 'small' | 'medium' | 'large' | 'none';
  text?: string;
  textStyle?: TextStyle;
  style?: ViewStyle;
  testID?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 1,
  color,
  spacing = 'medium',
  text,
  textStyle,
  style,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const dividerColor = color || theme.colors.neutral[200];
  const isHorizontal = orientation === 'horizontal';

  const lineStyle: ViewStyle = {
    backgroundColor: variant === 'solid' ? dividerColor : 'transparent',
    [isHorizontal ? 'height' : 'width']: thickness,
    [isHorizontal ? 'width' : 'height']: variant === 'solid' ? '100%' : undefined,
  };

  if (variant === 'dashed' || variant === 'dotted') {
    lineStyle.borderStyle = 'dashed';
    lineStyle[isHorizontal ? 'borderBottomWidth' : 'borderRightWidth'] = thickness;
    lineStyle.borderColor = dividerColor;
    
    // React Native doesn't support dotted style well, so we simulate it
    if (variant === 'dotted') {
      lineStyle.borderStyle = 'dotted';
    }
  }

  const containerStyle = [
    styles.container,
    isHorizontal ? styles.horizontal : styles.vertical,
    styles[`${spacing}Spacing`],
    style,
  ].filter(Boolean) as ViewStyle[];

  if (text && isHorizontal) {
    return (
      <View style={containerStyle} testID={testID}>
        <View style={[styles.line, lineStyle, styles.lineWithText]} />
        <Text style={[styles.text, textStyle]}>{text}</Text>
        <View style={[styles.line, lineStyle, styles.lineWithText]} />
      </View>
    );
  }

  return (
    <View
      style={[containerStyle, lineStyle]}
      testID={testID}
    />
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    horizontal: {
      flexDirection: 'row',
      width: '100%',
    },
    vertical: {
      flexDirection: 'column',
      height: '100%',
    },
    line: {
      flex: 1,
    },
    lineWithText: {
      marginHorizontal: theme.spacing.m,
    },
    text: {
      color: theme.colors.neutral[500],
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      paddingHorizontal: theme.spacing.s,
    },
    // Spacing
    noneSpacing: {
      marginVertical: 0,
      marginHorizontal: 0,
    },
    smallSpacing: {
      marginVertical: theme.spacing.xs,
      marginHorizontal: theme.spacing.xs,
    },
    mediumSpacing: {
      marginVertical: theme.spacing.m,
      marginHorizontal: theme.spacing.m,
    },
    largeSpacing: {
      marginVertical: theme.spacing.l,
      marginHorizontal: theme.spacing.l,
    },
  });

export default Divider;