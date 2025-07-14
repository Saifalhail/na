import React from 'react';
import { Ionicons as ExpoIonicons } from '@expo/vector-icons';
import { IconFallback } from '../IconFallback';

// Wrapper component that provides fallback if @expo/vector-icons fails to load
export const Ionicons = (props: React.ComponentProps<typeof ExpoIonicons>) => {
  try {
    // Try to use the real Ionicons
    return <ExpoIonicons {...props} />;
  } catch (error) {
    // If it fails, use the emoji fallback
    console.warn('Ionicons failed to load, using fallback:', error);
    return <IconFallback {...props} />;
  }
};

export default Ionicons;