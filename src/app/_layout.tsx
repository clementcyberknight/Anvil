import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useOnboardingStatus } from '@/lib/storage';

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 600,
  fade: true,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hasCompletedOnboarding } = useOnboardingStatus();

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            navigationBarHidden: true,
          }}>
          <Stack.Protected guard={!hasCompletedOnboarding}>
            <Stack.Screen
              name="onboarding"
              options={{ animation: 'fade' }}
            />
          </Stack.Protected>

          <Stack.Protected guard={hasCompletedOnboarding}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
