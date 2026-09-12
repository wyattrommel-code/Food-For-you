import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { Colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={[styles.message, { color: Colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
  },
});
