import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  Platform,
  useWindowDimensions,
  Alert,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import {
  MEAL_TIME_META,
  difficultyLabel,
  type Recipe,
  type DbRecipe,
} from '@/lib/types';
import { getRecipeSource } from '@/lib/recipeSource';
import { RecipeImage } from '@/components/RecipeImage';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { useGroceryList } from '@/hooks/useGroceryList';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TagChip } from '@/components/TagChip';
import { useIsTablet } from '@/hooks/useIsTablet';
import { USER_PANTRY_KEY } from '@/lib/pantry';
import { ingredientLineMatchesPantry } from '@/lib/pantryMatch';
import {
  PRESET_SERVINGS,
  PRESET_HIGHLIGHT_COLOR,
  SERVING_SLIDER_MIN,
  SERVING_SLIDER_MAX,
  getServingScaleRatio,
  scaleIngredientLine,
} from '@/lib/servingScale';

export default function RecipeDetailScreen() {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeStyles(Colors), [Colors]);
  const insets     = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const isTablet   = useIsTablet();
  const leftColW   = isTablet ? winW * 0.42 : winW;
  const heroHPhone = winW * 0.85;
  const heroHTablet = leftColW * 0.95;

  const { id, fromPantryMatch, pantry: pantryParam } = useLocalSearchParams<{
    id: string;
    fromPantryMatch?: string;
    pantry?: string;
  }>();
  const router  = useRouter();
  const { userId }    = useSession();
  const { preferences } = usePreferences(userId);
  const {
    loading,
    visibleRecipes,
    getRecipeById,
    toggleFavorite,
    isFavorited,
    refresh,
  } = useRecipes(userId, preferences);
  const { addRecipe, removeRecipe, hasRecipe, reload: reloadGrocery } = useGroceryList();

  const [groceryFeedback, setGroceryFeedback] = useState<'idle' | 'added' | 'already'>('idle');
  const [pantryHighlightNames, setPantryHighlightNames] = useState<string[]>([]);
  const [selectedServings, setSelectedServings] = useState(SERVING_SLIDER_MIN);
  const [fetchedRecipe, setFetchedRecipe] = useState<Recipe | null>(null);
  const [detailReady, setDetailReady] = useState(false);

  const fromPantry = fromPantryMatch === '1';

  useEffect(() => {
    if (!fromPantry) {
      setPantryHighlightNames([]);
      return;
    }
    let cancelled = false;

    const tryParse = (raw: string): boolean => {
      try {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) {
          if (!cancelled) setPantryHighlightNames(arr);
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    };

    if (pantryParam != null) {
      const s = Array.isArray(pantryParam) ? pantryParam[0] : pantryParam;
      if (tryParse(s)) {
        return () => {
          cancelled = true;
        };
      }
    }

    AsyncStorage.getItem(USER_PANTRY_KEY).then((stored) => {
      if (cancelled || !stored) return;
      tryParse(stored);
    });

    return () => {
      cancelled = true;
    };
  }, [fromPantry, pantryParam]);

  const pantryLower = useMemo(
    () =>
      pantryHighlightNames
        .map((p) => p.trim().toLowerCase())
        .filter((p) => p.length > 0),
    [pantryHighlightNames]
  );

  useFocusEffect(
    useCallback(() => {
      reloadGrocery();
    }, [reloadGrocery])
  );

  const recipe = useMemo(() => {
    if (!id) return null;
    return getRecipeById(id) ?? fetchedRecipe;
  }, [id, getRecipeById, fetchedRecipe]);

  useEffect(() => {
    if (!id) {
      setDetailReady(false);
      setFetchedRecipe(null);
      return;
    }
    if (loading) return;

    const cached = getRecipeById(id);
    if (cached) {
      setFetchedRecipe(null);
      setDetailReady(true);
      return;
    }

    let cancelled = false;
    const favsKey = userId ? `favs:${userId}` : null;

    setDetailReady(false);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          setFetchedRecipe(null);
          return;
        }

        let favIds: string[] = [];
        if (favsKey) {
          try {
            const raw = await AsyncStorage.getItem(favsKey);
            favIds = raw ? (JSON.parse(raw) as string[]) : [];
            if (!Array.isArray(favIds)) favIds = [];
          } catch {
            favIds = [];
          }
        }
        const row = data as DbRecipe;
        setFetchedRecipe({
          ...row,
          is_favorited: new Set(favIds).has(row.id),
        });
      } finally {
        if (!cancelled) setDetailReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, loading, visibleRecipes, userId, getRecipeById]);

  const canDeleteRecipe =
    !!recipe &&
    recipe.is_user_created === true &&
    !!userId &&
    recipe.user_id === userId;

  const handleDeleteRecipe = useCallback(() => {
    if (!recipe || !canDeleteRecipe) return;
    Alert.alert(
      'Delete recipe',
      'Delete this recipe? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
            if (error) {
              Alert.alert('Could not delete', error.message);
              return;
            }
            await refresh();
            router.replace('/(tabs)/favorites');
          },
        },
      ]
    );
  }, [recipe, canDeleteRecipe, refresh, router]);

  useEffect(() => {
    if (!recipe) return;
    const raw = recipe.servings;
    const d =
      raw != null && raw > 0
        ? Math.min(SERVING_SLIDER_MAX, Math.max(SERVING_SLIDER_MIN, Math.round(raw)))
        : 2;
    setSelectedServings(d);
  }, [recipe?.id, recipe?.servings]);

  const servingRatio = useMemo(
    () => getServingScaleRatio(selectedServings, recipe?.servings),
    [selectedServings, recipe?.servings]
  );

  const detailHeroPlaceholderIcon = isTablet
    ? Math.max(56, Math.min(96, Math.round(Math.min(leftColW, heroHTablet) * 0.12)))
    : Math.max(56, Math.min(96, Math.round(Math.min(winW, heroHPhone) * 0.09)));

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients_list.map((line) => scaleIngredientLine(line, servingRatio));
  }, [recipe, servingRatio]);

  const scaledShoppingList = useMemo(() => {
    if (!recipe) return [];
    return recipe.shopping_list.map((line) => scaleIngredientLine(line, servingRatio));
  }, [recipe, servingRatio]);

  const inGroceryList = recipe ? hasRecipe(recipe.id) : false;

  const handleGroceryToggle = useCallback(async () => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (inGroceryList) {
        await removeRecipe(recipe.id);
        setGroceryFeedback('idle');
      } else {
        const result = await addRecipe({
          ...recipe,
          ingredients_list: scaledIngredients,
        });
        setGroceryFeedback(result === 'added' ? 'added' : 'already');
        setTimeout(() => setGroceryFeedback('idle'), 2000);
      }
    } catch (err) {
      console.error('[RecipeDetail] handleGroceryToggle error:', err);
    }
  }, [recipe, inGroceryList, addRecipe, removeRecipe, scaledIngredients]);

  if (!id) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundText}>Recipe not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading || !detailReady) return <LoadingScreen message="Loading recipe..." />;

  if (!recipe) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundText}>Recipe not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this recipe: ${recipe.title} — Mealsolved app`,
        title:   recipe.title,
      });
    } catch {
      // silently ignore
    }
  };

  const heroChrome = (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.45, 1]}
      />
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.topBarRight}>
          {canDeleteRecipe ? (
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleDeleteRecipe();
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable style={styles.iconBtn} onPress={handleShare}>
            <Ionicons
              name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
              size={22}
              color="#fff"
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleFavorite(recipe.id);
            }}
          >
            <Ionicons
              name={isFavorited(recipe.id) ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorited(recipe.id) ? Colors.accent : '#fff'}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );

  const statsSection = (
    <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
      <View style={styles.stat}>
        <Ionicons name="time-outline" size={20} color={Colors.accent} />
        <Text
          style={styles.statValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {recipe.prep_time_mins}
        </Text>
        <Text
          style={styles.statLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          min
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <View
          style={[
            styles.diffBadge,
            {
              backgroundColor:
                recipe.effort_score <= 1 ? Colors.success + '25'
                : recipe.effort_score <= 2 ? Colors.warning + '25'
                : Colors.accent + '25',
            },
          ]}
        >
          <Text
            style={[
              styles.diffBadgeText,
              {
                color:
                  recipe.effort_score <= 1 ? Colors.success
                  : recipe.effort_score <= 2 ? Colors.warning
                  : Colors.accent,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {difficultyLabel(recipe.effort_score)}
          </Text>
        </View>
        <Text
          style={styles.statLabel}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          difficulty
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <Text
          style={styles.statValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {recipe.servings ?? 2}
        </Text>
        <Text
          style={[styles.statLabel, styles.statLabelServings]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          Servings
        </Text>
      </View>
    </View>
  );

  const servingsSection = (
    <View style={[styles.sectionCard, styles.servingsCard]}>
      <Text style={styles.servingsSectionTitle}>Servings</Text>
      <View style={styles.presetRow}>
        {PRESET_SERVINGS.map((n) => {
          const active = selectedServings === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedServings(n);
              }}
              style={({ pressed }) => [
                styles.presetBtn,
                active && styles.presetBtnActive,
                pressed && styles.presetBtnPressed,
              ]}
            >
              <Text
                style={[styles.presetBtnText, active && styles.presetBtnTextActive]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.servingsSliderRow}>
        <Text style={styles.servingsSliderLabel}>Servings</Text>
        <Text style={styles.servingsCount}>{selectedServings}</Text>
        <Slider
          style={styles.servingsSlider}
          minimumValue={SERVING_SLIDER_MIN}
          maximumValue={SERVING_SLIDER_MAX}
          step={1}
          value={selectedServings}
          onValueChange={(v) => setSelectedServings(Math.round(v))}
          minimumTrackTintColor={PRESET_HIGHLIGHT_COLOR}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={PRESET_HIGHLIGHT_COLOR}
        />
      </View>
    </View>
  );

  const source = getRecipeSource(recipe);

  const introSection = (
    <>
      <View style={styles.mealTimeRow}>
        {recipe.meal_time.map((mt) => {
          const meta = MEAL_TIME_META[mt as keyof typeof MEAL_TIME_META];
          return (
            <View
              key={mt}
              style={[styles.mealBadge, { backgroundColor: meta.color + '25' }]}
            >
              <Text style={[styles.mealBadgeText, { color: meta.color }]}>
                {meta.emoji} {meta.label}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.description}>{recipe.description}</Text>
      {source && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Recipe inspiration: ${source.label}. Opens a website.`}
          onPress={() => Linking.openURL(source.url).catch(() =>
            Alert.alert('Could not open source', 'Please try again when your connection is available.')
          )}
          style={styles.sourceLink}
        >
          <Text style={styles.sourceText}>Recipe inspiration: {source.label} ↗</Text>
        </Pressable>
      )}
    </>
  );

  const listsSection = (
    <>
      <View style={styles.tagsRow}>
        {recipe.tags.map((tag) => (
          <TagChip key={tag} label={tag} small />
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.groceryBtn,
          inGroceryList && styles.groceryBtnAdded,
          pressed && styles.groceryBtnPressed,
        ]}
        onPress={handleGroceryToggle}
      >
        <Ionicons
          name={inGroceryList ? 'checkmark-circle' : 'cart-outline'}
          size={20}
          color={inGroceryList ? Colors.success : '#fff'}
        />
        <Text
          style={[
            styles.groceryBtnText,
            inGroceryList && styles.groceryBtnTextAdded,
          ]}
        >
          {groceryFeedback === 'added'
            ? '✓ Added to Grocery List!'
            : inGroceryList
            ? 'Remove from Grocery List'
            : '🛒 Add to Grocery List'}
        </Text>
      </Pressable>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Ionicons name="nutrition-outline" size={20} color={Colors.success} />
          <Text style={styles.sectionCardTitle}>Ingredients</Text>
        </View>
        <View style={styles.ingredientsGrid}>
          {scaledIngredients.map((ing, i) => {
            const has = fromPantry && ingredientLineMatchesPantry(ing, pantryLower);
            const lineColor = !fromPantry
              ? Colors.textSecondary
              : has
              ? Colors.success
              : '#F87171';
            const dotColor = !fromPantry
              ? Colors.accent
              : has
              ? Colors.success
              : '#F87171';
            return (
              <View key={i} style={styles.ingredientItem}>
                <View style={[styles.ingredientDot, { backgroundColor: dotColor }]} />
                <Text style={[styles.ingredientText, { color: lineColor }]}>{ing}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Ionicons name="cart-outline" size={20} color={Colors.info} />
          <Text style={styles.sectionCardTitle}>Shopping List</Text>
        </View>
        {scaledShoppingList.map((line, i) => (
          <Text key={i} style={styles.shoppingLine}>
            {line}
          </Text>
        ))}
      </View>
    </>
  );

  const tabletRightColumn = (
    <>
      {introSection}
      {listsSection}
    </>
  );

  return (
    <View style={[styles.root, styles.screenFill]}>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {isTablet ? (
          <View style={styles.tabletPage}>
            <View style={styles.tabletColumns}>
              <View style={[styles.tabletLeft, { width: leftColW }]}>
                <View style={[styles.tabletHero, { height: heroHTablet }]}>
                  <RecipeImage url={recipe.image_url} style={styles.heroImage} iconSize={detailHeroPlaceholderIcon} accessibilityLabel={recipe.title} />
                  {heroChrome}
                </View>
                {statsSection}
                {servingsSection}
              </View>
              <View style={styles.tabletRight}>{tabletRightColumn}</View>
            </View>
            <View style={{ height: 100 }} />
          </View>
        ) : (
          <>
            <View style={[styles.hero, { width: winW, height: heroHPhone }]}>
              <RecipeImage url={recipe.image_url} style={styles.heroImage} iconSize={detailHeroPlaceholderIcon} accessibilityLabel={recipe.title} />
              {heroChrome}
            </View>
            <View style={styles.content}>
              {introSection}
              {statsSection}
              {servingsSection}
              {listsSection}
              <View style={{ height: 100 }} />
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Sticky Start Cooking button ──────────────────── */}
      <View style={[
        styles.startCookingBar,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
        <Pressable
          style={({ pressed }) => [
            styles.startCookingBtn,
            pressed && styles.startCookingBtnPressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const ratio = getServingScaleRatio(selectedServings, recipe.servings);
            router.push(
              `/cooking-mode?id=${encodeURIComponent(recipe.id)}&servings=${selectedServings}&scaleRatio=${encodeURIComponent(String(ratio))}`
            );
          }}
        >
          <Text style={styles.startCookingText}>🍳  Start Cooking</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    screenFill: {
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollRoot: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollContent: {
      flexGrow: 1,
    },
    hero: {
      position: 'relative',
    },
    tabletPage: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    tabletColumns: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 24,
    },
    tabletLeft: {
      gap: 16,
    },
    tabletHero: {
      width: '100%',
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    tabletRight: {
      flex: 1,
      minWidth: 280,
      paddingTop: 4,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    topBarRight: {
      flexDirection: 'row',
      gap: 10,
    },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      backgroundColor: Colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      marginTop: -28,
      paddingHorizontal: 22,
      paddingTop: 28,
    },
    mealTimeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    mealBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
    },
    mealBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
      lineHeight: 36,
      marginBottom: 10,
    },
    description: {
      color: Colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 22,
    },
    sourceLink: {
      minHeight: 44,
      justifyContent: 'center',
      marginBottom: 16,
    },
    sourceText: {
      color: Colors.accent,
      fontSize: 14,
      lineHeight: 20,
      textDecorationLine: 'underline',
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: Colors.surface,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 12,
      marginBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    statsRowTablet: {
      flexWrap: 'wrap',
      justifyContent: 'center',
      rowGap: 12,
      marginBottom: 0,
    },
    stat: {
      flex: 1,
      flexBasis: 0,
      minWidth: 76,
      alignItems: 'center',
      gap: 4,
      overflow: 'hidden',
      paddingHorizontal: 2,
    },
    statValue: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      width: '100%',
      textAlign: 'center',
    },
    diffBadge: {
      paddingHorizontal: 10,
      paddingVertical:   5,
      borderRadius:      8,
      alignSelf:         'center',
      maxWidth:          '100%',
      overflow:          'hidden',
    },
    diffBadgeText: {
      fontSize:      12,
      fontWeight:    '700',
      letterSpacing: 0.15,
      textAlign:     'center',
      width:         '100%',
    },
    statLabel: {
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
      width: '100%',
      textAlign: 'center',
    },
    statLabelServings: {
      textTransform: 'none',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: Colors.border,
      flexShrink: 0,
    },
    servingsCard: {
      marginBottom: 20,
    },
    servingsSectionTitle: {
      color: Colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 12,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    presetBtn: {
      minWidth: 44,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1.5,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetBtnActive: {
      backgroundColor: PRESET_HIGHLIGHT_COLOR,
      borderColor: PRESET_HIGHLIGHT_COLOR,
    },
    presetBtnPressed: {
      opacity: 0.85,
    },
    presetBtnText: {
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    presetBtnTextActive: {
      color: '#fff',
    },
    servingsSliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    servingsSliderLabel: {
      color: Colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    servingsCount: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
      minWidth: 28,
      textAlign: 'center',
    },
    servingsSlider: {
      flex: 1,
      height: 40,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    sectionCard: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      gap: 14,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionCardTitle: {
      color: Colors.textPrimary,
      fontSize: 17,
      fontWeight: '800',
    },
    ingredientsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    ingredientItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      width: '47%',
    },
    ingredientDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.accent,
    },
    ingredientText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      flex: 1,
      textTransform: 'capitalize',
    },
    shoppingLine: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '500',
    },
    notFound: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    notFoundText: {
      color: Colors.textSecondary,
      fontSize: 18,
      fontWeight: '600',
    },
    backBtn: {
      backgroundColor: Colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    backBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },

    // Grocery button
    groceryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: Colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      marginBottom: 24,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    groceryBtnAdded: {
      backgroundColor: 'rgba(34,197,94,0.12)',
      borderWidth: 1.5,
      borderColor: Colors.success,
      shadowColor: Colors.success,
      shadowOpacity: 0.2,
    },
    groceryBtnPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    groceryBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    groceryBtnTextAdded: {
      color: Colors.success,
    },

    // Start Cooking sticky bar
    startCookingBar: {
      width:             '100%',
      alignSelf:         'stretch',
      paddingHorizontal: 20,
      paddingTop:        14,
      backgroundColor:   Colors.background,
      borderTopWidth:    1,
      borderTopColor:    Colors.border,
    },
    startCookingBtn: {
      backgroundColor: Colors.accent,
      borderRadius:    16,
      paddingVertical: 17,
      alignItems:      'center',
      justifyContent:  'center',
      shadowColor:     Colors.accent,
      shadowOffset:    { width: 0, height: 4 },
      shadowOpacity:   0.35,
      shadowRadius:    10,
      elevation:       6,
    },
    startCookingBtnPressed: {
      opacity:   0.85,
      transform: [{ scale: 0.98 }],
    },
    startCookingText: {
      color:         '#fff',
      fontSize:      17,
      fontWeight:    '800',
      letterSpacing: 0.2,
    },
  });
}
