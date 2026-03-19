import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // Hide splash only after we know the auth state, so unauthenticated users
  // never see a flash of the protected tabs screen.
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Redirect based on auth state whenever session or current route changes.
  useEffect(() => {
    if (loading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';

    if (!session && inTabsGroup) {
      // User is not authenticated but is trying to view a protected screen.
      router.replace('/login');
    } else if (session && onLoginScreen) {
      // User just logged in — push them into the app.
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // Keep the splash visible while auth state resolves.
  if (loading) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
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
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}
