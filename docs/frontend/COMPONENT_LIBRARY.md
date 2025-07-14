# Component Library

## Overview

This document serves as a comprehensive reference for all reusable components in the Nutrition AI frontend. Each component is built with TypeScript, fully documented, and designed for reusability.

## Component Categories

### Base Components

#### Button

**Purpose**: Primary interactive element for user actions

**Props**:

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "text";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  testID?: string;
}
```

**Usage**:

```tsx
<Button
  title="Analyze Photo"
  onPress={handleAnalyze}
  variant="primary"
  size="large"
  icon="camera"
  fullWidth
/>
```

#### Input

**Purpose**: Text input field with validation support

**Props**:

```typescript
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  testID?: string;
}
```

**Usage**:

```tsx
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
  leftIcon="mail"
/>
```

#### Typography

**Purpose**: Consistent text styling across the app

**Props**:

```typescript
interface TypographyProps {
  variant:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body1"
    | "body2"
    | "caption"
    | "overline";
  children: React.ReactNode;
  color?: "primary" | "secondary" | "text" | "textSecondary" | "error";
  align?: "left" | "center" | "right" | "justify";
  weight?: "regular" | "medium" | "semibold" | "bold";
  numberOfLines?: number;
  selectable?: boolean;
  testID?: string;
}
```

**Usage**:

```tsx
<Typography variant="h2" color="primary" align="center">
  Welcome Back!
</Typography>
```

### Layout Components

#### Container

**Purpose**: Main screen wrapper with safe area support

**Props**:

```typescript
interface ContainerProps {
  children: React.ReactNode;
  edges?: Edge[];
  backgroundColor?: string;
  padding?: boolean;
  scroll?: boolean;
  refreshControl?: React.ReactElement;
  keyboardAware?: boolean;
  testID?: string;
}
```

**Usage**:

```tsx
<Container edges={["top", "bottom"]} scroll keyboardAware>
  {/* Screen content */}
</Container>
```

#### Row

**Purpose**: Horizontal flexbox container

**Props**:

```typescript
interface RowProps {
  children: React.ReactNode;
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  wrap?: boolean;
  gap?: number;
  padding?: number;
  testID?: string;
}
```

**Usage**:

```tsx
<Row justify="space-between" align="center" gap={16}>
  <Text>Label</Text>
  <Switch value={enabled} onValueChange={setEnabled} />
</Row>
```

#### Column

**Purpose**: Vertical flexbox container

**Props**:

```typescript
interface ColumnProps {
  children: React.ReactNode;
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: number;
  padding?: number;
  flex?: number;
  testID?: string;
}
```

**Usage**:

```tsx
<Column gap={24} padding={16}>
  <Card>...</Card>
  <Card>...</Card>
</Column>
```

#### Spacer

**Purpose**: Consistent spacing between elements

**Props**:

```typescript
interface SpacerProps {
  size?: "xs" | "s" | "m" | "l" | "xl" | number;
  horizontal?: boolean;
}
```

**Usage**:

```tsx
<View>
  <Text>First Item</Text>
  <Spacer size="m" />
  <Text>Second Item</Text>
</View>
```

### Display Components

#### Card

**Purpose**: Container with elevation and padding

**Props**:

```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: "elevated" | "outlined" | "filled";
  padding?: "none" | "small" | "medium" | "large";
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}
```

**Usage**:

```tsx
<Card variant="elevated" padding="medium" onPress={handlePress}>
  <Typography variant="h4">Meal Summary</Typography>
  <Typography variant="body2">450 calories</Typography>
</Card>
```

#### Badge

**Purpose**: Small status indicator

**Props**:

```typescript
interface BadgeProps {
  label: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  size?: "small" | "medium";
  icon?: string;
  onPress?: () => void;
}
```

**Usage**:

```tsx
<Badge label="Verified" variant="success" icon="check-circle" />
```

#### Avatar

**Purpose**: User profile image display

**Props**:

```typescript
interface AvatarProps {
  source?: ImageSourcePropType;
  name?: string;
  size?: "small" | "medium" | "large" | number;
  onPress?: () => void;
  showBadge?: boolean;
  badgeColor?: string;
}
```

**Usage**:

```tsx
<Avatar
  source={{ uri: user.profileImage }}
  name={user.name}
  size="large"
  onPress={handleProfilePress}
