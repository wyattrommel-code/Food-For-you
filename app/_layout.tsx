import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useSession } from '@/hooks/useSession';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { Colors, isDark } = useTheme();
  const { session, loading } = useSession();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const inTabsGroup  = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';

    if (!session && inTabsGroup) {
      router.replace('/login');
    } else if (session && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: Colors.background },
          animation:    'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            headerShown:  false,
            presentation: 'card',
            animation:    'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="taste-engine"
          options={{
            headerShown: false,
            animation:   'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
