export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  disabled: string;
  inverse: string;
}

export interface GradientDefinition {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export interface Gradients {
  primary: GradientDefinition;
  secondary: GradientDefinition;
  success: GradientDefinition;
  warning: GradientDefinition;
  error: GradientDefinition;
  info: GradientDefinition;
  sunset: GradientDefinition;
  ocean: GradientDefinition;
  forest: GradientDefinition;
  aurora: GradientDefinition;
  candy: GradientDefinition;
  midnight: GradientDefinition;
}

export interface Colors {
  primary: ColorScale;
  secondary: ColorScale;
  neutral: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
  background: string;
  surface: string;
  text: TextColors;
  white: string;
  black: string;
  // Convenience properties
  textSecondary: string;
  shadow: string;
  border: string;
  borderLight: string;
  // New gradient system
  gradients: Gradients;
  // Accent colors for visual pop
  accent: {
    purple: string;
    pink: string;
    cyan: string;
    lime: string;
    amber: string;
  };
}

export const lightColors: Colors = {
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  secondary: {
    50: '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#26A69A',
    500: '#009688',
    600: '#00897B',
    700: '#00796B',
    800: '#00695C',
    900: '#004D40',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  warning: {
    50: '#FFF4E6',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#FF9800',
    600: '#FB8C00',
    700: '#F57C00',
    800: '#EF6C00',
    900: '#E65100',
  },
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  info: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Convenience properties
  textSecondary: '#757575',
  shadow: '#000000',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  // New gradient system
  gradients: {
    primary: {
      colors: ['#42A5F5', '#2196F3', '#1976D2'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    secondary: {
      colors: ['#4DB6AC', '#26A69A', '#00897B'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    success: {
      colors: ['#66BB6A', '#4CAF50', '#388E3C'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    warning: {
      colors: ['#FFA726', '#FF9800', '#F57C00'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    error: {
      colors: ['#EF5350', '#F44336', '#D32F2F'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    info: {
      colors: ['#64B5F6', '#42A5F5', '#1E88E5'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    sunset: {
      colors: ['#FFA726', '#FF7043', '#F4511E'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.8 },
    },
    ocean: {
      colors: ['#26C6DA', '#00ACC1', '#0097A7'],
      start: { x: 0, y: 0 },
      end: { x: 0.8, y: 1 },
    },
    forest: {
      colors: ['#66BB6A', '#43A047', '#2E7D32'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    aurora: {
      colors: ['#AB47BC', '#7B1FA2', '#4A148C'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.5 },
    },
    candy: {
      colors: ['#EC407A', '#E91E63', '#C2185B'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    midnight: {
      colors: ['#3F51B5', '#303F9F', '#1A237E'],
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
    },
  },
  // Accent colors for visual pop
  accent: {
    purple: '#9C27B0',
    pink: '#E91E63',
    cyan: '#00BCD4',
    lime: '#CDDC39',
    amber: '#FFC107',
  },
};

export const darkColors: Colors = {
  primary: {
    50: '#0D47A1',
    100: '#1565C0',
    200: '#1976D2',
    300: '#1E88E5',
    400: '#2196F3',
    500: '#42A5F5',
    600: '#64B5F6',
    700: '#90CAF9',
    800: '#BBDEFB',
    900: '#E3F2FD',
  },
  secondary: {
    50: '#004D40',
    100: '#00695C',
    200: '#00796B',
    300: '#00897B',
    400: '#009688',
    500: '#26A69A',
    600: '#4DB6AC',
    700: '#80CBC4',
    800: '#B2DFDB',
    900: '#E0F2F1',
  },
  neutral: {
    50: '#121212',
    100: '#1E1E1E',
    200: '#2C2C2C',
    300: '#3C3C3C',
    400: '#4E4E4E',
    500: '#626262',
    600: '#7C7C7C',
    700: '#919191',
    800: '#A9A9A9',
    900: '#C2C2C2',
  },
  success: {
    50: '#1B5E20',
    100: '#2E7D32',
    200: '#388E3C',
    300: '#43A047',
    400: '#4CAF50',
    500: '#66BB6A',
    600: '#81C784',
    700: '#A5D6A7',
    800: '#C8E6C9',
    900: '#E8F5E9',
  },
  warning: {
    50: '#E65100',
    100: '#EF6C00',
    200: '#F57C00',
    300: '#FB8C00',
    400: '#FF9800',
    500: '#FFA726',
    600: '#FFB74D',
    700: '#FFCC80',
    800: '#FFE0B2',
    900: '#FFF4E6',
  },
  error: {
    50: '#B71C1C',
    100: '#C62828',
    200: '#D32F2F',
    300: '#E53935',
    400: '#F44336',
    500: '#EF5350',
    600: '#E57373',
    700: '#EF9A9A',
    800: '#FFCDD2',
    900: '#FFEBEE',
  },
  info: {
    50: '#0D47A1',
    100: '#1565C0',
    200: '#1976D2',
    300: '#1E88E5',
    400: '#2196F3',
    500: '#42A5F5',
    600: '#64B5F6',
    700: '#90CAF9',
    800: '#BBDEFB',
    900: '#E3F2FD',
  },
  background: '#121212',
  surface: '#1E1E1E',
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    disabled: '#666666',
    inverse: '#212121',
  },
  white: '#FFFFFF',
  black: '#000000',
  // Convenience properties
  textSecondary: '#B3B3B3',
  shadow: '#000000',
  border: '#3C3C3C',
  borderLight: '#4E4E4E',
  // New gradient system
  gradients: {
    primary: {
      colors: ['#64B5F6', '#42A5F5', '#2196F3'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    secondary: {
      colors: ['#4DB6AC', '#26A69A', '#009688'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    success: {
      colors: ['#81C784', '#66BB6A', '#4CAF50'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    warning: {
      colors: ['#FFB74D', '#FFA726', '#FF9800'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    error: {
      colors: ['#E57373', '#EF5350', '#F44336'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    info: {
      colors: ['#90CAF9', '#64B5F6', '#42A5F5'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    sunset: {
      colors: ['#FFB74D', '#FF8A65', '#FF7043'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.8 },
    },
    ocean: {
      colors: ['#4DD0E1', '#26C6DA', '#00ACC1'],
      start: { x: 0, y: 0 },
      end: { x: 0.8, y: 1 },
    },
    forest: {
      colors: ['#81C784', '#66BB6A', '#4CAF50'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    aurora: {
      colors: ['#CE93D8', '#BA68C8', '#AB47BC'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0.5 },
    },
    candy: {
      colors: ['#F48FB1', '#F06292', '#EC407A'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
    midnight: {
      colors: ['#7986CB', '#5C6BC0', '#3F51B5'],
      start: { x: 0, y: 0 },
      end: { x: 0.5, y: 1 },
    },
  },
  // Accent colors for visual pop
  accent: {
    purple: '#CE93D8',
    pink: '#F48FB1',
    cyan: '#4DD0E1',
    lime: '#E6EE9C',
    amber: '#FFD54F',
  },
};
