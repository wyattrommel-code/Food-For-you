import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import type { Recipe, DbRecipe } from '@/lib/types';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useIsTablet } from '@/hooks/useIsTablet';
import { scaleCookingStep } from '@/lib/servingScale';
import { supabase } from '@/lib/supabase';
import { recipeImageUri } from '@/lib/recipeImageUri';
import { RecipeImage } from '@/components/RecipeImage';
import { RecipeImagePlaceholder } from '@/components/RecipeImagePlaceholder';

function parsePositiveFloat(raw: string | string[] | undefined): number | null {
  if (raw == null) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CookingModeScreen() {
  const { id, scaleRatio: scaleRatioParam } = useLocalSearchParams<{
    id: string;
    servings?: string;
    scaleRatio?: string;
  }>();
  const router    = useRouter();
  const { Colors } = useTheme();
  const isTablet = useIsTablet();
  const styles       = useMemo(() => makeStyles(Colors, isTablet), [Colors, isTablet]);
  const navIconSize  = isTablet ? 22 : 18;

  const { userId }      = useSession();
  const { preferences } = usePreferences(userId);
  const { loading, visibleRecipes, getRecipeById } = useRecipes(userId, preferences);

  const [fetchedRecipe, setFetchedRecipe] = useState<Recipe | null>(null);
  const [detailReady, setDetailReady] = useState(false);

  const recipe = useMemo(() => {
    if (!id) return null;
    return getRecipeById(id) ?? fetchedRecipe;
  }, [id, getRecipeById, fetchedRecipe]);

  useEffect(() => {
    if (!id) {
      setFetchedRecipe(null);
      setDetailReady(false);
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
        const row = data as DbRecipe;
        setFetchedRecipe({ ...row, is_favorited: false });
      } finally {
        if (!cancelled) setDetailReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loading, visibleRecipes, getRecipeById]);

  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished]   = useState(false);
  const [stepImageByNumber, setStepImageByNumber] = useState<Map<number, string>>(
    () => new Map()
  );
  const fadeAnim                  = useRef(new Animated.Value(1)).current;
  const touchStartX               = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('step_images')
          .select('step_number, image_url')
          .eq('recipe_id', id)
          .order('step_number', { ascending: true });
        if (cancelled) return;
        if (error) {
          setStepImageByNumber(new Map());
          return;
        }
        const next = new Map<number, string>();
        for (const row of data ?? []) {
          const r = row as { step_number?: number; image_url?: string };
          if (
            typeof r.step_number === 'number' &&
            typeof r.image_url === 'string' &&
            r.image_url.length > 0
          ) {
            next.set(r.step_number, r.image_url);
          }
        }
        setStepImageByNumber(next);
      } catch {
        if (!cancelled) setStepImageByNumber(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Parse steps safely
  const steps: string[] = useMemo(() => {
    if (!recipe) return [];
    if (!Array.isArray(recipe.recipe_steps) || recipe.recipe_steps.length === 0) return [];
    return recipe.recipe_steps;
  }, [recipe]);

  const stepScaleRatio = useMemo(() => {
    const parsed = parsePositiveFloat(scaleRatioParam);
    return parsed ?? 1;
  }, [scaleRatioParam]);

  const scaledSteps = useMemo(
    () => steps.map((t) => scaleCookingStep(t, stepScaleRatio)),
    [steps, stepScaleRatio]
  );

  const total    = scaledSteps.length;
  const progress = total > 0 ? (stepIndex + 1) / total : 0;

  const stepNumber1Based = stepIndex + 1;
  const stepImageUrl     = stepImageByNumber.get(stepNumber1Based);
  const hasStepImage     = Boolean(stepImageUrl);
  const recipeCoverUri   = recipe ? recipeImageUri(recipe.image_url) : null;
  const showCoverPlaceholder = Boolean(recipe) && !hasStepImage && !recipeCoverUri;
  const hasTopVisual     = hasStepImage || showCoverPlaceholder;
  const coverPlaceholderIcon = Math.max(
    44,
    Math.min(80, Math.round((isTablet ? 350 : 220) * 0.24))
  );

  // Fade + layout animation so image ↔ no-image steps do not jump harshly
  const animateTransition = useCallback((fn: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 120, useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      fn();
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const goNext = useCallback(() => {
    if (stepIndex < total - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition(() => setStepIndex((i) => i + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      animateTransition(() => setFinished(true));
    }
  }, [stepIndex, total, animateTransition]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateTransition(() => setStepIndex((i) => i - 1));
    }
  }, [stepIndex, animateTransition]);

  // Swipe gesture via touch events
  const handleTouchStart = useCallback((e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
  }, []);

  const handleTouchEnd = useCallback((e: any) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    if (dx < -50) goNext();
    else if (dx > 50) goBack();
  }, [goNext, goBack]);

  // ── Loading ────────────────────────────────────────────────
  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Recipe not found.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !detailReady) return <LoadingScreen message="Loading recipe..." />;

  // ── No recipe found ────────────────────────────────────────
  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Recipe not found.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── No steps ───────────────────────────────────────────────
  if (scaledSteps.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>No steps available for this recipe.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Completion screen ──────────────────────────────────────
  if (finished) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.completionWrap}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={styles.completionHeading}>You Did It!</Text>
          <Text style={styles.completionSubtitle}>{recipe.title}</Text>

          <View style={styles.completionButtons}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryBtnText}>Back to Recipe</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Ionicons name="home-outline" size={18} color={Colors.textPrimary} />
              <Text style={styles.outlineBtnText}>Home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Cooking step screen ────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.View style={[styles.stepBody, { opacity: fadeAnim }]}>
        {hasStepImage ? (
          <View style={styles.imageWrap}>
            <RecipeImage url={stepImageUrl} style={styles.stepImage} accessibilityLabel={recipe.title} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.25)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        ) : showCoverPlaceholder ? (
          <View style={styles.imageWrap}>
            <RecipeImagePlaceholder
              style={styles.stepImage}
              iconSize={coverPlaceholderIcon}
            />
          </View>
        ) : null}

        <View style={[styles.progressBg, !hasTopVisual && styles.progressBgNoImage]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as const }]} />
        </View>

        <Text style={styles.stepCount}>
          Step {stepIndex + 1} of {total}
        </Text>

        <View
          style={styles.stepContent}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <ScrollView
            style={styles.stepScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.stepScrollInner, { flexGrow: 1 }]}
            bounces={false}
          >
            <Text
              style={hasTopVisual ? styles.stepInstruction : styles.stepInstructionNoImage}
            >
              {scaledSteps[stepIndex]}
            </Text>
          </ScrollView>
        </View>
      </Animated.View>

      {/* ── Bottom navigation ───────────────────────────── */}
      <View style={styles.bottomNav}>
        {stepIndex > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.navBack, pressed && styles.btnPressed]}
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={navIconSize} color={Colors.textPrimary} />
            <Text style={styles.navBackText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.navPlaceholder} />
        )}

        <Pressable
          style={({ pressed }) => [styles.navNext, pressed && styles.btnPressed]}
          onPress={goNext}
        >
          <Text style={styles.navNextText}>
            {stepIndex === total - 1 ? 'Finish 🎉' : 'Next'}
          </Text>
          {stepIndex < total - 1 && (
            <Ionicons name="arrow-forward" size={navIconSize} color="#fff" />
          )}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(Colors: AppColors, isTablet: boolean) {
  const stepImageH   = isTablet ? 350 : 220;
  const stepFontSize = isTablet ? 24 : 18;
  const stepLineHeight = isTablet ? 36 : 28;
  const stepFontNoImage = isTablet ? 28 : 24;
  const stepLineNoImage = isTablet ? 40 : 34;
  const navPadV      = isTablet ? 22 : 16;
  const navPadH      = isTablet ? 28 : 20;
  const navBtnH      = isTablet ? 64 : 52;
  const navBackFs    = isTablet ? 18 : 15;
  const navNextFs    = isTablet ? 19 : 16;

  return StyleSheet.create({
    container: {
      flex:            1,
      width:           '100%',
      alignSelf:       'stretch',
      backgroundColor: Colors.background,
    },

    // ── Header ───────────────────────────────────────────────
    header: {
      flexDirection:  'row',
      alignItems:     'center',
      paddingHorizontal: 16,
      paddingVertical:   12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    closeBtn: {
      width:          38,
      height:         38,
      borderRadius:   19,
      backgroundColor: Colors.surfaceElevated,
      alignItems:     'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex:          1,
      color:         Colors.textPrimary,
      fontSize:      16,
      fontWeight:    '700',
      textAlign:     'center',
      marginHorizontal: 8,
    },

    stepBody: {
      flex:      1,
      width:     '100%',
      alignSelf: 'stretch',
    },

    // ── Step image ───────────────────────────────────────────
    imageWrap: {
      width:  '100%',
      height: stepImageH,
    },
    stepImage: {
      width:  '100%',
      height: stepImageH,
    },

    // ── Progress bar ─────────────────────────────────────────
    progressBg: {
      height:          4,
      backgroundColor: Colors.border,
      marginHorizontal: 20,
      marginTop:       16,
      borderRadius:    2,
      overflow:        'hidden',
    },
    progressBgNoImage: {
      marginTop: 12,
    },
    progressFill: {
      height:          4,
      backgroundColor: Colors.accent,
      borderRadius:    2,
    },

    // ── Step count ───────────────────────────────────────────
    stepCount: {
      color:         Colors.textMuted,
      fontSize:      12,
      fontWeight:    '600',
      textAlign:     'center',
      letterSpacing: 0.5,
      marginTop:     10,
    },

    // ── Step instruction ─────────────────────────────────────
    stepContent: {
      flex:            1,
      width:           '100%',
      alignSelf:       'stretch',
      paddingHorizontal: 24,
      paddingTop:      16,
    },
    stepScroll: {
      flex:  1,
      width: '100%',
    },
    stepScrollInner: {
      flexGrow:        1,
      justifyContent:  'center',
      paddingBottom:   16,
    },
    stepInstruction: {
      color:      Colors.textPrimary,
      fontSize:   stepFontSize,
      lineHeight: stepLineHeight,
      fontWeight: '500',
    },
    stepInstructionNoImage: {
      color:      Colors.textPrimary,
      fontSize:   stepFontNoImage,
      lineHeight: stepLineNoImage,
      fontWeight: '500',
    },

    // ── Bottom nav ───────────────────────────────────────────
    bottomNav: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            isTablet ? 16 : 12,
      width:          '100%',
      alignSelf:      'stretch',
      paddingHorizontal: navPadH,
      paddingVertical:   navPadV,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    navBack: {
      flex:           1,
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            isTablet ? 10 : 6,
      height:         navBtnH,
      borderRadius:   16,
      borderWidth:    1.5,
      borderColor:    Colors.border,
      paddingHorizontal: isTablet ? 20 : 12,
    },
    navBackText: {
      color:      Colors.textPrimary,
      fontSize:   navBackFs,
      fontWeight: '700',
    },
    navPlaceholder: {
      flex: 1,
    },
    navNext: {
      flex:            2,
      flexDirection:   'row',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             isTablet ? 10 : 6,
      height:          navBtnH,
      borderRadius:    16,
      backgroundColor: Colors.accent,
      shadowColor:     Colors.accent,
      shadowOffset:    { width: 0, height: 4 },
      shadowOpacity:   0.3,
      shadowRadius:    8,
      elevation:       4,
      paddingHorizontal: isTablet ? 24 : 16,
    },
    navNextText: {
      color:      '#fff',
      fontSize:   navNextFs,
      fontWeight: '800',
    },

    // ── Completion ───────────────────────────────────────────
    completionWrap: {
      flex:            1,
      alignItems:      'center',
      justifyContent:  'center',
      paddingHorizontal: 32,
    },
    completionEmoji: {
      fontSize:     80,
      marginBottom: 8,
    },
    completionHeading: {
      color:         Colors.textPrimary,
      fontSize:      36,
      fontWeight:    '900',
      letterSpacing: -0.5,
      textAlign:     'center',
    },
    completionSubtitle: {
      color:        Colors.textSecondary,
      fontSize:     17,
      fontWeight:   '600',
      textAlign:    'center',
      marginTop:    8,
      marginBottom: 32,
    },
    completionButtons: {
      width: '100%',
      gap:   12,
    },

    // ── Shared button styles ──────────────────────────────────
    primaryBtn: {
      width:           '100%',
      height:          52,
      backgroundColor: Colors.accent,
      borderRadius:    16,
      alignItems:      'center',
      justifyContent:  'center',
      shadowColor:     Colors.accent,
      shadowOffset:    { width: 0, height: 4 },
      shadowOpacity:   0.3,
      shadowRadius:    8,
      elevation:       4,
    },
    primaryBtnText: {
      color:      '#fff',
      fontSize:   16,
      fontWeight: '800',
    },
    outlineBtn: {
      width:          '100%',
      height:         52,
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            8,
      borderRadius:   16,
      borderWidth:    1.5,
      borderColor:    Colors.border,
    },
    outlineBtnText: {
      color:      Colors.textPrimary,
      fontSize:   16,
      fontWeight: '700',
    },
    btnPressed: {
      opacity: 0.75,
    },

    // ── Error ─────────────────────────────────────────────────
    errorWrap: {
      flex:            1,
      alignItems:      'center',
      justifyContent:  'center',
      paddingHorizontal: 32,
      gap:             16,
    },
    errorText: {
      color:      Colors.textSecondary,
      fontSize:   16,
      textAlign:  'center',
      fontWeight: '500',
    },
  });
}
