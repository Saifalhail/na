// Set globals that React Native needs
global.__DEV__ = true;
global.__TEST__ = true;

// Mock React Native with proper React components
jest.mock('react-native', () => {
  const React = require('react');

  const mockComponent = (name) => {
    const Component = React.forwardRef((props, ref) => {
      return React.createElement(
        'div',
        {
          ...props,
          ref,
          'data-testid': props.testID || name,
          'data-component': name,
        },
        props.children
      );
    });
    Component.displayName = name;
    return Component;
  };

  return {
    Platform: {
      OS: 'ios',
      Version: '16.0',
      select: jest.fn((dict) => dict.ios),
    },
    Alert: {
      alert: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn((styles) => {
        // Ensure StyleSheet.create always returns the input styles object
        return styles || {};
      }),
      compose: jest.fn((style1, style2) => [style1, style2].filter(Boolean)),
      flatten: jest.fn((style) => style),
      absoluteFill: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      absoluteFillObject: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
    },
    Animated: {
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
        interpolate: jest.fn(),
      })),
      View: mockComponent('Animated.View'),
      Text: mockComponent('Animated.Text'),
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
    },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      out: jest.fn(),
      in: jest.fn(),
    },
    Clipboard: {
      setString: jest.fn(),
      getString: jest.fn(),
    },
    useColorScheme: jest.fn(() => 'light'),
    TouchableOpacity: mockComponent('TouchableOpacity'),
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    TextInput: mockComponent('TextInput'),
    ScrollView: mockComponent('ScrollView'),
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Image: mockComponent('Image'),
    FlatList: mockComponent('FlatList'),
    SafeAreaView: mockComponent('SafeAreaView'),
    RefreshControl: mockComponent('RefreshControl'),
    Switch: mockComponent('Switch'),
    Pressable: mockComponent('Pressable'),
    Modal: mockComponent('Modal'),
  };
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:8000',
      },
    },
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock secure store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));


// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone', // Kept for backward compatibility
    executionEnvironment: 'standalone', // Not 'storeClient' for standalone mode
    manifest: {},
    expoVersion: '53.0.0',
  },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');

  const mockComponent = (name) => {
    const Component = React.forwardRef((props, ref) => {
      return React.createElement(
        'div',
        {
          ...props,
          ref,
          'data-testid': props.testID || name,
          'data-component': name,
        },
        props.children
      );
    });
    Component.displayName = name;
    return Component;
  };

  return {
    GestureHandlerRootView: mockComponent('GestureHandlerRootView'),
    TapGestureHandler: mockComponent('TapGestureHandler'),
    State: {},
    PanGestureHandler: mockComponent('PanGestureHandler'),
    PinchGestureHandler: mockComponent('PinchGestureHandler'),
    RotationGestureHandler: mockComponent('RotationGestureHandler'),
    LongPressGestureHandler: mockComponent('LongPressGestureHandler'),
    FlingGestureHandler: mockComponent('FlingGestureHandler'),
    ForceTouchGestureHandler: mockComponent('ForceTouchGestureHandler'),
    NativeViewGestureHandler: mockComponent('NativeViewGestureHandler'),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  const mockComponent = (name) => {
    const Component = React.forwardRef((props, ref) => {
      return React.createElement(
        'div',
        {
          ...props,
          ref,
          'data-testid': props.testID || name,
          'data-component': name,
        },
        props.children
      );
    });
    Component.displayName = name;
    return Component;
  };

  return {
    SafeAreaView: mockComponent('SafeAreaView'),
    SafeAreaProvider: mockComponent('SafeAreaProvider'),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock theme context
const mockTheme = {
  colors: {
    primary: {
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
    secondary: {
      50: '#FFF3E0',
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
      50: '#FFF8E1',
      100: '#FFECB3',
      200: '#FFE082',
      300: '#FFD54F',
      400: '#FFCA28',
      500: '#FFC107',
      600: '#FFB300',
      700: '#FFA000',
      800: '#FF8F00',
      900: '#FF6F00',
    },
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
      inverse: '#FFFFFF',
    },
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  isDark: false,
};

// Mock theme hooks
jest.mock('./src/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
    themeMode: 'light',
  }),
}));

jest.mock('./src/theme/ThemeContext', () => ({
  ThemeProvider: ({ children }) => children,
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
    themeMode: 'light',
  }),
}));

// Mock theme index file to prevent import errors
jest.mock('./src/theme/index', () => ({
  Theme: mockTheme,
  lightTheme: mockTheme,
  darkTheme: mockTheme,
}));

// Mock layout components that use theme
jest.mock('./src/components/layout/index', () => {
  const React = require('react');

  const mockComponent = (name) => {
    const Component = React.forwardRef((props, ref) => {
      return React.createElement(
        'div',
        {
          ...props,
          ref,
          'data-testid': props.testID || name,
          'data-component': name,
        },
        props.children
      );
    });
    Component.displayName = name;
    return Component;
  };

  return {
    Container: mockComponent('Container'),
    Row: mockComponent('Row'),
    Column: mockComponent('Column'),
    Spacer: mockComponent('Spacer'),
    Divider: mockComponent('Divider'),
  };
});

