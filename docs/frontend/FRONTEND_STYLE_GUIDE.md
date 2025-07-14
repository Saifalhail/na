# Frontend Style Guide

## Overview

This document defines the coding standards, naming conventions, and best practices for the Nutrition AI frontend codebase.

## TypeScript Guidelines

### General Rules

1. **Strict Mode**: Always use TypeScript in strict mode
2. **No Any**: Avoid using `any` type; use `unknown` if type is truly unknown
3. **Explicit Types**: Be explicit with types, especially for function parameters and return values
4. **Type Inference**: Let TypeScript infer types when obvious (e.g., `const name = 'John'`)

### Type Definitions

```typescript
// ✅ Good: Use interfaces for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Good: Use type aliases for unions and primitives
type Status = "pending" | "active" | "inactive";
type UserId = string;

// ❌ Bad: Don't use type for object shapes
type User = {
  id: string;
  name: string;
};
```

### Function Types

```typescript
// ✅ Good: Explicit parameter and return types
function calculateBMI(weight: number, height: number): number {
  return weight / (height * height);
}

// ✅ Good: Arrow function with types
const formatName = (user: User): string => {
  return `${user.firstName} ${user.lastName}`;
};

// ❌ Bad: Missing types
function calculateBMI(weight, height) {
  return weight / (height * height);
}
```

### Generics

```typescript
// ✅ Good: Meaningful generic names
interface ApiResponse<TData> {
  data: TData;
  error?: string;
}

// ✅ Good: Constrained generics
function updateItem<T extends { id: string }>(items: T[], update: T): T[] {
  return items.map((item) => (item.id === update.id ? update : item));
}

// ❌ Bad: Single letter generics without context
interface Response<T> {
  data: T;
}
```

## React/React Native Guidelines

### Component Structure

```typescript
// ✅ Good: Functional component with proper typing
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

// ❌ Bad: Class components (unless absolutely necessary)
class Button extends React.Component {
  // ...
}
```

### Hooks Usage

```typescript
// ✅ Good: Custom hook with clear naming
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user
  }, []);

  return { user, loading };
};

// ✅ Good: Memoization when needed
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ❌ Bad: Overusing useMemo/useCallback
const simpleValue = useMemo(() => {
  return x + y;
}, [x, y]); // Unnecessary for simple calculations
```

### Props and State

```typescript
// ✅ Good: Destructure props
const Card = ({ title, children, onPress }: CardProps) => {
  // ...
};

// ✅ Good: Meaningful state names
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);

// ❌ Bad: Ambiguous state names
const [loading, setLoading] = useState(false);
const [error, setError] = useState(false);
```

## Naming Conventions

### Files and Folders

```
✅ Good:
src/
  components/
    Button/
      Button.tsx          # Component file
      Button.styles.ts    # Styles
      Button.test.tsx     # Tests
      index.ts           # Export
  screens/
    LoginScreen.tsx      # Screen components
  hooks/
    useAuth.ts          # Custom hooks
  utils/
    formatDate.ts       # Utility functions

❌ Bad:
src/
  components/
    button.tsx          # Lowercase component
    ButtonComponent.tsx # Redundant suffix
  utils/
    DateUtils.ts        # Class-like naming for functions
```

### Variables and Functions

```typescript
// ✅ Good: Descriptive names
const userProfile = await fetchUserProfile(userId);
const isEmailValid = validateEmail(email);
const handleSubmit = () => {
  /* ... */
};

// ✅ Good: Boolean prefixes
const isLoading = true;
const hasError = false;
const canSubmit = true;
const shouldRefresh = false;

// ❌ Bad: Unclear names
const data = await fetch(id);
const valid = check(email);
const submit = () => {
  /* ... */
};
```

### Constants

```typescript
// ✅ Good: UPPER_SNAKE_CASE for constants
const API_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;

export const MEAL_TYPES = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACK: "snack",
} as const;

// ❌ Bad: Inconsistent naming
const apiTimeout = 30000;
const MaxRetries = 3;
```

## Code Organization

### Import Order

```typescript
// 1. React imports
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

// 2. Third-party imports
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

// 3. Internal imports (absolute paths)
import { Button } from "@components/Button";
import { useAuth } from "@hooks/useAuth";
import { formatDate } from "@utils/formatDate";

// 4. Relative imports
import { localHelper } from "./helpers";
import { styles } from "./styles";

// 5. Type imports
import type { User } from "@types/models";
```

