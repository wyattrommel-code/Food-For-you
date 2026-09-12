import { RecipeImage } from '@/components/RecipeImage';
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';

// ─── Layout constants ─────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');

const SIDE_PADDING  = 20;
const CARD_GAP      = 14;
const CARD_WIDTH    = SCREEN_W - SIDE_PADDING * 2 - CARD_GAP;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const IMAGE_HEIGHT  = 220;

// ─── Props ────────────────────────────────────────────────────
export interface RecipeCarouselProps {
  steps:       string[];
  recipeImage: string;
}

// ─── Internal data shape ──────────────────────────────────────
interface StepItem {
  key:   string;
  index: number;
  text:  string;
  image: string;
  total: number;
}

// ─── StepCard props ───────────────────────────────────────────
interface StepCardProps {
  item:   StepItem;
  Colors: AppColors;
}

// ─── Extract a concise title from the first clause of a step ──
function extractStepTitle(text: string, stepNumber: number): string {
  const match = text.match(/^([^,;.!?]+)/);
  if (match) {
    const raw   = match[1].trim();
    const words = raw.split(' ');
    if (words.length <= 5) return raw;
    return words.slice(0, 5).join(' ') + '…';
  }
  return `Step ${stepNumber}`;
}

// ─── Single step card ─────────────────────────────────────────
function StepCard({ item, Colors }: StepCardProps) {
  const stepNumber = item.index + 1;
  const title      = extractStepTitle(item.text, stepNumber);

  return (
    <View style={[styles.cardShadow, { backgroundColor: Colors.surface }]}>
      <View style={[styles.card, { backgroundColor: Colors.surface }]}>

        {/* ── Top: Recipe image ─────────────────────────── */}
        <View style={styles.imageWrap}>
          <RecipeImage url={item.image} style={styles.image} />
          <View style={styles.stepCountBadge}>
            <Text style={styles.stepCountText}>
              {stepNumber} / {item.total}
            </Text>
          </View>
        </View>

        {/* ── Middle: Header banner ─────────────────────── */}
        <View style={[
          styles.header,
          {
            backgroundColor:  Colors.surfaceElevated,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          },
        ]}>
          <View>
            <Text style={[styles.stepLabel, { color: Colors.textMuted }]}>
              STEP {stepNumber}
            </Text>
            <Text style={[styles.stepTitle, { color: Colors.textPrimary }]} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </View>
          {/* Decorative right-side number */}
          <Text style={[styles.headerStepBig, { color: Colors.accent, opacity: 0.2 }]}>
            {stepNumber}
          </Text>
        </View>

        {/* ── Bottom: Instruction text ──────────────────── */}
        <View style={[styles.body, { backgroundColor: Colors.surface }]}>
          <Text style={[styles.instructionText, { color: Colors.textSecondary }]}>
            {item.text}
          </Text>
        </View>

      </View>
    </View>
  );
}

// ─── Dot / progress indicator ────────────────────────────────
function ProgressDots({
  total,
  activeIndex,
  Colors,
}: {
  total:       number;
  activeIndex: number;
  Colors:      AppColors;
}) {
  if (total > 8) {
    return (
      <View style={styles.progressTextWrap}>
        <Text style={styles.progressText}>
          Step{' '}
          <Text style={[styles.progressTextBold, { color: Colors.accent }]}>
            {activeIndex + 1}
          </Text>
          {' '}of{' '}
          <Text style={[styles.progressTextBold, { color: Colors.accent }]}>
            {total}
          </Text>
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
            { backgroundColor: Colors.border },
            i === activeIndex && [styles.dotActive, { backgroundColor: Colors.accent }],
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main carousel component ─────────────────────────────────
export function RecipeCarousel({ steps, recipeImage }: RecipeCarouselProps) {
  const { Colors }                    = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  const data: StepItem[] = steps.map((text, index) => ({
    key:   String(index),
    index,
    text,
    image: recipeImage,
    total: steps.length,
  }));

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx     = Math.round(offsetX / SNAP_INTERVAL);
      setActiveIndex(Math.max(0, Math.min(idx, steps.length - 1)));
    },
    [steps.length]
  );

  if (steps.length === 0) return null;

  return (
    <View style={styles.container}>

      {/* Section label above the carousel */}
      <View style={styles.sectionHeader}>
        <View style={[styles.accentDot, { backgroundColor: Colors.accent }]} />
        <Text style={[styles.sectionLabel, { color: Colors.accent }]}>HOW TO MAKE IT</Text>
      </View>

      <FlatList
        data={data}
        horizontal
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <StepCard item={item} Colors={Colors} />}
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

      <ProgressDots total={steps.length} activeIndex={activeIndex} Colors={Colors} />

    </View>
  );
}

// ─── Styles (layout only — colors applied inline) ─────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    marginHorizontal: -22,
  },

  // ── Section header above list ─────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems:   'center',
    gap:           8,
    paddingHorizontal: SIDE_PADDING + 4,
    marginBottom:  14,
  },
  accentDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '800',
    letterSpacing: 1.4,
  },

  // ── FlatList ──────────────────────────────────────────────
  listContent: {
    paddingLeft:  SIDE_PADDING,
    paddingRight: SIDE_PADDING,
  },

  // ── Card shadow wrapper ───────────────────────────────────
  cardShadow: {
    width:        CARD_WIDTH,
    borderRadius: 20,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation:    8,
  },

  // ── Card itself ───────────────────────────────────────────
  card: {
    width:        CARD_WIDTH,
    borderRadius: 20,
    overflow:     'hidden',
  },

  // ── Image section ─────────────────────────────────────────
  imageWrap: {
    width:  '100%',
    height: IMAGE_HEIGHT,
  },
  image: {
    width:  '100%',
    height: IMAGE_HEIGHT,
  },
  stepCountBadge: {
    position:         'absolute',
    top:              12,
    right:            12,
    backgroundColor:  'rgba(0,0,0,0.52)',
    paddingHorizontal: 10,
    paddingVertical:  4,
    borderRadius:     20,
  },
  stepCountText: {
    color:         '#fff',
    fontSize:      12,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },

  // ── Header banner ─────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingVertical:   14,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
  },
  stepLabel: {
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  2,
  },
  stepTitle: {
    fontSize:      15,
    fontWeight:    '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    maxWidth:      CARD_WIDTH - 80,
  },
  headerStepBig: {
    fontSize:   52,
    fontWeight: '900',
    lineHeight: 52,
  },

  // ── Body ──────────────────────────────────────────────────
  body: {
    paddingHorizontal: 20,
    paddingVertical:   18,
    minHeight:         100,
  },
  instructionText: {
    fontSize:   14,
    lineHeight: 24,
    fontWeight: '500',
  },

  // ── Progress indicators ───────────────────────────────────
  dotsRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            6,
    marginTop:      16,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  dotActive: {
    width:        20,
    borderRadius: 3,
  },
  progressTextWrap: {
    alignItems: 'center',
    marginTop:  14,
  },
  progressText: {
    color:      '#888',
    fontSize:   13,
    fontWeight: '500',
  },
  progressTextBold: {
    fontWeight: '800',
  },
});