/>
```

### Feedback Components

#### Loading

**Purpose**: Loading state indicators

**Props**:

```typescript
interface LoadingProps {
  variant?: "spinner" | "skeleton" | "overlay";
  size?: "small" | "medium" | "large";
  color?: string;
  text?: string;
}
```

**Usage**:

```tsx
<Loading variant="overlay" text="Analyzing your meal..." />
```

#### Toast

**Purpose**: Temporary notification messages

**Props**:

```typescript
interface ToastProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  position?: "top" | "bottom";
}
```

**Usage**:

```tsx
Toast.show({
  message: "Meal saved successfully!",
  type: "success",
  duration: 3000,
});
```

#### Modal

**Purpose**: Overlay dialog for focused content

**Props**:

```typescript
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large" | "fullscreen";
  closeButton?: boolean;
  backdropPress?: boolean;
}
```

**Usage**:

```tsx
<Modal
  visible={showDetails}
  onClose={() => setShowDetails(false)}
  title="Nutritional Information"
  size="medium"
>
  <NutritionDetails meal={selectedMeal} />
</Modal>
```

### Domain-Specific Components

#### NutritionCard

**Purpose**: Display nutritional information

**Props**:

```typescript
interface NutritionCardProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  variant?: "compact" | "detailed";
  showPercentages?: boolean;
  dailyGoals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onPress?: () => void;
}
```

**Usage**:

```tsx
<NutritionCard
  calories={450}
  protein={35}
  carbs={40}
  fat={15}
  variant="detailed"
  showPercentages
  dailyGoals={userGoals}
/>
```

#### MealCard

**Purpose**: Display meal summary

**Props**:

```typescript
interface MealCardProps {
  meal: Meal;
  variant?: "list" | "grid" | "detailed";
  showImage?: boolean;
  showActions?: boolean;
  onPress?: () => void;
  onFavorite?: () => void;
  onDelete?: () => void;
}
```

**Usage**:

```tsx
<MealCard
  meal={meal}
  variant="list"
  showImage
  showActions
  onPress={() => navigateToMealDetail(meal.id)}
  onFavorite={() => toggleFavorite(meal.id)}
/>
```

#### FoodItemBubble

**Purpose**: Interactive food item display

**Props**:

```typescript
interface FoodItemBubbleProps {
  item: FoodItem;
  size?: "small" | "medium" | "large";
  editable?: boolean;
  onPress?: () => void;
  onEdit?: (item: FoodItem) => void;
  onDelete?: () => void;
  animated?: boolean;
}
```

**Usage**:

```tsx
<FoodItemBubble
  item={foodItem}
  size="medium"
  editable
  onEdit={handleEditFoodItem}
  onDelete={handleDeleteFoodItem}
  animated
/>
```

#### CalorieRing

**Purpose**: Circular progress display for calories

**Props**:

```typescript
interface CalorieRingProps {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  showValues?: boolean;
  animated?: boolean;
}
```

**Usage**:

```tsx
<CalorieRing
  current={1850}
  goal={2200}
  size={200}
  showPercentage
  showValues
  animated
/>
```

## Component Development Guidelines

### 1. TypeScript Requirements

- All props must be fully typed
- Use interfaces over types for props
- Export prop interfaces for reuse
- No implicit any types

### 2. Accessibility

- All interactive components must have accessible labels
- Support screen readers
- Keyboard navigation where applicable
- Proper contrast ratios

### 3. Testing

- Unit tests for all components
- Snapshot tests for UI consistency
- Interaction tests for user actions
- Accessibility tests

### 4. Documentation

- JSDoc comments for complex props
- Usage examples in Storybook
- Visual states documented
- Performance considerations noted

### 5. Performance

- Use React.memo for expensive renders
- Implement shouldComponentUpdate logic
- Lazy load heavy components
- Optimize re-renders

## Theming

All components support theming through the theme context:

```tsx
const theme = useTheme();

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.medium,
  },
});
```

## Icons

Components use the icon system with consistent naming:

- `camera` - Camera icon
- `check` - Checkmark
- `close` - Close/X icon
- `arrow-left` - Back arrow
- `arrow-right` - Forward arrow
- `heart` - Favorite
- `heart-filled` - Favorited
- `plus` - Add
- `minus` - Remove
- `edit` - Edit/Pencil
- `delete` - Trash can
- `info` - Information
- `warning` - Warning triangle
- `error` - Error circle

## Best Practices

1. **Composition over Configuration**: Build complex components by composing simpler ones
2. **Consistent Naming**: Use clear, descriptive names that indicate purpose
3. **Default Props**: Provide sensible defaults for optional props
4. **Error Boundaries**: Wrap components in error boundaries for graceful failures
5. **Memoization**: Use React.memo for components that receive stable props
6. **Testability**: Design components with testing in mind
