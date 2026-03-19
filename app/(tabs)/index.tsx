import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { getMealTimeForHour, MEAL_TIME_META, MealTime, Recipe } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import {
  HeroCard,
  RecipeCard,
  ChoiceCard,
  CARD_WIDTH,
  CARD_HEIGHT,
} from '@/components/RecipeCard';
import { SectionHeader } from '@/components/SectionHeader';
import { LoadingScreen } from '@/components/LoadingScreen';

// ─── Types ────────────────────────────────────────────────────
type ActiveMode = 'quickMeal' | 'pickForMe' | 'trySomethingNew' | null;

// ─── Action button config ─────────────────────────────────────
const QUICK_COLOR = '#F59E0B';
const PICK_COLOR = Colors.accent;
const TRY_COLOR = '#3B82F6';

// ─── Greeting ────────────────────────────────────────────────
function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning 🌅';
  if (hour < 18) return 'Good afternoon ☀️';
  return 'Good evening 🌙';
}

// ─── Reusable pill button used inside section headers ─────────
function PillButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pill,
        { borderColor: color, backgroundColor: `${color}18` },
        pressed && styles.pillPressed,
      ]}
      onPress={onPress}
      hitSlop={6}
    >
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Search bar ───────────────────────────────────────────────
function SearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchBar}>
      <View style={styles.searchInputWrap}>
        <Ionicons name="search" size={17} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search recipes, cuisines, ingredients…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable onPress={onClear} hitSlop={10} style={styles.searchClearBtn}>
            <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Three hero action buttons ────────────────────────────────
