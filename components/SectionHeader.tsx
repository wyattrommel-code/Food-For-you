import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SectionHeaderProps {
  title:        string;
  subtitle?:    string;
  onSeeAll?:    () => void;
  accentColor?: string;
  rightAction?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  onSeeAll,
  accentColor,
  rightAction,
}: SectionHeaderProps) {
  const { Colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {accentColor && (
          <View style={[styles.accent, { backgroundColor: accentColor }]} />
        )}
        <View>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightAction ?? (onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.seeAll, { color: Colors.accent }]}>See all</Text>
        </Pressable>
      ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom:   16,
    marginTop:      32,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  accent: {
    width:        4,
    height:       28,
    borderRadius: 2,
  },
  title: {
    fontSize:      22,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize:   13,
    fontWeight: '500',
    marginTop:  1,
  },
  seeAll: {
    fontSize:   14,
    fontWeight: '700',
  },
});
