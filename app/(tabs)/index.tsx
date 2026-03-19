import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { getMealTimeForHour, MEAL_TIME_META, MealTime, Recipe } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { HeroCard, RecipeCard } from '@/components/RecipeCard';
import { SectionHeader } from '@/components/SectionHeader';
import { LoadingScreen } from '@/components/LoadingScreen';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Card dimensions ──────────────────────────────────────────
const HCARD_WIDTH   = SCREEN_W * 0.72;
const HCARD_HEIGHT  = HCARD_WIDTH * 1.18;
const SNAP_INTERVAL = HCARD_WIDTH + 14;

// ─── Types ────────────────────────────────────────────────────
type ActiveMode = 'hungry' | 'pickForMe' | 'feelingBold' | null;

// ─── Helpers ─────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingEmoji(hour: number): string {
  if (hour < 12) return '🌅';
  if (hour < 18) return '☀️';
  return '🌙';
}

function getDifficulty(score: number): string {
  if (score <= 2) return 'Easy';
  if (score === 3) return 'Moderate';
  return 'Hard';
}

// ─── Home Recipe Card ─────────────────────────────────────────
function HomeRecipeCard({
  recipe,
  onFavoriteToggle,
}: {
  recipe: Recipe;
  onFavoriteToggle: (id: string) => void;
}) {
  const router     = useRouter();
  const { Colors } = useTheme();
  const hcard      = useMemo(() => makeHcard(Colors), [Colors]);

  const difficulty = getDifficulty(recipe.effort_score);
  const diffColor  =
    recipe.effort_score <= 2 ? Colors.success
    : recipe.effort_score === 3 ? Colors.warning
    : Colors.accent;

  return (
    <Pressable
      style={hcard.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/recipe/${recipe.id}`);
      }}
      android_ripple={{ color: Colors.overlayLight }}
    >
      <Image
        source={{ uri: recipe.image_url }}
        style={hcard.image}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={hcard.gradient}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Fav button */}
      <Pressable
        style={hcard.favBtn}
        hitSlop={12}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onFavoriteToggle(recipe.id);
        }}
      >
        <Ionicons
          name={recipe.is_favorited ? 'heart' : 'heart-outline'}
          size={20}
          color={recipe.is_favorited ? Colors.accent : '#fff'}
        />
      </Pressable>

      {/* Text overlay */}
      <View style={hcard.info}>
        <Text style={hcard.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={hcard.meta}>
          <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.65)" />
          <Text style={hcard.metaText}>{recipe.prep_time_mins} min</Text>
          <View style={hcard.dot} />
          <Text style={[hcard.metaText, { color: diffColor }]}>{difficulty}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Section Header (accent bar + title + "See all") ──────────
function FeedSectionHeader({
  title,
  accentColor,
  rightAction,
}: {
  title:        string;
  accentColor:  string;
  rightAction?: React.ReactNode;
}) {
  const { Colors } = useTheme();
  const sh         = useMemo(() => makeSh(Colors), [Colors]);

  return (
    <View style={sh.row}>
      <View style={[sh.bar, { backgroundColor: accentColor }]} />
      <Text style={sh.title}>{title}</Text>
      <View style={{ flex: 1 }} />
      {rightAction ?? (
        <Pressable
          hitSlop={10}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Text style={sh.seeAll}>See all →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Pill re-roll / dismiss button ───────────────────────────
function PillButton({
  label,
  color,
  onPress,
}: {
  label:   string;
  color:   string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        pillStyles.pill,
        { borderColor: color, backgroundColor: color + '18' },
        pressed && pillStyles.pillPressed,
      ]}
      onPress={onPress}
      hitSlop={6}
    >
      <Text style={[pillStyles.pillText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

// ─── Horizontal carousel ─────────────────────────────────────
function HCarousel({
  recipes,
  onFavoriteToggle,
}: {
  recipes:          Recipe[];
  onFavoriteToggle: (id: string) => void;
}) {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeMainStyles(Colors), [Colors]);

  if (recipes.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No recipes match your taste profile.</Text>
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={recipes}
      keyExtractor={(r) => r.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContent}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <HomeRecipeCard recipe={item} onFavoriteToggle={onFavoriteToggle} />
      )}
    />
  );
}

// ─── Search bar ───────────────────────────────────────────────
function SearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value:        string;
  onChangeText: (t: string) => void;
  onClear:      () => void;
}) {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeMainStyles(Colors), [Colors]);

  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search recipes, ingredients..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable onPress={onClear} hitSlop={10}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────
export default function HomeScreen() {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeMainStyles(Colors), [Colors]);

  const { userId } = useSession();
  const { preferences, refresh: refreshPreferences } = usePreferences(userId);
  const {
    loading,
    visibleRecipes,
    getCarouselRecipes,
    toggleFavorite,
    refresh,
  } = useRecipes(userId, preferences);

  useFocusEffect(
    useCallback(() => {
      refreshPreferences();
      refresh();
    }, [refreshPreferences, refresh])
  );

  const hour            = new Date().getHours();
  const currentMealTime = getMealTimeForHour(hour);

  // ── Search ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return visibleRecipes.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.cuisine?.toLowerCase().includes(q)) return true;
      const ings = Array.isArray(r.ingredients_list)
        ? (r.ingredients_list as string[])
        : [];
      return ings.some((i) => i.toLowerCase().includes(q));
    });
  }, [searchQuery, visibleRecipes]);

  // ── Mode state ────────────────────────────────────────────
  const [activeMode, setActiveMode]     = useState<ActiveMode>(null);
  const [pickedRecipe, setPickedRecipe] = useState<Recipe | null>(null);
  const lastPickedId                    = useRef<string | null>(null);

  // ── Derived recipe lists ──────────────────────────────────
  const hungryRecipes = useMemo((): Recipe[] => {
    const sorted = [...visibleRecipes].sort(
      (a, b) => a.prep_time_mins - b.prep_time_mins
    );
    const fast = sorted.filter((r) => r.prep_time_mins <= 15);
    return fast.length >= 3 ? fast : sorted.slice(0, 8);
  }, [visibleRecipes]);

  const boldRecipes = useMemo(
    () => visibleRecipes.filter((r) => r.effort_score >= 3),
    [visibleRecipes]
  );

  const breakfastRecipes = useMemo(
    () => getCarouselRecipes('breakfast'),
    [getCarouselRecipes]
  );
  const lunchRecipes = useMemo(
    () => getCarouselRecipes('lunch'),
    [getCarouselRecipes]
  );
  const dinnerRecipes = useMemo(
    () => getCarouselRecipes('dinner'),
    [getCarouselRecipes]
  );
  const snackRecipes = useMemo(
    () => getCarouselRecipes('snack'),
    [getCarouselRecipes]
  );

  const mealSections = useMemo((): MealTime[] => {
    if (currentMealTime === 'breakfast') return ['breakfast', 'lunch', 'dinner'];
    if (currentMealTime === 'lunch')     return ['lunch', 'dinner', 'breakfast'];
    return ['dinner', 'lunch', 'breakfast'];
  }, [currentMealTime]);

  const carouselMap: Record<MealTime, Recipe[]> = {
    breakfast: breakfastRecipes,
    lunch:     lunchRecipes,
    dinner:    dinnerRecipes,
    snack:     [],
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleHungry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setActiveMode((m) => (m === 'hungry' ? null : 'hungry'));
    setPickedRecipe(null);
  }, []);

  const pickRandom = useCallback((): Recipe | null => {
    if (visibleRecipes.length === 0) return null;
    const pool   = visibleRecipes.filter((r) => r.id !== lastPickedId.current);
    const source = pool.length > 0 ? pool : visibleRecipes;
    const picked = source[Math.floor(Math.random() * source.length)];
    lastPickedId.current = picked.id;
    return picked;
  }, [visibleRecipes]);

  const handlePickForMe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (activeMode === 'pickForMe') {
      setActiveMode(null);
      setPickedRecipe(null);
      return;
    }
    setPickedRecipe(pickRandom());
    setActiveMode('pickForMe');
  }, [activeMode, pickRandom]);

  const rerollPick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickedRecipe(pickRandom());
  }, [pickRandom]);

  const handleFeelingBold = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveMode((m) => (m === 'feelingBold' ? null : 'feelingBold'));
    setPickedRecipe(null);
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading your personalized menu..." />;
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting(hour)} {getGreetingEmoji(hour)}
            </Text>
            <Text style={styles.greetingSub}>What are we eating today?</Text>
          </View>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>F</Text>
          </View>
        </View>

        {/* ── Search bar ──────────────────────────────────── */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* ── Action buttons ──────────────────────────────── */}
        <View style={styles.buttonsWrap}>

          {/* Dominant button — full width */}
          <Pressable
            style={({ pressed }) => [
              styles.bigBtn,
              activeMode === 'hungry' && styles.bigBtnActive,
              pressed && styles.bigBtnPressed,
            ]}
            onPress={handleHungry}
          >
            <View style={styles.bigBtnLeft}>
              <Text style={styles.bigBtnTitle}>I'm Hungry Now</Text>
              <Text style={styles.bigBtnSub}>5–15 min · instant answer</Text>
            </View>
            <Text style={styles.bigBtnEmoji}>⚡</Text>
          </Pressable>

          {/* Two secondary buttons */}
          <View style={styles.secondaryRow}>
            <Pressable
              style={({ pressed }) => [
                styles.secondBtn,
                activeMode === 'pickForMe' && styles.secondBtnActive,
                pressed && styles.secondBtnPressed,
              ]}
              onPress={handlePickForMe}
            >
              <Text style={styles.secondEmoji}>🎲</Text>
              <Text style={styles.secondTitle}>Pick For Me</Text>
              <Text style={styles.secondSub}>One perfect dish</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondBtn,
                activeMode === 'feelingBold' && styles.secondBtnActive,
                pressed && styles.secondBtnPressed,
              ]}
              onPress={handleFeelingBold}
            >
              <Text style={styles.secondEmoji}>🌶️</Text>
              <Text style={styles.secondTitle}>Feeling Bold</Text>
              <Text style={styles.secondSub}>Try something new</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Search results ────────────────────────────── */}
        {searchResults !== null && (
          <>
            <FeedSectionHeader
              title={
                searchResults.length === 0
                  ? 'No results'
                  : `"${searchQuery.trim()}" — ${searchResults.length} found`
              }
              accentColor={Colors.accent}
            />
            {searchResults.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Try a different word or check your Taste Engine settings.
                </Text>
              </View>
            ) : (
              <HCarousel
                recipes={searchResults}
                onFavoriteToggle={toggleFavorite}
              />
            )}
          </>
        )}

        {/* ── I'm Hungry Now ────────────────────────────── */}
        {searchResults === null && activeMode === 'hungry' && (
          <>
            <FeedSectionHeader
              title="Ready in 15 min or less"
              accentColor={Colors.accent}
              rightAction={
                <PillButton label="✕ Clear" color={Colors.accent} onPress={handleHungry} />
              }
            />
            <HCarousel recipes={hungryRecipes} onFavoriteToggle={toggleFavorite} />
          </>
        )}

        {/* ── Pick For Me ───────────────────────────────── */}
        {searchResults === null && activeMode === 'pickForMe' && pickedRecipe && (
          <>
            <FeedSectionHeader
              title="Here's Your Pick"
              accentColor={Colors.info}
              rightAction={
                <PillButton label="🎲 Re-roll" color={Colors.info} onPress={rerollPick} />
              }
            />
            <View style={styles.heroPad}>
              <HeroCard recipe={pickedRecipe} onFavoriteToggle={toggleFavorite} />
            </View>
          </>
        )}

        {/* ── Feeling Bold ──────────────────────────────── */}
        {searchResults === null && activeMode === 'feelingBold' && (
          <>
            <FeedSectionHeader
              title="Bold & Challenging"
              accentColor={Colors.warning}
              rightAction={
                <PillButton label="✕ Clear" color={Colors.warning} onPress={handleFeelingBold} />
              }
            />
            <HCarousel recipes={boldRecipes} onFavoriteToggle={toggleFavorite} />
          </>
        )}

        {/* ── Default feed — meal-time carousels ────────── */}
        {searchResults === null && activeMode === null && (
          <>
            {mealSections.map((mt) => {
              const recipes = carouselMap[mt];
              if (recipes.length === 0) return null;
              const meta = MEAL_TIME_META[mt];
              return (
                <React.Fragment key={mt}>
                  <FeedSectionHeader
                    title={
                      mt === currentMealTime
                        ? `${meta.emoji} ${meta.greeting}`
                        : `${meta.emoji} ${meta.label}`
                    }
                    accentColor={meta.color}
                  />
                  <HCarousel recipes={recipes} onFavoriteToggle={toggleFavorite} />
                </React.Fragment>
              );
            })}

            {snackRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Snacks"
                  accentColor={Colors.snack}
                  onSeeAll={() => {}}
                />
                <FlatList
                  horizontal
                  data={snackRecipes}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContent}
                  snapToInterval={SNAP_INTERVAL}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <RecipeCard recipe={item} onFavoriteToggle={toggleFavorite} />
                  )}
                />
              </>
            )}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Per-component style factories ───────────────────────────

function makeHcard(Colors: AppColors) {
  return StyleSheet.create({
    card: {
      width: HCARD_WIDTH,
      height: HCARD_HEIGHT,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: Colors.surface,
      marginRight: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    image: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    favBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 13,
      paddingBottom: 14,
      gap: 5,
    },
    title: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaText: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 11,
      fontWeight: '600',
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
  });
}

function makeSh(Colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 28,
      marginBottom: 14,
      gap: 10,
    },
    bar: {
      width: 4,
      height: 22,
      borderRadius: 2,
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    seeAll: {
      color: Colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

function makeMainStyles(Colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    scroll: {
      flex: 1,
    },

    // ── Header ──────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 10,
    },
    headerLeft: {
      flex: 1,
    },
    greeting: {
      color: Colors.textPrimary,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    greetingSub: {
      color: Colors.textSecondary,
      fontSize: 14,
      marginTop: 3,
      fontWeight: '500',
    },
    logoBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: Colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 14,
    },
    logoText: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '900',
    },

    // ── Search ──────────────────────────────────────────────────
    searchWrap: {
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: Colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 13,
      height: 46,
    },
    searchInput: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },

    // ── Action buttons ───────────────────────────────────────────
    buttonsWrap: {
      paddingHorizontal: 20,
      marginTop: 16,
      gap: 10,
    },
    bigBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: Colors.accent,
      borderRadius: 18,
      paddingHorizontal: 22,
      paddingVertical: 20,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    },
    bigBtnActive: {
      opacity: 0.85,
    },
    bigBtnPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.9,
    },
    bigBtnLeft: {
      gap: 4,
    },
    bigBtnTitle: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    bigBtnSub: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 13,
      fontWeight: '600',
    },
    bigBtnEmoji: {
      fontSize: 34,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: 10,
    },
    secondBtn: {
      flex: 1,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: 16,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    secondBtnActive: {
      borderColor: Colors.textSecondary,
      backgroundColor: Colors.surfaceElevated,
    },
    secondBtnPressed: {
      transform: [{ scale: 0.96 }],
      opacity: 0.85,
    },
    secondEmoji: {
      fontSize: 24,
      marginBottom: 2,
    },
    secondTitle: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    secondSub: {
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },

    // ── Carousels ────────────────────────────────────────────────
    carouselContent: {
      paddingHorizontal: 20,
      paddingBottom: 4,
    },

    // ── Hero padding ─────────────────────────────────────────────
    heroPad: {
      paddingHorizontal: 20,
      marginTop: 4,
    },

    // ── Empty states ─────────────────────────────────────────────
    emptyCard: {
      marginHorizontal: 20,
      height: 100,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    emptyText: {
      color: Colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
    },
  });
}
