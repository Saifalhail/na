import React, { useRef, useEffect } from 'react';
import { rs } from '@/utils/responsive';
import { 
  View, 
  StyleSheet, 
  Animated, 
  ViewStyle,
  Dimensions
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface WaveBackgroundProps {
  height?: number;
  amplitude?: number;
  frequency?: number;
  speed?: 'slow' | 'medium' | 'fast';
  colors?: string[];
  style?: ViewStyle;
  position?: 'top' | 'bottom';
  numberOfWaves?: number;
}

export const WaveBackground: React.FC<WaveBackgroundProps> = ({
  height = 200,
  amplitude = 30,
  frequency = 2,
  speed = 'medium',
  colors,
  style,
  position = 'bottom',
  numberOfWaves = 3,
}) => {
  const { theme } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;
  
  const getDefaultColors = (): string[] => {
    return [
      theme.colors.primary[300] + '40',
      theme.colors.primary[400] + '30',
      theme.colors.primary[500] + '20',
    ];
  };
  
  const getSpeedDuration = () => {
    switch (speed) {
      case 'slow':
        return 12000;
      case 'fast':
        return 4000;
      default:
        return 8000;
    }
  };
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animValue, {
        toValue: 1,
        duration: getSpeedDuration(),
        useNativeDriver: false,
      })
    );
    
    animation.start();
    
    return () => {
      animation.stop();
    };
  }, [animValue, speed]);
  
  const waveColors = colors || getDefaultColors();
  
  const generateWavePath = (offset: number): string => {
    let path = `M0,${height}`;
    const segments = 50;
    const segmentWidth = screenWidth / segments;
    
    for (let i = 0; i <= segments; i++) {
      const x = i * segmentWidth;
      const angle = (i / segments) * Math.PI * frequency + offset;
      const y = height / 2 + Math.sin(angle) * amplitude;
      
      if (i === 0) {
        path += ` L${x},${y}`;
      } else {
        const prevX = (i - 1) * segmentWidth;
        const prevAngle = ((i - 1) / segments) * Math.PI * frequency + offset;
        const prevY = height / 2 + Math.sin(prevAngle) * amplitude;
        
        const cpx1 = prevX + segmentWidth / 3;
        const cpy1 = prevY;
        const cpx2 = x - segmentWidth / 3;
        const cpy2 = y;
        
        path += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${x},${y}`;
      }
    }
    
    path += ` L${screenWidth},${height} L0,${height} Z`;
    return path;
  };
  
  const containerStyle: ViewStyle[] = [
    styles.container,
    position === 'top' ? styles.topPosition : styles.bottomPosition,
    { height },
    style,
  ];
  
  return (
    <View style={containerStyle}>
      {Array.from({ length: numberOfWaves }).map((_, index) => {
        const animatedOffset = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.PI * 2],
        });
        
        const delayMultiplier = index * 0.3;
        const speedMultiplier = 1 + index * 0.2;
        
        return (
          <Animated.View
            key={index}
            style={[
              StyleSheet.absoluteFillObject,
              {
                opacity: 1 - (index * 0.3),
                transform: [
                  {
                    translateX: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -screenWidth * 0.5 * speedMultiplier],
                    }),
                  },
                ],
              },
            ]}
          >
            <AnimatedSvg
              width={screenWidth * 1.5}
              height={height}
              viewBox={`0 0 ${screenWidth * 1.5} ${height}`}
              preserveAspectRatio="none"
            >
              <AnimatedPath
                d={animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    generateWavePath(delayMultiplier),
                    generateWavePath(Math.PI * 2 + delayMultiplier),
                  ],
                })}
                fill={waveColors[index % waveColors.length]}
              />
            </AnimatedSvg>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  topPosition: {
    top: 0,
  },
  bottomPosition: {
    bottom: 0,
  },
});