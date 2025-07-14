import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { rTouchTarget } from '@/utils/responsive';

interface TouchableMinimumProps extends TouchableOpacityProps {
  children: React.ReactNode;
  size?: keyof typeof rTouchTarget;
  center?: boolean;
}

/**
 * A TouchableOpacity wrapper that ensures minimum touch target sizes
 * for better accessibility and usability
 */
export const TouchableMinimum: React.FC<TouchableMinimumProps> = ({
  children,
  size = 'minimum',
  center = true,
  style,
  ...props
}) => {
  const minSize = rTouchTarget[size];

  const touchableStyle: ViewStyle = {
    minWidth: minSize,
    minHeight: minSize,
    ...(center && {
      alignItems: 'center',
      justifyContent: 'center',
    }),
  };

  return (
    <TouchableOpacity style={[touchableStyle, style]} {...props}>
      {children}
    </TouchableOpacity>
  );
};

/**
 * HOC to ensure minimum touch target size for any touchable component
 */
export const withMinimumTouchTarget = <P extends object>(
  Component: React.ComponentType<P>,
  size: keyof typeof rTouchTarget = 'minimum'
): React.FC<P> => {
  return (props: P) => {
    const minSize = rTouchTarget[size];

    const wrapperStyle: ViewStyle = {
      minWidth: minSize,
      minHeight: minSize,
    };

    return (
      <View style={wrapperStyle}>
        <Component {...props} />
      </View>
    );
  };
};
