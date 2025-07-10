# Frontend Testing Requirements

## Current Status
🔴 **No testing infrastructure is set up** - The frontend currently has no test files, configuration, or dependencies.

## Required Testing Infrastructure

### 1. Testing Framework Dependencies
Add these to `package.json`:

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "react-test-renderer": "^18.2.0",
    "jest-expo": "^51.0.0",
    "@types/jest": "^29.5.0"
  }
}
```

### 2. Jest Configuration
Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  moduleNameMapping: {
    '\\.(jpg|jpeg|png|gif|svg)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/__tests__/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
};
```

### 3. Jest Setup File
Create `jest.setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect';

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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock react-native-async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Set up global fetch mock
global.fetch = jest.fn();
```

### 4. Test Scripts
Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "jest --verbose"
  }
}
```

### 5. Initial Test Structure
Create these test files:

#### `src/components/__tests__/Button.test.tsx`
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button title="Test Button" />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Test Button" onPress={onPress} />);
    
    fireEvent.press(getByText('Test Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

#### `src/screens/__tests__/LoginScreen.test.tsx`
```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

// Mock the auth service
jest.mock('../../services/auth', () => ({
  login: jest.fn(),
}));

describe('LoginScreen', () => {
  it('renders login form', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = render(<LoginScreen />);
    const loginButton = getByText('Login');
    
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });
  });
});
```

#### `src/services/__tests__/api.test.ts`
```typescript
import { API_BASE_URL, apiClient } from '../api';

describe('API Client', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('makes GET requests correctly', async () => {
    const mockResponse = { data: 'test' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient.get('/test');
    
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/test`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('handles API errors correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request' }),
    });

    await expect(apiClient.get('/test')).rejects.toThrow('Bad Request');
  });
});
```

### 6. Coverage Targets
Set up coverage thresholds in jest.config.js:

```javascript
module.exports = {
  // ... other config
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

## Testing Priorities

### Phase 1: Basic Setup
1. Install testing dependencies
2. Create Jest configuration
3. Set up test scripts
4. Create initial test structure

### Phase 2: Core Component Tests
1. Button, Input, Modal components
2. Navigation components
3. Form validation components

### Phase 3: Screen Tests
1. Authentication screens
2. Main app screens (Home, Profile, Settings)
3. Navigation flow tests

### Phase 4: Service Tests
1. API client tests
2. Authentication service tests
3. Storage service tests
4. Image handling tests

### Phase 5: Integration Tests
1. End-to-end user workflows
2. API integration tests
3. State management tests

## Test Organization

```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── screens/
│   ├── LoginScreen.tsx
│   └── __tests__/
│       └── LoginScreen.test.tsx
├── services/
│   ├── api.ts
│   └── __tests__/
│       └── api.test.ts
└── utils/
    ├── validation.ts
    └── __tests__/
        └── validation.test.ts
```

## Next Steps for Frontend Agent

1. **Install Dependencies**: Run `npm install` with the testing packages
2. **Create Configuration**: Set up jest.config.js and jest.setup.js
3. **Add Test Scripts**: Update package.json with test scripts
4. **Create First Tests**: Start with basic component tests
5. **Set Up CI/CD**: Integrate tests into build pipeline

Once this infrastructure is set up, the Test Manager will monitor and maintain frontend tests alongside backend tests.

---
*This document will be updated as the testing infrastructure evolves*