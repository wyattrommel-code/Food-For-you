import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { useUserPantry } from '@/hooks/useUserPantry';
import { rankRecipesByPantry } from '@/lib/pantryMatch';
import type { Recipe } from '@/lib/types';
import {
  RecipeCard,
  CAROUSEL_CARD_WIDTH_PHONE,
  CAROUSEL_CARD_WIDTH_TABLET,
} from '@/components/RecipeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useIsTablet } from '@/hooks/useIsTablet';
import type { RecipePantryMatch } from '@/lib/pantryMatch';

const CAROUSEL_GAP = 14;

function MatchCarousel({
  matches,
  onNavigate,
  onFavoriteToggle,
  cardWidth,
  snapInterval,
  badgeFor,
}: {
  matches: RecipePantryMatch[];
  onNavigate: (recipe: Recipe) => void;
  onFavoriteToggle: (id: string) => void;
  cardWidth: number;
  snapInterval: number;
  badgeFor: 'close' | 'none';
}) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  if (matches.length === 0) return null;

  return (
    <FlatList
      horizontal
      nestedScrollEnabled
      data={matches}
      keyExtractor={(m) => m.recipe.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.carouselContent, { flexGrow: 1 }]}
      snapToInterval={snapInterval}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item.recipe}
          carouselWidth={cardWidth}
          onFavoriteToggle={onFavoriteToggle}
          badgeText={
            badgeFor === 'close' && item.missingCount > 0
              ? `Missing ${item.missingCount} ingredient${item.missingCount === 1 ? '' : 's'}`
              : undefined
          }
          onNavigate={() => onNavigate(item.recipe)}
        />
      )}
    />
  );
}

export default function PantryMatchScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const isTablet = useIsTablet();

  const { userId } = useSession();
  const { preferences } = usePreferences(userId);
  const { loading, visibleRecipes, toggleFavorite } = useRecipes(userId, preferences);
  const { pantryNames, load } = useUserPantry();

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { carouselCardW, carouselSnap } = useMemo(() => {
    const w = isTablet ? CAROUSEL_CARD_WIDTH_TABLET : CAROUSEL_CARD_WIDTH_PHONE;
    return { carouselCardW: w, carouselSnap: w + CAROUSEL_GAP };
  }, [isTablet]);

  const ranked = useMemo(
    () => rankRecipesByPantry(visibleRecipes, pantryNames),
    [visibleRecipes, pantryNames]
  );

  const perfect = useMemo(
    () => ranked.filter((m) => m.pct >= 100 - 1e-6),
    [ranked]
  );

  const close = useMemo(
    () => ranked.filter((m) => m.pct >= 50 && m.pct < 100 - 1e-6),
    [ranked]
  );

  const navigateToRecipe = useCallback(
    (recipe: Recipe) => {
      router.push({
        pathname: '/recipe/[id]',
        params: {
          id: recipe.id,
          fromPantryMatch: '1',
          pantry: JSON.stringify(pantryNames),
        },
      });
    },
    [router, pantryNames]
  );

  if (loading) {
    return <LoadingScreen message="Finding matches..." />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: Colors.surfaceElevated },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
            <Text style={[styles.backLabel, { color: Colors.textPrimary }]} numberOfLines={1}>
              Back to Pantry
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        <Text style={[styles.sub, { color: Colors.textMuted }]}>
          {pantryNames.length} item{pantryNames.length === 1 ? '' : 's'} in your pantry · ranked by match
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <View style={[styles.bar, { backgroundColor: Colors.success }]} />
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>
              You can make these right now
            </Text>
          </View>
          {perfect.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
                No perfect matches yet — add more to your pantry!
              </Text>
            </View>
          ) : (
            <MatchCarousel
              matches={perfect}
              onNavigate={navigateToRecipe}
              onFavoriteToggle={toggleFavorite}
              cardWidth={carouselCardW}
              snapInterval={carouselSnap}
              badgeFor="none"
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <View style={[styles.bar, { backgroundColor: Colors.warning }]} />
            <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>
              {"You're almost there"}
            </Text>
          </View>
          {close.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
              <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>
                No close matches at 50% or higher. Stock a few more staples!
              </Text>
            </View>
          ) : (
            <MatchCarousel
              matches={close}
              onNavigate={navigateToRecipe}
              onFavoriteToggle={toggleFavorite}
              cardWidth={carouselCardW}
              snapInterval={carouselSnap}
              badgeFor="close"
            />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollInner: {
      flexGrow: 1,
      paddingBottom: 8,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '88%',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 14,
    },
    backLabel: {
      fontSize: 15,
      fontWeight: '700',
      flexShrink: 1,
    },
    sub: {
      fontSize: 13,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    section: {
      marginBottom: 8,
    },
    sectionHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 12,
      gap: 10,
    },
    bar: {
      width: 4,
      height: 22,
      borderRadius: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      flex: 1,
    },
    carouselContent: {
      paddingHorizontal: 20,
      gap: CAROUSEL_GAP,
    },
    emptyCard: {
      marginHorizontal: 20,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
    },
    emptyText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
