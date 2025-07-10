# Frontend Architecture Documentation

## Overview
The Nutrition AI frontend is built with React Native and TypeScript, providing a cross-platform mobile application for iOS and Android. The application follows a component-based architecture with a focus on reusability, type safety, and performance.

## Technology Stack

### Core Technologies
- **React Native**: Cross-platform mobile framework
- **TypeScript**: Type-safe JavaScript
- **Expo**: Development platform and tooling
- **Zustand**: State management
- **React Navigation**: Navigation framework

### Additional Libraries
- **react-native-mmkv**: Fast, encrypted key-value storage
- **axios**: HTTP client with interceptors
- **expo-secure-store**: Secure token storage
- **react-native-reanimated**: Smooth animations
- **@react-native-async-storage/async-storage**: Persistent storage

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── base/         # Basic building blocks
│   │   ├── layout/       # Layout components
│   │   └── nutrition/    # Domain-specific components
│   ├── screens/          # Screen components
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API and external services
│   │   ├── api/         # API client and endpoints
│   │   └── storage/     # Storage services
│   ├── store/           # Zustand state management
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── theme/           # Theme and styling
│   └── config/          # App configuration
├── assets/              # Images, fonts, etc.
└── app.json            # Expo configuration
```

## Key Components

### 1. State Management (Zustand)

The application uses Zustand for state management with the following stores:

#### authStore
- Manages authentication state and JWT tokens
- Handles login, logout, and token refresh
- Persists authentication state

#### userStore
- Manages user profile and preferences
- Handles dietary restrictions
- Manages notification settings

#### mealStore
- Manages meal data and operations
- Handles favorites and filtering
- Provides meal statistics

#### uiStore
- Manages UI state (theme, loading, modals)
- Handles toast notifications
- Tracks navigation state

### 2. API Client

The API client is built with Axios and includes:
- Automatic JWT token management
- Token refresh on 401 errors
- Request/response interceptors
- Rate limiting
- Offline queue support
- Error handling

### 3. Component Library

#### Base Components
- **Button**: Multiple variants (primary, secondary, outline, text, danger)
- **TextInput**: With validation and error states
- **Card**: Elevated, outlined, and filled variants
- **Loading**: Spinner, overlay, skeleton loaders
- **ErrorDisplay**: Error states with retry options

#### Layout Components
- **Container**: Safe area wrapper with padding options
- **Row/Column**: Flexbox utilities
- **Spacer**: Consistent spacing
- **Divider**: Visual separator

### 4. Theme System

The theme system provides:
- Light and dark mode support
- Consistent color palette
- Typography scale
- Spacing system
- Shadow definitions
- Border radius scale

## Security Features

### Token Management
- Secure storage using Expo SecureStore
- Automatic token refresh
- Token expiry handling
- Secure logout with token cleanup

### Error Boundary
- Global error catching
- Error reporting integration
- User-friendly error displays

### Environment Variables
- Secure configuration management
- Feature flags
- API endpoint configuration

## Development Workflow

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Husky pre-commit hooks

### Environment Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### Environment Variables
Create a `.env` file based on `.env.example`:
```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_client_id
EXPO_PUBLIC_ENVIRONMENT=development
```

## Performance Optimizations

### Storage
- MMKV for fast key-value storage
- Selective state persistence
- Efficient data caching

### Network
- Request debouncing
- Offline queue for failed requests
- Automatic retry with exponential backoff
- Response caching

### UI
- Lazy loading of screens
- Optimized re-renders with Zustand
- Memoized selectors
- Virtual scrolling for large lists

## Testing Strategy

### Unit Tests
- Component testing with React Native Testing Library
- Hook testing with @testing-library/react-hooks
- Store testing for Zustand

### Integration Tests
- API integration tests
- Navigation flow tests
- Authentication flow tests

## Deployment

### Build Process
```bash
# Build for production
npm run build

# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

### Release Channels
- Development: Local development
- Staging: Testing environment
- Production: Live application

## Future Enhancements

### Planned Features
1. Biometric authentication
2. Push notifications
3. Offline mode improvements
4. Advanced caching strategies
5. Performance monitoring
6. Analytics integration

### Technical Debt
1. Implement comprehensive test coverage
2. Add Storybook for component documentation
3. Implement code splitting
4. Add performance monitoring
5. Enhance error tracking

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build issues**
   ```bash
   cd ios && pod install
   ```

3. **Android build issues**
   ```bash
   cd android && ./gradlew clean
   ```

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)