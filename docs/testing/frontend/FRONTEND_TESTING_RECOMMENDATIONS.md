# Frontend Testing Recommendations - Urgent Fixes Required

## Critical Issue: StyleSheet Mock Failure

### Problem
The primary blocker preventing frontend tests from running is that `StyleSheet.create()` returns `undefined`, causing:
```
TypeError: Cannot read properties of undefined (reading 'base')
```

### Root Cause
The current StyleSheet mock in `jest.setup.js` doesn't properly handle the theme-dependent style creation in the Button component.

### Solution 1: Enhanced StyleSheet Mock (High Priority)

Update `jest.setup.js` StyleSheet mock:
```javascript
StyleSheet: {
  create: jest.fn((styles) => {
    // Ensure StyleSheet.create always returns the exact input styles object
    if (!styles || typeof styles !== 'object') {
      return {};
    }
    
    // Return a proxy object that preserves all property access
    return new Proxy(styles, {
      get(target, prop) {
        return target[prop] || {};
      }
    });
  }),
  compose: jest.fn((style1, style2) => [style1, style2].filter(Boolean)),
  flatten: jest.fn((style) => Array.isArray(style) ? Object.assign({}, ...style) : style),
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
},
```

### Solution 2: Button Component Test Fix

Create a dedicated Button test wrapper to ensure proper theme and style handling:

```javascript
// In Button.test.tsx
const ButtonTestWrapper = ({ children }) => {
  // Mock createStyles to return actual style objects
  jest.doMock('react-native', () => ({
    ...jest.requireActual('react-native'),
    StyleSheet: {
      create: (styles) => styles,
    },
  }));
  
  return <TestWrapper>{children}</TestWrapper>;
};
```

## Test Infrastructure Status

### ✅ Working Components
- Jest configuration with jsdom environment
- Basic utility tests (2/2 passing)
- External library mocking (Google Sign-In, QR codes, navigation)
- Theme context with complete structure

### ❌ Failing Components (37/39 tests)
- All React Native component rendering
- Button component (core dependency)
- Social login integration tests
- 2FA setup screen tests

## Implementation Steps

### Step 1: Fix StyleSheet Mock (30 minutes)
1. Update the StyleSheet mock in `jest.setup.js` 
2. Test with simple Button render
3. Verify style object properties are accessible

### Step 2: Resolve Theme Dependencies (15 minutes)
1. Ensure theme mock includes all required properties
2. Verify spacing, borderRadius, and typography structures
3. Test theme context provider in isolation

### Step 3: Update Component Tests (45 minutes)
1. Fix Button component tests to handle new accessibility props
2. Update SocialLoginButton tests for Google Sign-In integration
3. Fix TwoFactorSetupScreen QR code rendering tests

### Step 4: Verify Test Suite (15 minutes)
1. Run full test suite: `npm test -- --watchAll=false`
2. Aim for >80% test pass rate
3. Document remaining issues

## Expected Outcomes

After implementing these fixes:
- **Button component tests**: 10/10 should pass
- **Social login tests**: 8/8 should pass  
- **Overall pass rate**: Should improve from 5.1% to >80%

## React Test Renderer Deprecation

The tests show deprecation warnings for react-test-renderer. Consider migrating to:
```javascript
// Replace react-test-renderer with modern alternatives
import { render } from '@testing-library/react-native';
// Already using this - just remove any remaining react-test-renderer usage
```

## Testing Strategy Going Forward

### Unit Tests Priority
1. **Button component** - Core UI foundation
2. **Theme utilities** - Style system
3. **API service layer** - Network calls
4. **Authentication flows** - Critical user paths

### Integration Tests Priority  
1. **Login flow** - User authentication
2. **2FA setup** - Security features
3. **Social login** - OAuth integration
4. **Navigation** - App routing

### Testing Commands

```bash
# Run all tests
npm test -- --watchAll=false --verbose

# Run specific component tests
npm test -- --testNamePattern="Button" --watchAll=false

# Run with coverage
npm test -- --watchAll=false --coverage

# Debug mode
npm test -- --watchAll=false --verbose --no-cache
```

## Files Requiring Updates

1. `/frontend/jest.setup.js` - StyleSheet mock enhancement
2. `/frontend/src/components/base/__tests__/Button.test.tsx` - Test updates
3. `/frontend/src/components/auth/__tests__/SocialLoginButton.test.tsx` - Google Sign-In mocks
4. `/frontend/src/screens/__tests__/TwoFactorSetupScreen.test.tsx` - QR code handling

## Success Metrics

- [ ] Button component: 10/10 tests passing
- [ ] StyleSheet.create() returns valid objects
- [ ] No "Cannot read properties of undefined" errors
- [ ] Overall test pass rate >80%
- [ ] All React Native components render properly

---
*Priority: Critical - Frontend development blocked until resolved*