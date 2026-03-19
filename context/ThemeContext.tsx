import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, AppColors } from '@/constants/Colors';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  Colors:       AppColors;
  themeMode:    ThemeMode;
  isDark:       boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  Colors:       DarkColors,
  themeMode:    'system',
  isDark:       true,
  setThemeMode: () => {},
});

const STORAGE_KEY = 'ffu_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme                        = useColorScheme();
  const [themeMode, setThemeModeState]      = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemScheme === 'dark');

  const Colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ Colors, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
