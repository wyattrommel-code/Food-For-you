import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RECIPE_IMAGE_PLACEHOLDER_BG,
  RECIPE_IMAGE_PLACEHOLDER_ICON,
} from '@/lib/recipeImageUri';

type Props = {
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

export function RecipeImagePlaceholder({ style, iconSize = 48 }: Props) {
  return (
    <View style={[styles.root, style]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Ionicons name="restaurant" size={iconSize} color={RECIPE_IMAGE_PLACEHOLDER_ICON} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: RECIPE_IMAGE_PLACEHOLDER_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
