import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { EFFORT_LABELS, MEAL_TIME_META, effortSpoons } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { useGroceryList } from '@/hooks/useGroceryList';
import { LoadingScreen } from '@/components/LoadingScreen';
import { TagChip } from '@/components/TagChip';
import { RecipeCarousel } from '@/components/RecipeCarousel';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = SCREEN_W * 0.85;

export default function RecipeDetailScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { userId }    = useSession();
  const { preferences } = usePreferences(userId);
  const { loading, getRecipeById, toggleFavorite } = useRecipes(userId, preferences);
  const { addRecipe, removeRecipe, hasRecipe, reload: reloadGrocery } = useGroceryList();

  const [groceryFeedback, setGroceryFeedback] = useState<'idle' | 'added' | 'already'>('idle');

  useFocusEffect(
    useCallback(() => {
      reloadGrocery();
    }, [reloadGrocery])
  );

  const recipe = useMemo(
    () => (id ? getRecipeById(id) : null),
    [id, getRecipeById]
  );

  const inGroceryList = recipe ? hasRecipe(recipe.id) : false;

  const handleGroceryToggle = useCallback(async () => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (inGroceryList) {
        await removeRecipe(recipe.id);
        setGroceryFeedback('idle');
      } else {
        const result = await addRecipe(recipe);
        setGroceryFeedback(result === 'added' ? 'added' : 'already');
        setTimeout(() => setGroceryFeedback('idle'), 2000);
      }
    } catch (err) {
      console.error('[RecipeDetail] handleGroceryToggle error:', err);
    }
  }, [recipe, inGroceryList, addRecipe, removeRecipe]);

  if (loading) return <LoadingScreen message="Loading recipe..." />;

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
        message: `Check out this recipe: ${recipe.title} — Food For You app`,
        title:   recipe.title,
      });
    } catch {
      // silently ignore
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── Hero Image ──────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={{ uri: recipe.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 0.45, 1]}
          />

          {/* Top bar */}
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
                  name={recipe.is_favorited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={recipe.is_favorited ? Colors.accent : '#fff'}
                />
              </Pressable>
            </View>
          </SafeAreaView>

          {/* ROTD badge */}
          {recipe.is_recipe_of_the_day && (
            <View style={styles.rotdBadge}>
              <Text style={styles.rotdText}>⭐ Recipe of the Day</Text>
            </View>
          )}
        </View>

        {/* ── Content card ────────────────────────────────── */}
        <View style={styles.content}>
          {/* Meal time badges */}
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

          {/* Title */}
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Quick stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={20} color={Colors.accent} />
              <Text style={styles.statValue}>{recipe.prep_time_mins}</Text>
              <Text style={styles.statLabel}>min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statSpoons}>
                {effortSpoons(recipe.effort_score)}
              </Text>
              <Text style={styles.statLabel}>{EFFORT_LABELS[recipe.effort_score]}</Text>
            </View>
            {recipe.cuisine && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Ionicons name="globe-outline" size={20} color={Colors.info} />
                  <Text style={[styles.statValue, { fontSize: 13 }]}>{recipe.cuisine}</Text>
                </View>
              </>
            )}
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {recipe.tags.map((tag) => (
              <TagChip key={tag} label={tag} small />
            ))}
          </View>

          {/* ── Add to Grocery List ──────────────────────────── */}
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

          {/* ── Ingredients ─────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="nutrition-outline" size={20} color={Colors.success} />
              <Text style={styles.sectionCardTitle}>Ingredients</Text>
            </View>
            <View style={styles.ingredientsGrid}>
              {recipe.ingredients_list.map((ing, i) => (
                <View key={i} style={styles.ingredientItem}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Shopping list ────────────────────────────────── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="cart-outline" size={20} color={Colors.info} />
              <Text style={styles.sectionCardTitle}>Shopping List</Text>
            </View>
            {recipe.shopping_list.map((line, i) => (
              <Text key={i} style={styles.shoppingLine}>{line}</Text>
            ))}
          </View>

          {/* ── Steps — HelloFresh swipeable carousel ────────── */}
          <RecipeCarousel
            steps={recipe.recipe_steps}
            recipeImage={recipe.image_url}
          />

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
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
    hero: {
      width: SCREEN_W,
      height: HERO_H,
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
    rotdBadge: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      backgroundColor: Colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    rotdText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
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
    statsRow: {
      flexDirection: 'row',
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    statSpoons: {
      fontSize: 18,
      letterSpacing: 2,
    },
    statLabel: {
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: Colors.border,
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
  });
}
