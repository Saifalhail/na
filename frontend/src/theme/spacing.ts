export interface SpacingScale {
  xs: number;
  s: number;
  m: number;
  l: number;
  xl: number;
  xxl: number;
}

export const spacing: SpacingScale = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

// Grid system
export const grid = {
  gutter: spacing.m,
  columnGap: spacing.s,
  rowGap: spacing.s,
};

// Layout constants
export const layout = {
  screenPadding: spacing.m,
  cardPadding: spacing.m,
  buttonPadding: {
    horizontal: spacing.m,
    vertical: spacing.s,
  },
  inputPadding: {
    horizontal: spacing.m,
    vertical: spacing.s,
  },
};