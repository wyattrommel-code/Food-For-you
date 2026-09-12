import type { ColorSchemeName } from 'react-native';

const accent     = '#FF3A2D';
const accentSoft = 'rgba(255,58,45,0.15)';

export const DarkColors = {
  background:       '#0f0f0f',
  surface:          '#1a1a1a',
  surfaceElevated:  '#242424',
  border:           '#2e2e2e',
  textPrimary:      '#ffffff',
  textSecondary:    '#a0a0a0',
  textMuted:        '#5a5a5a',
  accent,
  accentSoft,
  success:          '#22C55E',
  warning:          '#F59E0B',
  info:             '#3B82F6',
  overlayLight:     'rgba(255,255,255,0.08)',
  overlayDark:      'rgba(0,0,0,0.6)',
  breakfast:        '#F97316',
  lunch:            '#EAB308',
  dinner:           '#8B5CF6',
  snack:            '#10B981',
  dessert:          '#EC4899',
  sides:            '#06B6D4',
  tagBg:            '#1f1f1f',
  tagText:          '#cccccc',
} as const;

export const LightColors = {
  background:       '#ffffff',
  surface:          '#f5f5f5',
  surfaceElevated:  '#eeeeee',
  border:           '#e0e0e0',
  textPrimary:      '#111111',
  textSecondary:    '#555555',
  textMuted:        '#999999',
  accent,
  accentSoft,
  success:          '#16A34A',
  warning:          '#D97706',
  info:             '#2563EB',
  overlayLight:     'rgba(0,0,0,0.06)',
  overlayDark:      'rgba(0,0,0,0.4)',
  breakfast:        '#EA6C00',
  lunch:            '#CA8A04',
  dinner:           '#7C3AED',
  snack:            '#059669',
  dessert:          '#DB2777',
  sides:            '#0891B2',
  tagBg:            '#eeeeee',
  tagText:          '#333333',
} as const;

export type AppColors = { [K in keyof typeof DarkColors]: string };
export type ColorKey  = keyof AppColors;

// Kept for any static imports that don't need dynamic theming
export const Colors = DarkColors;
