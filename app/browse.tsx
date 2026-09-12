import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import type { DbRecipe, MealTime, Recipe, UserPreferences } from '@/lib/types';
import { isRecipeBanned } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { useIsTablet } from '@/hooks/useIsTablet';
import { RecipeCard } from '@/components/RecipeCard';

const VALID_MEALS: MealTime[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'sides',
];

function paramString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

export default function BrowseScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = useIsTablet();
  const raw = useLocalSearchParams<{ category?: string; title?: string }>();
  const category = paramString(raw.category).toLowerCase() as MealTime;
  const title = paramString(raw.title) || 'Browse';

  const { userId } = useSession();
  const { preferences } = usePreferences(userId);
  const { toggleFavorite } = useRecipes(userId, preferences);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const favsKey = userId ? `favs:${userId}` : null;

  const loadFavSet = useCallback(async (): Promise<Set<string>> => {
    if (!favsKey) return new Set();
    try {
      const rawJson = await AsyncStorage.getItem(favsKey);
      const ids = rawJson ? (JSON.parse(rawJson) as string[]) : [];
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set();
    }
  }, [favsKey]);

  const fetchCategory = useCallback(async () => {
    if (!VALID_MEALS.includes(category)) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const runQuery = () =>
        supabase
          .from('recipes')
          .select('*')
          .eq('is_user_created', false)
          .contains('meal_time', [category])
          .order('title', { ascending: true });

      let res = await runQuery();
      const msg = res.error?.message ?? '';
      const code = (res.error as { code?: string } | null)?.code;
      if (res.error && (code === 'PGRST303' || msg.includes('JWT expired'))) {
        const { data, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && data.session) {
          res = await runQuery();
        } else {
          await supabase.auth.signOut();
          res = await runQuery();
        }
      }

      const favSet = await loadFavSet();
      if (res.error) {
        setRecipes([]);
        return;
      }

      const rows = (res.data ?? []) as DbRecipe[];
      const prefs: UserPreferences = preferences;
      const mapped: Recipe[] = rows
        .filter((r) => !isRecipeBanned(r, prefs))
        .map((r) => ({
          ...r,
          is_favorited: favSet.has(r.id),
        }));

      setRecipes(mapped);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [category, preferences, loadFavSet]);

  useEffect(() => {
    void fetchCategory();
  }, [fetchCategory]);

  const horizontalPad = 20;
  const columnGap = 14;
  const cardWidth = useMemo(() => {
    if (isTablet) {
      return (width - horizontalPad * 2 - columnGap) / 2;
    }
    return width - horizontalPad * 2;
  }, [width, isTablet]);

  const onFavoriteToggle = useCallback(
    (id: string) => {
      void toggleFavorite(id);
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_favorited: !r.is_favorited } : r
        )
      );
    },
    [toggleFavorite]
  );

  const numColumns = isTablet ? 2 : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : !VALID_MEALS.includes(category) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recipes here yet — check back soon!</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recipes here yet — check back soon!</Text>
        </View>
      ) : (
        <>
          <Text style={styles.countLine}>
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            key={numColumns === 2 ? 'grid' : 'list'}
            data={recipes}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={numColumns === 2 ? styles.columnWrap : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.cardCell, { width: cardWidth }]}>
                <RecipeCard
                  recipe={item}
                  carouselWidth={cardWidth}
                  onFavoriteToggle={onFavoriteToggle}
                  style={{ marginRight: 0 }}
                />
              </View>
            )}
          />
        </>
      )}
    </SafeAreaView>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: Colors.background,
      width: '100%',
      alignSelf: 'stretch',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    countLine: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
    },
    columnWrap: {
      gap: 14,
      justifyContent: 'space-between',
    },
    cardCell: {
      alignItems: 'center',
      marginBottom: 14,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyText: {
      color: Colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
