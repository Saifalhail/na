import React from 'react';
import { Text, TextStyle } from 'react-native';

// Temporary fallback for Ionicons while fixing installation issues
interface IconFallbackProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

const iconMap: { [key: string]: string } = {
  // Navigation icons
  'home': '🏠',
  'home-outline': '🏠',
  'time': '🕐',
  'time-outline': '🕐',
  'camera': '📷',
  'camera-outline': '📷',
  'heart': '❤️',
  'heart-outline': '🤍',
  'settings': '⚙️',
  'settings-outline': '⚙️',
  
  // Common UI icons
  'chevron-forward': '›',
  'chevron-back': '‹',
  'arrow-back': '←',
  'close': '✕',
  'checkmark': '✓',
  'add': '+',
  'search': '🔍',
  'menu': '☰',
  'notification': '🔔',
  'notifications-outline': '🔔',
  
  // Auth & Profile icons
  'person': '👤',
  'person-outline': '👤',
  'mail-outline': '✉️',
  'lock-closed-outline': '🔒',
  'eye-outline': '👁️',
  'eye-off-outline': '👁️‍🗨️',
  'log-out-outline': '🚪',
  'play-circle-outline': '▶️',
  
  // Settings icons
  'moon-outline': '🌙',
  'shield-outline': '🛡️',
  'document-text-outline': '📄',
  'help-circle-outline': '❓',
  'chatbubble-outline': '💬',
  'star-outline': '⭐',
  
  // Food & Nutrition icons
  'restaurant': '🍽️',
  'restaurant-outline': '🍴',
  'water': '💧',
  'water-outline': '💧',
  'stats-chart': '📊',
  'stats-chart-outline': '📈',
  'nutrition': '🥗',
  'apple': '🍎',
  'pizza': '🍕',
  
  // Camera controls
  'flash-off': '⚡',
  'flash': '⚡',
  'camera-reverse': '🔄',
  'images': '🖼️',
  'close-circle': '⊗',
  
  // Status icons
  'checkmark-circle': '✅',
  'alert-circle': '⚠️',
  'information-circle': 'ℹ️',
  'close-circle-outline': '⊗',
  
  // Actions
  'refresh': '🔄',
  'refresh-outline': '🔄',
  'share': '📤',
  'share-outline': '📤',
  'download': '⬇️',
  'download-outline': '⬇️',
  
  // Misc icons
  'bulb-outline': '💡',
  'bulb': '💡',
  
  // Add more as needed
};

export const IconFallback: React.FC<IconFallbackProps> = ({
  name,
  size = 24,
  color = '#000000',
  style,
}) => {
  const icon = iconMap[name] || '•';
  
  return (
    <Text
      style={[
        {
          fontSize: size * 0.8, // Slightly smaller than specified size
          color,
          textAlign: 'center',
          lineHeight: size,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      {icon}
    </Text>
  );
};

// Re-export the actual Ionicons component
export { Ionicons } from './icons/Ionicons';