import 'react-native-url-polyfill/auto';
import { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as Linking from 'expo-linking';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { classifyAuthDeepLink, parseAuthParamsFromUrl } from '@/lib/authDeepLink';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { Colors, isDark } = useTheme();
  const { session, loading } = useSession();
  const segments = useSegments();
  const router   = useRouter();
  const [deepLinkReady, setDeepLinkReady] = useState(false);

  const applyAuthFromUrl = useCallback(async (url: string) => {
    const { access_token, refresh_token, code } = parseAuthParamsFromUrl(url);
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    }
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return !error;
    }
    return true;
  }, []);

  const handleAuthDeepLink = useCallback(
    async (url: string | null) => {
      if (!url) return;
      const route = classifyAuthDeepLink(url);
      if (!route) return;

      if (route === 'reset-password') {
        const ok = await applyAuthFromUrl(url);
        if (!ok) {
          router.replace('/login');
          return;
        }
        router.replace('/reset-password' as Href);
        return;
      }

      if (route === 'callback') {
        const ok = await applyAuthFromUrl(url);
        if (!ok) {
          router.replace('/login');
          return;
        }
        const {
          data: { session: next },
        } = await supabase.auth.getSession();
        if (next) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }
    },
    [applyAuthFromUrl, router]
  );

  useEffect(() => {
    if (!loading && deepLinkReady) SplashScreen.hideAsync();
  }, [loading, deepLinkReady]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(Colors.background).catch(() => {});
  }, [Colors.background]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthDeepLink(url);
    });

    void (async () => {
      try {
        const initial = await Linking.getInitialURL();
        await handleAuthDeepLink(initial);
      } finally {
        setDeepLinkReady(true);
      }
    })();

    return () => sub.remove();
  }, [handleAuthDeepLink]);

  useEffect(() => {
    if (loading || !deepLinkReady) return;

    const inTabsGroup   = segments[0] === '(tabs)';
    const onLoginScreen = segments[0] === 'login';

    if (!session && inTabsGroup) {
      router.replace('/login');
    } else if (session && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router, deepLinkReady]);

  if (loading || !deepLinkReady) return null;

  return (
    <View style={{ flex: 1, width: '100%', alignSelf: 'stretch' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown:  false,
          contentStyle: {
            flex: 1,
            width: '100%',
            backgroundColor: Colors.background,
          },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="reset-password"
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
          name="browse"
          options={{
            headerShown: false,
            animation:   'slide_from_right',
          }}
        />
        <Stack.Screen
          name="taste-engine"
          options={{
            headerShown: false,
            animation:   'slide_from_right',
          }}
        />
        <Stack.Screen
          name="cooking-mode"
          options={{
            headerShown:  false,
            presentation: 'fullScreenModal',
            animation:    'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="pantry-match"
          options={{
            headerShown: false,
            animation:   'slide_from_right',
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
