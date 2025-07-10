import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useAppTheme } from '@theme/ThemeContext';
import { Theme } from '@theme/index';

/**
 * Hook for creating themed styles
 * @param createStyles Function that receives theme and returns styles
 * @returns Memoized styles object
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  createStyles: (theme: Theme) => T
): T {
  const theme = useAppTheme();
  
  return useMemo(() => {
    return StyleSheet.create(createStyles(theme));
  }, [theme, createStyles]);
}

/**
 * Hook for creating dynamic themed styles
 * @param createStyles Function that receives theme and props, returns styles
 * @param props Props to pass to the style creator
 * @returns Memoized styles object
 */
export function useDynamicStyles<T extends StyleSheet.NamedStyles<T>, P>(
  createStyles: (theme: Theme, props: P) => T,
  props: P
): T {
  const theme = useAppTheme();
  
  return useMemo(() => {
    return StyleSheet.create(createStyles(theme, props));
  }, [theme, props, createStyles]);
}