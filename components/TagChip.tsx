import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'dislike' | 'like' | 'neutral';
  small?: boolean;
}

export function TagChip({ label, onRemove, variant = 'neutral', small }: TagChipProps) {
  const bg =
    variant === 'dislike'
      ? 'rgba(255,58,45,0.15)'
      : variant === 'like'
      ? 'rgba(34,197,94,0.15)'
      : Colors.surfaceElevated;

  const textColor =
    variant === 'dislike'
      ? '#FF6B6B'
      : variant === 'like'
      ? '#4ADE80'
      : Colors.textSecondary;

  return (
    <View style={[styles.chip, { backgroundColor: bg }, small && styles.chipSmall]}>
      <Text
        style={[styles.label, { color: textColor }, small && styles.labelSmall]}
      >
        {label}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={6}>
          <Ionicons name="close-circle" size={16} color={textColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  labelSmall: {
    fontSize: 11,
  },
});
