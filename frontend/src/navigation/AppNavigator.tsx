import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingOverlay } from '@/components/base/Loading';
import { rs } from '@/utils/responsive';

const Stack = createStackNavigator();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { theme } = useTheme();

  if (isLoading) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary[500],
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text.primary,
          border: theme.colors.border,
          notification: theme.colors.error[500],
        },
        fonts: {
          regular: {
            fontFamily: theme.typography.fontFamily.regular,
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: theme.typography.fontFamily.medium,
            fontWeight: '500',
          },
          bold: {
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: '900',
          },
        },
      }}
      onStateChange={(state) => {
        console.log('🧭 [Navigation] State changed:', state?.routeNames?.[state?.index || 0]);
      }}
      fallback={<LoadingOverlay visible={true} />}
    >
      <Stack.Navigator 
        key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? 'Main' : 'Auth'}
      >
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ 
              gestureEnabled: false,
              animationTypeForReplace: 'push'
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{ 
              gestureEnabled: false,
              animationTypeForReplace: 'push'
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