### Component Organization

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Types/Interfaces
interface ProfileScreenProps {
  userId: string;
}

// 3. Component
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ userId }) => {
  // 4. Hooks
  const navigation = useNavigation();
  const { user, loading } = useUser(userId);

  // 5. State
  const [isEditing, setIsEditing] = useState(false);

  // 6. Effects
  useEffect(() => {
    // Effect logic
  }, [userId]);

  // 7. Handlers
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 8. Render helpers
  const renderContent = () => {
    if (loading) return <Loading />;
    return <UserInfo user={user} />;
  };

  // 9. Main render
  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

// 10. Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Styling Guidelines

### StyleSheet Usage

```typescript
// ✅ Good: Use StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
});

// ❌ Bad: Inline styles
<View style={{ flex: 1, padding: 16 }}>
  <Text style={{ fontSize: 24 }}>Title</Text>
</View>
```

### Theme Usage

```typescript
// ✅ Good: Use theme variables
const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary[500],
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.medium,
  },
});

// ❌ Bad: Hard-coded values
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
  },
});
```

## Error Handling

### Try-Catch Blocks

```typescript
// ✅ Good: Specific error handling
try {
  const response = await api.fetchMeals();
  setMeals(response.data);
} catch (error) {
  if (error instanceof NetworkError) {
    showToast("No internet connection");
  } else if (error instanceof ApiError) {
    showToast(error.message);
  } else {
    showToast("An unexpected error occurred");
    console.error("Unexpected error:", error);
  }
} finally {
  setLoading(false);
}

// ❌ Bad: Generic error handling
try {
  const response = await api.fetchMeals();
  setMeals(response.data);
} catch (error) {
  console.log(error);
}
```

### Error Boundaries

```typescript
// ✅ Good: Component-specific error boundaries
export const MealListErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<MealListError />}
      onError={(error) => logError('MealList', error)}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Testing Guidelines

### Component Tests

```typescript
// ✅ Good: Descriptive test names
describe('Button', () => {
  it('should render with title', () => {
    const { getByText } = render(<Button title="Click me" onPress={jest.fn()} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click me" onPress={onPress} />);

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click me" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

## Performance Guidelines

### Memoization

```typescript
// ✅ Good: Memoize expensive components
export const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison if needed
  return prevProps.items.length === nextProps.items.length;
});

// ✅ Good: Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => b.date - a.date);
}, [items]);
```

### List Optimization

```typescript
// ✅ Good: Optimized FlatList
<FlatList
  data={meals}
  renderItem={({ item }) => <MealCard meal={item} />}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

## Comments and Documentation

### JSDoc Comments

```typescript
/**
 * Calculates the Body Mass Index (BMI)
 * @param weight - Weight in kilograms
 * @param height - Height in meters
 * @returns BMI value rounded to 1 decimal place
 * @throws {Error} If weight or height is not positive
 */
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    throw new Error("Weight and height must be positive values");
  }
  return Math.round((weight / (height * height)) * 10) / 10;
}
```

### Inline Comments

```typescript
// ✅ Good: Explain why, not what
// Using debounce to prevent API spam while user types
const debouncedSearch = useMemo(
  () => debounce(searchMeals, 500),
  [searchMeals],
);

// ❌ Bad: Obvious comments
// Set loading to true
setLoading(true);
// Fetch data
const data = await fetchData();
// Set loading to false
setLoading(false);
```

## Git Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Examples

```
✅ Good:
feat(auth): add biometric authentication support

- Implement Face ID/Touch ID for iOS
- Add fingerprint authentication for Android
- Store preference in secure storage

Closes #123

✅ Good:
fix(meals): prevent duplicate favorites on rapid taps

Add debounce to favorite button to prevent multiple API calls

❌ Bad:
fix: fixed stuff
update code
WIP
```

## Code Review Checklist

- [ ] TypeScript types are properly defined
- [ ] No `any` types without justification
- [ ] Components are properly memoized where needed
- [ ] Error handling is comprehensive
- [ ] Code follows naming conventions
- [ ] Tests are included for new functionality
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] Accessibility considerations are addressed
- [ ] Performance implications are considered