function ActionButtons({
  activeMode,
  onQuickMeal,
  onPickForMe,
  onTrySomethingNew,
}: {
  activeMode: ActiveMode;
  onQuickMeal: () => void;
  onPickForMe: () => void;
  onTrySomethingNew: () => void;
}) {
  const buttons = [
    {
      key: 'quickMeal' as const,
      emoji: '⚡',
      label: 'Quick Meal',
      sub: 'Under 30 min',
      color: QUICK_COLOR,
      onPress: onQuickMeal,
    },
    {
      key: 'pickForMe' as const,
      emoji: '🎲',
      label: 'Pick For Me',
      sub: 'One perfect dish',
      color: PICK_COLOR,
      onPress: onPickForMe,
    },
    {
      key: 'trySomethingNew' as const,
      emoji: '🌎',
      label: 'Try Something New',
      sub: 'New cuisine',
      color: TRY_COLOR,
      onPress: onTrySomethingNew,
    },
  ] as const;

  return (
    <View style={styles.actionRow}>
      {buttons.map((btn) => {
        const active = activeMode === btn.key;
        return (
          <Pressable
            key={btn.key}
            style={({ pressed }) => [
              styles.actionBtn,
              active && {
                backgroundColor: `${btn.color}1A`,
                borderColor: btn.color,
                shadowColor: btn.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              },
              pressed && styles.actionBtnPressed,
            ]}
            onPress={btn.onPress}
          >
            <Text style={[styles.actionEmoji, active && { opacity: 1 }]}>
              {btn.emoji}
            </Text>
            <Text
              style={[
                styles.actionLabel,
                active && { color: btn.color },
              ]}
              numberOfLines={2}
            >
              {btn.label}
            </Text>
            <Text style={styles.actionSub}>{btn.sub}</Text>
            {active && (
              <View style={[styles.activeDot, { backgroundColor: btn.color }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Horizontal recipe carousel ──────────────────────────────
function RecipeCarousel({
  recipes,
  onFavoriteToggle,
}: {
  recipes: Recipe[];
  onFavoriteToggle: (id: string) => void;
}) {
  if (recipes.length === 0) {
    return (
      <View style={styles.emptyCarousel}>
        <Text style={styles.emptyText}>No recipes match your taste profile here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={recipes}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContent}
      snapToInterval={CARD_WIDTH + 14}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <RecipeCard recipe={item} onFavoriteToggle={onFavoriteToggle} />
      )}
    />
  );
}

// ─── RNG Section — 3 choices for the current meal time ───────
function RNGSection({
  mealTime,
  choices,
  onShuffle,
  onFavoriteToggle,
}: {
  mealTime: MealTime;
  choices: Recipe[];
  onShuffle: () => void;
  onFavoriteToggle: (id: string) => void;
}) {
  const meta = MEAL_TIME_META[mealTime];

  return (
    <View style={styles.rngSection}>
      <View style={styles.rngHeader}>
        <View style={styles.rngHeaderLeft}>
          <View style={[styles.rngAccent, { backgroundColor: meta.color }]} />
          <View>
            <Text style={styles.rngEmoji}>{meta.emoji}</Text>
            <Text style={styles.rngTitle}>{meta.greeting}</Text>
          </View>
        </View>
        <Pressable
          style={styles.shuffleBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onShuffle();
          }}
        >
          <Ionicons name="shuffle" size={18} color={Colors.textPrimary} />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </Pressable>
      </View>

      <View style={styles.choicesContainer}>
        {choices.length === 0 ? (
          <View style={styles.emptyChoices}>
            <Text style={styles.emptyText}>
              No {meta.label.toLowerCase()} recipes match your preferences.
            </Text>
          </View>
        ) : (
          choices.map((recipe, idx) => (
            <ChoiceCard
              key={recipe.id}
              recipe={recipe}
              index={idx}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))
        )}
      </View>
    </View>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────
export default function HomeScreen() {
  const { userId } = useSession();
  const { preferences, refresh: refreshPreferences } = usePreferences(userId);
  const { loading, visibleRecipes, getRNGChoices, getCarouselRecipes, toggleFavorite, refresh } =
    useRecipes(userId, preferences);

  // Re-read preferences AND re-fetch recipes whenever this tab comes into focus.
  // This ensures newly created recipes appear without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      refreshPreferences();
      refresh();
    }, [refreshPreferences, refresh])
  );

  const hour = new Date().getHours();
  const currentMealTime = getMealTimeForHour(hour);

  // ── Search query ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // Filter the already-Taste-Engine-filtered visibleRecipes by query.
  // Banned recipes are already excluded from visibleRecipes, so they can never
  // appear here even if the query text matches them.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null; // null = no active search
    return visibleRecipes.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.cuisine?.toLowerCase().includes(q)) return true;
      const ings: string[] = Array.isArray(r.ingredients_list)
        ? (r.ingredients_list as string[])
        : [];
      return ings.some((i) => i.toLowerCase().includes(q));
    });
  }, [searchQuery, visibleRecipes]);

  // ── Active mode state ──────────────────────────────────────
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [pickedRecipe, setPickedRecipe] = useState<Recipe | null>(null);
  const [tryCuisine, setTryCuisine] = useState<string | null>(null);

  // ── RNG seed for the 3-choice section ─────────────────────
  const [rngSeed, setRngSeed] = useState(0);
  const shuffle = useCallback(() => setRngSeed((s) => s + 1), []);

  const rngChoices = useMemo(
    () => getRNGChoices(currentMealTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getRNGChoices, currentMealTime, rngSeed]
  );

  // ── Standard carousels ─────────────────────────────────────
  const dinnerRecipes = useMemo(() => getCarouselRecipes('dinner'), [getCarouselRecipes]);
  const lunchRecipes  = useMemo(() => getCarouselRecipes('lunch'),  [getCarouselRecipes]);
  const breakfastRecipes = useMemo(() => getCarouselRecipes('breakfast'), [getCarouselRecipes]);

  // ── Quick Meal: recipes sorted by prep time ≤ 30 min ──────
  const quickMealRecipes = useMemo((): Recipe[] => {
    const sorted = [...visibleRecipes].sort((a, b) => a.prep_time_mins - b.prep_time_mins);
    const quick  = sorted.filter((r) => r.prep_time_mins <= 30);
    // Fall back to the 8 fastest overall if nothing fits under 30 min
    return quick.length >= 3 ? quick : sorted.slice(0, 8);
  }, [visibleRecipes]);

  // ── Try Something New: recipes for the selected cuisine ───
  const tryCuisineRecipes = useMemo((): Recipe[] => {
    if (!tryCuisine) return [];
    return visibleRecipes.filter(
      (r) => r.cuisine?.toLowerCase() === tryCuisine.toLowerCase()
    );
  }, [visibleRecipes, tryCuisine]);

  // ── Unique cuisines in the visible set ────────────────────
  const availableCuisines = useMemo(
    () =>
      [...new Set(visibleRecipes.map((r) => r.cuisine).filter(Boolean))] as string[],
    [visibleRecipes]
  );

  // ── Action button handlers ─────────────────────────────────
  const handleQuickMeal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveMode((m) => (m === 'quickMeal' ? null : 'quickMeal'));
    setPickedRecipe(null);
    setTryCuisine(null);
  }, []);

  const pickRandomRecipe = useCallback((): Recipe | null => {
    if (visibleRecipes.length === 0) return null;
    return visibleRecipes[Math.floor(Math.random() * visibleRecipes.length)];
  }, [visibleRecipes]);

  const handlePickForMe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (activeMode === 'pickForMe') {
      setActiveMode(null);
      setPickedRecipe(null);
      return;
    }
    setPickedRecipe(pickRandomRecipe());
    setActiveMode('pickForMe');
    setTryCuisine(null);
  }, [activeMode, pickRandomRecipe]);

  const rerollPick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickedRecipe(pickRandomRecipe());
  }, [pickRandomRecipe]);

  const pickRandomCuisine = useCallback((): string | null => {
    if (availableCuisines.length === 0) return null;
    // Avoid picking the same cuisine twice in a row
    const others = tryCuisine
      ? availableCuisines.filter((c) => c !== tryCuisine)
      : availableCuisines;
    const pool = others.length > 0 ? others : availableCuisines;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [availableCuisines, tryCuisine]);

  const handleTrySomethingNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeMode === 'trySomethingNew') {
      setActiveMode(null);
      setTryCuisine(null);
      return;
    }
    setTryCuisine(pickRandomCuisine());
    setActiveMode('trySomethingNew');
    setPickedRecipe(null);
  }, [activeMode, pickRandomCuisine]);

  const rerollCuisine = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTryCuisine(pickRandomCuisine());
  }, [pickRandomCuisine]);

  if (loading) {
    return <LoadingScreen message="Loading your personalized menu..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ── Top greeting bar ──────────────────────────────── */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting(hour)}</Text>
            <Text style={styles.greetingSub}>What are we cooking today?</Text>
          </View>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>F</Text>
          </View>
        </View>

        {/* ── Search bar ────────────────────────────────────── */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* ── Three action buttons ───────────────────────────── */}
        <ActionButtons
          activeMode={activeMode}
          onQuickMeal={handleQuickMeal}
          onPickForMe={handlePickForMe}
          onTrySomethingNew={handleTrySomethingNew}
        />

        {/* ══════════════════════════════════════════════════════
            Feed — search overrides activeMode when query is set
        ══════════════════════════════════════════════════════ */}

        {/* ── SEARCH RESULTS ────────────────────────────────────── */}
        {searchResults !== null && (
          <>
            <SectionHeader
              title={`"${searchQuery.trim()}"`}
              subtitle={
                searchResults.length === 0
                  ? 'No recipes found'
                  : `${searchResults.length} recipe${searchResults.length !== 1 ? 's' : ''} found`
              }
              accentColor={Colors.accent}
            />
            {searchResults.length === 0 ? (
              <View style={styles.emptyFull}>
                <Text style={styles.emptyText}>
                  No recipes match your search. Try a different term.
                </Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={searchResults}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                snapToInterval={CARD_WIDTH + 14}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <RecipeCard recipe={item} onFavoriteToggle={toggleFavorite} />
                )}
              />
            )}
          </>
        )}

        {/* ── DEFAULT: meal-time RNG + carousels ──────────────── */}
        {searchResults === null && activeMode === null && (
          <>
            <RNGSection
              mealTime={currentMealTime}
              choices={rngChoices}
              onShuffle={shuffle}
              onFavoriteToggle={toggleFavorite}
            />

            {dinnerRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Dinner Ideas"
                  subtitle="Quick weeknight wins"
                  accentColor={Colors.dinner}
                />
                <RecipeCarousel recipes={dinnerRecipes} onFavoriteToggle={toggleFavorite} />
              </>
            )}

            {lunchRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Lunch Picks"
                  subtitle="Midday fuel"
                  accentColor={Colors.lunch}
                />
                <RecipeCarousel recipes={lunchRecipes} onFavoriteToggle={toggleFavorite} />
              </>
            )}

            {breakfastRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Breakfast"
                  subtitle="Start strong"
                  accentColor={Colors.breakfast}
                />
                <RecipeCarousel recipes={breakfastRecipes} onFavoriteToggle={toggleFavorite} />
              </>
            )}
          </>
        )}

        {/* ── QUICK MEAL mode ───────────────────────────────────── */}
        {searchResults === null && activeMode === 'quickMeal' && (
          <>
            <SectionHeader
              title="Quick Meals"
              subtitle={`${quickMealRecipes.length} recipes · 30 min or less`}
              accentColor={QUICK_COLOR}
              rightAction={
                <PillButton
                  icon="⚡"
                  label="Clear"
                  color={QUICK_COLOR}
                  onPress={handleQuickMeal}
                />
              }
            />
            {quickMealRecipes.length === 0 ? (
              <View style={styles.emptyFull}>
                <Text style={styles.emptyText}>No quick recipes match your preferences.</Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={quickMealRecipes}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                snapToInterval={CARD_WIDTH + 14}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <RecipeCard recipe={item} onFavoriteToggle={toggleFavorite} />
                )}
              />
            )}

            {/* Show prep-time callouts as a quick reference strip */}
            <View style={styles.timeBadgeRow}>
              {quickMealRecipes.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.timeBadge}>
                  <Text style={styles.timeBadgeTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  <Text style={[styles.timeBadgeTime, { color: QUICK_COLOR }]}>
                    {r.prep_time_mins} min
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── PICK FOR ME mode ─────────────────────────────────── */}
        {searchResults === null && activeMode === 'pickForMe' && pickedRecipe && (
          <>
            <SectionHeader
              title="Here's Your Pick"
              subtitle="Chosen just for you"
              accentColor={PICK_COLOR}
              rightAction={
                <PillButton
                  icon="🎲"
                  label="Re-roll"
                  color={PICK_COLOR}
                  onPress={rerollPick}
                />
              }
            />
            <HeroCard recipe={pickedRecipe} onFavoriteToggle={toggleFavorite} />
          </>
        )}

        {/* ── TRY SOMETHING NEW mode ────────────────────────────── */}
        {searchResults === null && activeMode === 'trySomethingNew' && tryCuisine && (
          <>
            <SectionHeader
              title={tryCuisine}
              subtitle="Explore something different"
              accentColor={TRY_COLOR}
              rightAction={
                <PillButton
                  icon="🌎"
                  label="Try Another"
                  color={TRY_COLOR}
                  onPress={rerollCuisine}
                />
              }
            />
            {tryCuisineRecipes.length === 0 ? (
              <View style={styles.emptyFull}>
                <Text style={styles.emptyText}>No {tryCuisine} recipes in your feed.</Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={tryCuisineRecipes}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                snapToInterval={CARD_WIDTH + 14}
                decelerationRate="fast"
                renderItem={({ item }) => (
                  <RecipeCard recipe={item} onFavoriteToggle={toggleFavorite} />
                )}
              />
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  greetingSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },

  // Search bar
  searchBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 13,
    height: 46,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  searchClearBtn: {
    flexShrink: 0,
    padding: 2,
  },

  // Action buttons row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    // Default subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  actionEmoji: {
    fontSize: 22,
    opacity: 0.85,
  },
  actionLabel: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 15,
  },
  actionSub: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },

  // Pill button (inside section headers)
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  pillIcon: {
    fontSize: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // RNG section
  rngSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  rngHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  rngHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rngAccent: {
    width: 4,
    height: 38,
    borderRadius: 2,
  },
  rngEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  rngTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shuffleText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  choicesContainer: {
    gap: 0,
  },

  // Carousel
  carouselContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },

  // Time badge strip (Quick Meal mode)
  timeBadgeRow: {
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeBadgeTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  timeBadgeTime: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Empty states
  emptyCarousel: {
    marginHorizontal: 20,
    height: CARD_HEIGHT * 0.4,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyFull: {
    marginHorizontal: 20,
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyChoices: {
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
