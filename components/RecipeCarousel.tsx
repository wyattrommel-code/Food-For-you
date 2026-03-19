import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';

// ─── Layout constants ─────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');

const SIDE_PADDING  = 20;          // space on each side of the carousel
const CARD_GAP      = 14;          // gap between cards
const CARD_WIDTH    = SCREEN_W - SIDE_PADDING * 2 - CARD_GAP;  // ~90% wide, right edge peeks
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const IMAGE_HEIGHT  = 220;

const HF_GREEN      = '#7cb342';   // HelloFresh signature green
const HF_GREEN_DARK = '#558b2f';   // used for the step-count badge

// ─── Props ────────────────────────────────────────────────────
export interface RecipeCarouselProps {
  /** recipe.recipe_steps — the raw array of instruction strings */
  steps: string[];
  /**
   * Placeholder image shown at the top of every card.
   * Pass recipe.image_url here; per-step images can be added later
   * by extending this to string[].
   */
  recipeImage: string;
}

// ─── Internal data shape ──────────────────────────────────────
interface StepItem {
  key: string;
  index: number;       // 0-based
  text: string;
  image: string;
  total: number;
}

// ─── Extract a concise title from the first clause of a step ──
// e.g. "Heat olive oil in a skillet over medium-high heat." → "Heat olive oil"
// Falls back gracefully to a short excerpt if no punctuation is found.
function extractStepTitle(text: string, stepNumber: number): string {
  // Try to grab everything before the first comma, period, or semicolon
  const match = text.match(/^([^,;.!?]+)/);
  if (match) {
    const raw = match[1].trim();
    // Keep it to 5 words max so it fits in the green header
    const words = raw.split(' ');
    if (words.length <= 5) return raw;
    return words.slice(0, 5).join(' ') + '…';
  }
  return `Step ${stepNumber}`;
}

// ─── Single step card ─────────────────────────────────────────
function StepCard({ item }: { item: StepItem }) {
  const stepNumber = item.index + 1;
  const title = extractStepTitle(item.text, stepNumber);

  return (
    <View style={styles.cardShadow}>
      <View style={styles.card}>

        {/* ── Top: Recipe image ─────────────────────────── */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Step-count pill overlaid on the image */}
          <View style={styles.stepCountBadge}>
            <Text style={styles.stepCountText}>
              {stepNumber} / {item.total}
            </Text>
          </View>
        </View>

        {/* ── Middle: Green header ──────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.stepLabel}>STEP {stepNumber}</Text>
            <Text style={styles.stepTitle} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </View>
          {/* Decorative right-side number */}
          <Text style={styles.headerStepBig}>{stepNumber}</Text>
        </View>

        {/* ── Bottom: Instruction text ──────────────────── */}
        <View style={styles.body}>
          <Text style={styles.instructionText}>{item.text}</Text>
        </View>

      </View>
    </View>
  );
}

// ─── Dot / progress indicator ────────────────────────────────
function ProgressDots({
  total,
  activeIndex,
}: {
  total: number;
  activeIndex: number;
}) {
  // For > 8 steps use a compact text counter instead of dots
  if (total > 8) {
    return (
      <View style={styles.progressTextWrap}>
        <Text style={styles.progressText}>
          Step{' '}
          <Text style={styles.progressTextBold}>{activeIndex + 1}</Text>
          {' '}of{' '}
          <Text style={styles.progressTextBold}>{total}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main carousel component ─────────────────────────────────
export function RecipeCarousel({ steps, recipeImage }: RecipeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const data: StepItem[] = steps.map((text, index) => ({
    key: String(index),
    index,
    text,
    image: recipeImage,
    total: steps.length,
  }));

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / SNAP_INTERVAL);
      setActiveIndex(Math.max(0, Math.min(idx, steps.length - 1)));
    },
    [steps.length]
  );

  if (steps.length === 0) return null;

  return (
    <View style={styles.container}>

      {/* Section label above the carousel */}
      <View style={styles.sectionHeader}>
        <View style={styles.greenDot} />
        <Text style={styles.sectionLabel}>HOW TO MAKE IT</Text>
      </View>

      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <StepCard item={item} />}
        // Snapping
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        // Layout
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        // Scroll tracking
        onScroll={handleScroll}
        scrollEventThrottle={16}
        // Performance
        getItemLayout={(_, index) => ({
          length: SNAP_INTERVAL,
          offset: SNAP_INTERVAL * index,
          index,
        })}
        removeClippedSubviews={false}
      />

      <ProgressDots total={steps.length} activeIndex={activeIndex} />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    // Negative horizontal margin so the carousel bleeds to screen edges
    marginHorizontal: -22,
  },

  // ── Section header above list ─────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SIDE_PADDING + 4,
    marginBottom: 14,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: HF_GREEN,
  },
  sectionLabel: {
    color: HF_GREEN,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },

  // ── FlatList ──────────────────────────────────────────────
  listContent: {
    paddingLeft: SIDE_PADDING,
    // Right padding = SIDE_PADDING so the last card can scroll into view
    paddingRight: SIDE_PADDING,
  },

  // ── Card shadow wrapper ───────────────────────────────────
  cardShadow: {
    width: CARD_WIDTH,
    borderRadius: 20,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    // Android shadow
    elevation: 8,
    backgroundColor: '#fff', // required for iOS shadow to render
  },

  // ── Card itself ───────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  // ── Image section ─────────────────────────────────────────
  imageWrap: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  stepCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Green header ──────────────────────────────────────────
  header: {
    backgroundColor: HF_GREEN,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    maxWidth: CARD_WIDTH - 80,
  },
  headerStepBig: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 52,
  },

  // ── Body ──────────────────────────────────────────────────
  body: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 100,
  },
  instructionText: {
    color: '#1a1a1a',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '500',
  },

  // ── Progress indicators ───────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(124,179,66,0.3)',
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: HF_GREEN,
  },
  progressTextWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  progressText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  progressTextBold: {
    color: HF_GREEN,
    fontWeight: '800',
  },
});
