// ─── Food For You Design System ──────────────────────────────
// Dark-first, inspired by DoorDash/UberEats
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // Core palette
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceElevated: '#242424',
  border: '#2e2e2e',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#5a5a5a',

  // Brand accent — bold red-orange like DoorDash
  accent: '#FF3A2D',
  accentSoft: 'rgba(255,58,45,0.15)',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Overlays
  overlayLight: 'rgba(255,255,255,0.08)',
  overlayDark: 'rgba(0,0,0,0.6)',

  // Meal-time accents
  breakfast: '#F97316',
  lunch: '#EAB308',
  dinner: '#8B5CF6',
  snack: '#10B981',

  // Tag chip background
  tagBg: '#1f1f1f',
  tagText: '#cccccc',
} as const;

export type ColorKey = keyof typeof Colors;
