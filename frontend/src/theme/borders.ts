export interface RadiusScale {
  none: number;
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export const borderRadius: RadiusScale = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export interface BorderWidths {
  none: number;
  thin: number;
  base: number;
  thick: number;
}

export const borderWidth: BorderWidths = {
  none: 0,
  thin: 0.5,
  base: 1,
  thick: 2,
};