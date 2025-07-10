import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleSheet,
  View,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { ImageOptimization } from '@/utils/performance';
import { useTheme } from '@/hooks/useTheme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  width?: number;
  height?: number;
  fallbackSource?: { uri: string } | number;
  showLoading?: boolean;
  fadeInDuration?: number;
  cacheKey?: string;
  priority?: 'low' | 'normal' | 'high';
  placeholder?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(
  ({
    source,
    width,
    height,
    fallbackSource,
    showLoading = true,
    fadeInDuration = 300,
    cacheKey,
    priority = 'normal',
    placeholder,
    style,
    onLoadStart,
    onLoadEnd,
    onError,
    ...props
  }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [imageSource, setImageSource] = useState(source);

    // Calculate cache key if not provided
    const imageCacheKey =
      cacheKey ||
      (typeof source === 'object' && 'uri' in source
        ? ImageOptimization.getCacheKey(source.uri, width, height)
        : undefined);

    useEffect(() => {
      if (!isLoading) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: fadeInDuration,
          useNativeDriver: true,
        }).start();
      }
    }, [isLoading, fadeInDuration]);

    const handleLoadStart = () => {
      setIsLoading(true);
      onLoadStart?.();
    };

    const handleLoadEnd = () => {
      setIsLoading(false);
      setHasError(false);
      onLoadEnd?.();
    };

    const handleError = (error: any) => {
      setIsLoading(false);
      setHasError(true);

      if (fallbackSource && imageSource !== fallbackSource) {
        setImageSource(fallbackSource);
      }

      onError?.(error);
    };

    const imageStyle: ImageStyle = StyleSheet.flatten([
      {
        width,
        height,
      },
      style,
    ]);

    if (hasError && !fallbackSource) {
      return (
        <View
          style={[
            styles.errorContainer,
            imageStyle,
            { backgroundColor: theme.colors.neutral[200] },
          ]}
        >
          <Text style={{ color: theme.colors.textSecondary }}>Failed to load image</Text>
        </View>
      );
    }

    return (
      <View style={imageStyle}>
        {isLoading && showLoading && (
          <View style={[styles.loadingContainer, imageStyle]}>
            {placeholder || <ActivityIndicator size="small" color={theme.colors.primary[500]} />}
          </View>
        )}

        <Animated.Image
          {...props}
          source={imageSource}
          style={[
            imageStyle,
            {
              opacity: fadeAnim,
            },
          ]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          resizeMode={props.resizeMode || 'cover'}
          // Performance optimizations
          fadeDuration={0} // Disable Android fade
          progressiveRenderingEnabled={true}
        />
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memo
    return (
      prevProps.source === nextProps.source &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.style === nextProps.style
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

// Preload images for better performance
export const preloadImages = async (sources: Array<{ uri: string } | number>): Promise<void> => {
  const promises = sources.map((source) => {
    if (typeof source === 'object' && 'uri' in source) {
      return Image.prefetch(source.uri);
    }
    return Promise.resolve();
  });

  await Promise.all(promises);
};

// Clear image cache
export const clearImageCache = (): void => {
  // This is a placeholder - actual implementation depends on
  // the caching library being used (e.g., react-native-fast-image)
  console.log('Clearing image cache...');
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Import fix for Text
import { Text } from 'react-native';
