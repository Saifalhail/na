# Icon Styling Guide

## Overview

This guide documents the unified icon styling approach used throughout the Nutrition AI app. The standardized approach uses gradient-styled icons for a modern, cohesive visual experience.

## Core Component: GradientIcon

The app uses the `GradientIcon` component as the primary icon implementation, providing:

- **Gradient styling** that adapts to light/dark themes
- **Consistent sizing and positioning**
- **Graceful fallbacks** when advanced features aren't available
- **Preset color schemes** for different use cases

### Basic Usage

```tsx
import { GradientIcon } from '@/components/icons/GradientIcon';

// Basic usage with default colors
<GradientIcon name="camera" size={24} />

// Custom colors
<GradientIcon 
  name="notifications-outline" 
  size={20} 
  colors={['#FF6B6B', '#FF8E53']} 
/>

// Using preset color schemes
<GradientIcon 
  name="checkmark" 
  size={16} 
  colors={PremiumIconPresets.success(theme)} 
/>
```

## Preset Color Schemes

The following preset color schemes are available through `PremiumIconPresets`:

### Primary Theme
```tsx
colors={PremiumIconPresets.primary(theme)}
```
- **Light mode**: `[primary[500], primary[700]]`
- **Dark mode**: `[primary[400], primary[600]]`
- **Usage**: Main navigation, primary actions

### Success Theme
```tsx
colors={PremiumIconPresets.success(theme)}
```
- **Colors**: Success green gradients
- **Usage**: Confirmations, completed states, positive feedback

### Warning Theme
```tsx
colors={PremiumIconPresets.warning(theme)}
```
- **Colors**: Warning orange/yellow gradients
- **Usage**: Alerts, caution states, flash indicators

### Error Theme
```tsx
colors={PremiumIconPresets.error(theme)}
```
- **Colors**: Error red gradients
- **Usage**: Error states, destructive actions, failures

### Premium Theme
```tsx
colors={PremiumIconPresets.premium(theme)}
```
- **Colors**: Gold to orange gradients
- **Usage**: Premium features, special actions, upgrades

### Cool Theme
```tsx
colors={PremiumIconPresets.cool(theme)}
```
- **Colors**: Blue to cyan gradients
- **Usage**: Information, secondary features, cool actions

### Warm Theme
```tsx
colors={PremiumIconPresets.warm(theme)}
```
- **Colors**: Red to orange gradients
- **Usage**: Warm actions, food-related features, energy

## Implementation Examples

### Navigation Icons
```tsx
// Tab bar icons with primary theme
<GradientIcon 
  name="home" 
  size={24} 
  colors={PremiumIconPresets.primary(theme)} 
/>
```

### Action Buttons
```tsx
// Camera capture button
<GradientIcon 
  name="camera" 
  size={36} 
  colors={['white', 'rgba(255,255,255,0.9)']} 
/>

// Save action with success theme
<GradientIcon 
  name="checkmark" 
  size={20} 
  colors={PremiumIconPresets.success(theme)} 
/>
```

### Status Indicators
```tsx
// Flash indicator with conditional colors
<GradientIcon 
  name={flashMode === 'on' ? 'flash' : 'flash-off'} 
  size={20} 
  colors={flashMode === 'on' 
    ? PremiumIconPresets.warning(theme) 
    : ['white', 'rgba(255,255,255,0.9)']
  } 
/>
```

### Header Icons
```tsx
// Notification icon in glass header
<GradientIcon 
  name="notifications-outline" 
  size={20} 
  colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']} 
/>
```

## Design Principles

### 1. Consistency
- Use `GradientIcon` instead of plain `Ionicons` throughout the app
- Maintain consistent sizing within similar UI contexts
- Apply appropriate color schemes based on context

### 2. Theme Adaptation
- Always use theme-aware color presets when possible
- Ensure icons work in both light and dark modes
- Test icon visibility against various backgrounds

### 3. Semantic Colors
- Use **success** colors for positive actions (save, complete, confirm)
- Use **warning** colors for caution states (flash on, alerts)
- Use **error** colors for negative actions (delete, cancel, error)
- Use **primary** colors for main navigation and core features

### 4. Performance
- The component includes graceful fallbacks for older devices
- Uses optimized rendering with proper memoization
- Supports both MaskedView gradients and fallback implementations

## Migration Guide

### From Plain Ionicons

**Before:**
```tsx
<Ionicons name="camera" size={24} color={theme.colors.primary[500]} />
```

**After:**
```tsx
<GradientIcon 
  name="camera" 
  size={24} 
  colors={PremiumIconPresets.primary(theme)} 
/>
```

### From Static Colors

**Before:**
```tsx
<Ionicons name="checkmark" size={20} color="green" />
```

**After:**
```tsx
<GradientIcon 
  name="checkmark" 
  size={20} 
  colors={PremiumIconPresets.success(theme)} 
/>
```

## Technical Implementation

### Component Structure
```
GradientIcon
├── MaskedView (primary implementation)
│   ├── Ionicons (mask)
│   └── LinearGradient (gradient colors)
└── Fallback (when MaskedView unavailable)
    ├── LinearGradient (background)
    └── Ionicons (overlay)
```

### Supported Platforms
- **iOS**: Full MaskedView gradient support
- **Android**: Full MaskedView gradient support  
- **Web**: Fallback implementation with background gradients
- **Older devices**: Graceful degradation to solid colors

## Testing Guidelines

### Visual Testing
1. Test all icons in both light and dark themes
2. Verify gradient rendering on different devices
3. Check fallback appearance when MaskedView fails
4. Ensure proper contrast against various backgrounds

### Code Testing
1. Test component with various size props
2. Verify custom color array handling
3. Test preset color scheme functionality
4. Ensure graceful handling of missing/invalid props

## Best Practices

### DO ✅
- Use semantic color presets (success, warning, error)
- Test icons in both themes
- Use consistent sizing within contexts
- Leverage the fallback system

### DON'T ❌
- Mix `Ionicons` and `GradientIcon` in the same context
- Use hard-coded colors instead of theme-based presets
- Ignore accessibility considerations
- Override the component's fallback logic

## Future Enhancements

- **Animation support**: Add optional icon animations
- **Custom gradients**: Expand preset library
- **Accessibility**: Enhanced screen reader support
- **Performance**: Further optimization for large icon lists

---

This styling approach ensures a modern, cohesive icon system that adapts to themes and provides excellent user experience across all platforms.