// Mock QR code library
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const QRCode = React.forwardRef((props, ref) => {
    return React.createElement('div', {
      ...props,
      ref,
      'data-testid': 'QRCode',
      'data-component': 'QRCode',
    });
  });
  QRCode.displayName = 'QRCode';
  return QRCode;
});

// Mock Expo Auth Session
jest.mock('expo-auth-session', () => ({
  useAutoDiscovery: jest.fn(() => ({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  })),
  useAuthRequest: jest.fn(() => [
    { codeChallenge: 'test' }, // request
    null, // response
    jest.fn(), // promptAsync
  ]),
  makeRedirectUri: jest.fn(() => 'exp://localhost:19000'),
  ResponseType: {
    Token: 'token',
    Code: 'code',
  },
}));

// Mock Expo Web Browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'success' }),
}));

// Mock Expo Crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
  digestStringAsync: jest.fn().mockResolvedValue('test-hash'),
}));

// Mock axios
const mockAxiosInstance = {
  get: jest.fn().mockResolvedValue({ data: { success: true } }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } }),
  patch: jest.fn().mockResolvedValue({ data: { success: true } }),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn().mockResolvedValue({ data: { success: true } }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } }),
  patch: jest.fn().mockResolvedValue({ data: { success: true } }),
  default: {
    create: jest.fn(() => mockAxiosInstance),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } }),
    patch: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

// Mock fetch (for other potential usage)
global.fetch = jest.fn();

// Mock accessibility utils
jest.mock('./src/utils/accessibility', () => ({
  getButtonAccessibilityProps: jest.fn((text, disabled, loading) => ({
    accessibilityLabel: text,
    accessibilityRole: 'button',
    accessibilityState: { disabled, busy: loading },
  })),
  announce: jest.fn(),
  getActionHint: jest.fn(() => 'Tap to perform action'),
  getNutritionLabel: jest.fn((value, unit, nutrient) => `${value} ${unit} of ${nutrient}`),
}));

// Mock base components that use theme
jest.mock('./src/components/base/TextInput', () => {
  const React = require('react');

  const TextInput = React.forwardRef((props, ref) => {
    return React.createElement('input', {
      ...props,
      ref,
      'data-testid': props.testID || 'TextInput',
      'data-component': 'TextInput',
      placeholder: props.placeholder,
      value: props.value,
      onChange: (e) => props.onChangeText && props.onChangeText(e.target.value),
    });
  });
  TextInput.displayName = 'TextInput';
  return { TextInput };
});

jest.mock('./src/components/base/Button', () => {
  const React = require('react');

  const Button = React.forwardRef((props, ref) => {
    return React.createElement(
      'button',
      {
        ...props,
        ref,
        'data-testid': props.testID || 'Button',
        'data-component': 'Button',
        onClick: props.onPress,
        disabled: props.disabled || props.loading,
      },
      props.title || props.children
    );
  });
  Button.displayName = 'Button';
  return { Button };
});

jest.mock('./src/components/base/Loading', () => {
  const React = require('react');

  const Loading = (props) => {
    return React.createElement(
      'div',
      {
        ...props,
        'data-testid': 'Loading',
        'data-component': 'Loading',
      },
      'Loading...'
    );
  };
  return { Loading };
});

jest.mock('./src/components/base/ErrorDisplay', () => {
  const React = require('react');

  const ErrorDisplay = (props) => {
    return React.createElement(
      'div',
      {
        ...props,
        'data-testid': 'ErrorDisplay',
        'data-component': 'ErrorDisplay',
      },
      props.message || props.error || 'Error'
    );
  };
  return { ErrorDisplay };
});

// Mock new components
jest.mock('./src/components/base/InfoTooltip', () => {
  const React = require('react');
  const InfoTooltip = (props) => {
    return React.createElement(
      'div',
      {
        ...props,
        'data-testid': 'InfoTooltip',
        'data-component': 'InfoTooltip',
      },
      props.children
    );
  };
  return { InfoTooltip };
});

jest.mock('./src/components/base/SegmentedControl', () => {
  const React = require('react');
  const SegmentedControl = (props) => {
    return React.createElement(
      'div',
      {
        ...props,
        'data-testid': 'SegmentedControl',
        'data-component': 'SegmentedControl',
      },
      'Segmented Control'
    );
  };
  return { SegmentedControl };
});

jest.mock('./src/components/base/NutritionGauge', () => {
  const React = require('react');
  const NutritionGauge = (props) => {
    return React.createElement(
      'div',
      {
        ...props,
        'data-testid': 'NutritionGauge',
        'data-component': 'NutritionGauge',
      },
      `${props.value || 0}${props.unit || ''} ${props.label || ''}`
    );
  };
  return { NutritionGauge };
});

// Additional testing utilities can be added here

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
