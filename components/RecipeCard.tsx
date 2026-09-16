import { visibleRecipeTags } from '@/lib/recipe-tags';
import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Recipe, difficultyLabel } from '@/lib/types';
import {QuickPlanButton} from '@/components/QuickPlanButton';
import { RecipeImage } from '@/components/RecipeImage';
import { TABLET_BREAKPOINT } from '@/hooks/useIsTablet';

/** Default horizontal carousel card width — phone / tablet per layout spec. */
export const CAROUSEL_CARD_WIDTH_PHONE  = 160;
export const CAROUSEL_CARD_WIDTH_TABLET = 220;

/** @deprecated Use {@link CAROUSEL_CARD_WIDTH_PHONE} + explicit sizing from `useWindowDimensions`. */
export const CARD_WIDTH  = CAROUSEL_CARD_WIDTH_PHONE;
export const CARD_HEIGHT = CAROUSEL_CARD_WIDTH_PHONE * 1.18;

interface RecipeCardProps {
  quickPlan?: boolean;
  recipe: Recipe;
  onFavoriteToggle?: (id: string) => void;
  style?: object;
  /** Fixed carousel width (e.g. 160 phone / 220 tablet). Defaults from window width. */
  carouselWidth?: number;
  /** Optional badge (e.g. pantry "Missing N ingredients"). */
  badgeText?: string;
  /** If set, called instead of default `/recipe/[id]` navigation. */
  onNavigate?: (recipe: Recipe) => void;
}

export function RecipeCard({
  recipe,
  onFavoriteToggle,
  style,
  carouselWidth,
  badgeText,
  onNavigate,
  quickPlan=false,
}: RecipeCardProps) {
  const router     = useRouter();
  const { Colors } = useTheme();
  const { width: winW } = useWindowDimensions();
  const w =
    carouselWidth ??
    (winW >= TABLET_BREAKPOINT ? CAROUSEL_CARD_WIDTH_TABLET : CAROUSEL_CARD_WIDTH_PHONE);
  const h = w * 1.18;
  const placeholderIcon = Math.max(28, Math.min(52, Math.round(w * 0.26)));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onNavigate) onNavigate(recipe);
    else router.push(`/recipe/${recipe.id}`);
  }, [recipe, router, onNavigate]);

  const handleFav = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onFavoriteToggle?.(recipe.id);
    },
    [recipe.id, onFavoriteToggle]
  );

  return (
    <Pressable
      style={[
        styles.card,
        { width: w, height: h, backgroundColor: Colors.surface },
        style,
      ]}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
    >
      <RecipeImage url={recipe.image_url} style={styles.image} iconSize={placeholderIcon} accessibilityLabel={recipe.title} />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {quickPlan&&<QuickPlanButton recipe={recipe} overlay/>}
      {/* Favorite button */}
      <Pressable style={styles.favBtn} onPress={handleFav} hitSlop={12}>
        <Ionicons
          name={recipe.is_favorited ? 'heart' : 'heart-outline'}
          size={22}
          color={recipe.is_favorited ? Colors.accent : '#fff'}
        />
      </Pressable>

      {/* Text content */}
      <View style={styles.textContainer}>
        <View style={styles.tagsRow}>
          {visibleRecipeTags(recipe.tags).slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {badgeText ? (
          <View
            style={[
              styles.matchBadge,
              { borderColor: Colors.accent, backgroundColor: '#FFFFFF' },
            ]}
          >
            <Text style={styles.matchBadgeText} numberOfLines={1}>
              {badgeText}
            </Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{recipe.prep_time_mins} min</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>
              {difficultyLabel(recipe.effort_score)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            {`${recipe.servings ?? 2} Servings`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

interface HeroCardProps {
  recipe: Recipe;
  onFavoriteToggle?: (id: string) => void;
}

export function HeroCard({ recipe, onFavoriteToggle }: HeroCardProps) {
  const router     = useRouter();
  const { Colors } = useTheme();
  const { width: winW } = useWindowDimensions();
  const heroWidth  = Math.min(winW - 32, winW >= TABLET_BREAKPOINT ? 560 : winW - 32);
  const heroHeight = heroWidth * 0.9;
  const placeholderIcon = Math.max(
    48,
    Math.min(80, Math.round(Math.min(heroWidth, heroHeight) * 0.14))
  );

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipe/${recipe.id}`);
  }, [recipe.id, router]);

  const handleFav = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onFavoriteToggle?.(recipe.id);
    },
    [recipe.id, onFavoriteToggle]
  );

  return (
    <Pressable
      style={[
        styles.hero,
        {
          width: heroWidth,
          height: heroHeight,
          backgroundColor: Colors.surface,
        },
      ]}
      onPress={handlePress}
    >
      <RecipeImage url={recipe.image_url} style={styles.heroImage} iconSize={placeholderIcon} accessibilityLabel={recipe.title} />

      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Fav button */}
      <Pressable style={styles.heroFavBtn} onPress={handleFav} hitSlop={12}>
        <Ionicons
          name={recipe.is_favorited ? 'heart' : 'heart-outline'}
          size={26}
          color={recipe.is_favorited ? Colors.accent : '#fff'}
        />
      </Pressable>

      {/* Text */}
      <View style={styles.heroText}>
        <View style={styles.tagsRow}>
          {visibleRecipeTags(recipe.tags).slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.tag, styles.tagHero]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.heroTitle}>{recipe.title}</Text>
        <Text style={styles.heroDesc} numberOfLines={2}>
          {recipe.description}
        </Text>
        <View style={styles.heroMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroMetaText}>{recipe.prep_time_mins} min</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.diffBadge}>
            <Text style={styles.diffBadgeText}>
              {difficultyLabel(recipe.effort_score)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <Text style={styles.heroMetaText}>{`${recipe.servings ?? 2} Servings`}</Text>
          {recipe.cuisine ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.heroMetaText}>{recipe.cuisine}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── RNG choice card — used in the 3-choice meal section ─────
interface ChoiceCardProps {
  recipe: Recipe;
  index: number;
  onFavoriteToggle?: (id: string) => void;
}

export function ChoiceCard({ recipe, index, onFavoriteToggle }: ChoiceCardProps) {
  const router     = useRouter();
  const { Colors } = useTheme();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/recipe/${recipe.id}`);
  }, [recipe.id, router]);

  return (
    <Pressable style={[styles.choice, { backgroundColor: Colors.surface }]} onPress={handlePress}>
      <RecipeImage url={recipe.image_url} style={styles.choiceImage} iconSize={44} accessibilityLabel={recipe.title} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Number badge */}
      <View style={[styles.numberBadge, { backgroundColor: Colors.accent }]}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>

      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
          <Text style={styles.choiceMeta}>{recipe.prep_time_mins} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  // RecipeCard (width/height set per layout via inline styles)
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  favBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    maxWidth: '100%',
  },
  matchBadgeText: {
    color: '#111111',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  textContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagHero: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  diffBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // HeroCard (width/height from useWindowDimensions)
  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroFavBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    position: 'absolute',
    bottom: 24,
    left: 22,
    right: 22,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 6,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '500',
  },

  // ChoiceCard
  choice: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  choiceImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  numberBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  choiceText: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  choiceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  choiceMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});
