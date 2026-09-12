import { useWindowDimensions } from 'react-native';

/** Match common tablet layout breakpoint (e.g. iPad portrait). */
export const TABLET_BREAKPOINT = 768;

/**
 * Returns true when the window width is at least {@link TABLET_BREAKPOINT}.
 * Uses `useWindowDimensions` so layout updates on rotation and split-screen.
 */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

/** True when the window is wider than it is tall (e.g. tablet or phone landscape). */
export function useIsLandscape(): boolean {
  const { width, height } = useWindowDimensions();
  return width > height;
}
