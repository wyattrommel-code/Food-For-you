import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Recipe, effortSpoons } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Carousel card (used in horizontal lists) ────────────────
export const CARD_WIDTH = SCREEN_W * 0.72;
export const CARD_HEIGHT = CARD_WIDTH * 1.18;

interface RecipeCardProps {
  recipe: Recipe;
  onFavoriteToggle?: (id: string) => void;
  style?: object;
}

export function RecipeCard({ recipe, onFavoriteToggle, style }: RecipeCardProps) {
  const router     = useRouter();
  const { Colors } = useTheme();

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
      style={[styles.card, { backgroundColor: Colors.surface }, style]}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
    >
      <Image
        source={{ uri: recipe.image_url }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

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
        {/* Tags row */}
        <View style={styles.tagsRow}>
          {recipe.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{recipe.prep_time_mins} min</Text>
          </View>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            {effortSpoons(recipe.effort_score)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Hero card — full-width, used for Recipe of the Day ──────
export const HERO_HEIGHT = SCREEN_W * 0.9;

interface HeroCardProps {
  recipe: Recipe;
  onFavoriteToggle?: (id: string) => void;
}

export function HeroCard({ recipe, onFavoriteToggle }: HeroCardProps) {
  const router     = useRouter();
  const { Colors } = useTheme();

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
    <Pressable style={[styles.hero, { backgroundColor: Colors.surface }]} onPress={handlePress}>
      <Image
        source={{ uri: recipe.image_url }}
        style={styles.heroImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ROTD badge */}
      <View style={[styles.rotdBadge, { backgroundColor: Colors.accent }]}>
        <Text style={styles.rotdBadgeText}>⭐ Recipe of the Day</Text>
      </View>

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
          {recipe.tags.slice(0, 3).map((tag) => (
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
          <Text style={styles.heroMetaText}>{effortSpoons(recipe.effort_score)}</Text>
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
      <Image
        source={{ uri: recipe.image_url }}
        style={styles.choiceImage}
        resizeMode="cover"
      />
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
  // RecipeCard
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
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

  // HeroCard
  hero: {
    width: SCREEN_W - 32,
    height: HERO_HEIGHT,
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
  rotdBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rotdBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
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
