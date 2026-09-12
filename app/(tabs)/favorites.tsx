import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { RecipeCard } from '@/components/RecipeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Recipe } from '@/lib/types';
import { useIsTablet } from '@/hooks/useIsTablet';
import { supabase } from '@/lib/supabase';

export default function FavoritesScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { width: SCREEN_W } = useWindowDimensions();
  const isTablet = useIsTablet();
  const numColumns = isTablet ? 2 : 1;
  const gap = 12;
  const pad = 20;
  const ITEM_W =
    numColumns === 2 ? (SCREEN_W - pad * 2 - gap) / 2 : SCREEN_W - pad * 2;

  const { userId } = useSession();
  const { preferences } = usePreferences(userId);
  const { loading, visibleRecipes, toggleFavorite, refresh } = useRecipes(
    userId,
    preferences
  );

  const favorites = useMemo(
    () => visibleRecipes.filter((r) => r.is_favorited),
    [visibleRecipes]
  );

  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [myLoading, setMyLoading] = useState(false);

  const favsKey = userId ? `favs:${userId}` : null;

  const loadMyRecipes = useCallback(async () => {
    if (!userId) {
      setMyRecipes([]);
      return;
    }
    setMyLoading(true);
    try {
      const runQuery = () =>
        supabase
          .from('recipes')
          .select('*')
          .eq('is_user_created', true)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

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
      const favSet = new Set(favIds);

      if (res.error) {
        setMyRecipes([]);
        return;
      }

      const rows = (res.data ?? []) as Recipe[];
      setMyRecipes(
        rows.map((r) => ({
          ...r,
          is_favorited: favSet.has(r.id),
        }))
      );
    } catch {
      setMyRecipes([]);
    } finally {
      setMyLoading(false);
    }
  }, [userId, favsKey]);

  useFocusEffect(
    useCallback(() => {
      loadMyRecipes();
      refresh();
    }, [loadMyRecipes, refresh])
  );

  if (loading) return <LoadingScreen message="Loading your saved recipes..." />;

  const mySection = (
    <View style={styles.mySection}>
      <Text style={styles.sectionTitle}>My Recipes</Text>
      {myLoading ? (
        <ActivityIndicator
          color={Colors.accent}
          style={{ marginVertical: 16 }}
        />
      ) : myRecipes.length === 0 ? (
        <Text style={styles.myEmpty}>
          Recipes you create will appear here
        </Text>
      ) : (
        <View
          style={[
            styles.myGrid,
            isTablet && styles.myGridTablet,
          ]}
        >
          {myRecipes.map((item) => (
            <RecipeCard
              key={item.id}
              recipe={item}
              onFavoriteToggle={toggleFavorite}
              style={{
                width: ITEM_W,
                height: ITEM_W * 1.25,
                marginBottom: gap,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );

  const savedHeader = (
    <View style={styles.savedHeader}>
      <Text style={styles.sectionTitle}>Saved</Text>
      <Text style={styles.subtitle}>
        {favorites.length} recipe{favorites.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const catalogEmpty = (
    <View style={styles.catalogEmpty}>
      <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.catalogEmptyTitle}>Nothing saved yet</Text>
      <Text style={styles.catalogEmptyBody}>
        Tap the heart on any recipe to save it here for quick access.
      </Text>
    </View>
  );

  const fullEmpty =
    favorites.length === 0 && myRecipes.length === 0 && !myLoading;

  if (fullEmpty) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.screenFill]} edges={['top']}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Saved Recipes</Text>
        </View>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[styles.scrollPad, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
        >
          {mySection}
          {savedHeader}
          {catalogEmpty}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, styles.screenFill]} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.title}>Saved Recipes</Text>
      </View>

      <FlatList
        key={isTablet ? 'tablet' : 'phone'}
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={[styles.grid, { flexGrow: 1 }]}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {mySection}
            {savedHeader}
          </>
        }
        ListEmptyComponent={favorites.length === 0 ? catalogEmpty : null}
        renderItem={({ item }: { item: Recipe }) => (
          <RecipeCard
            recipe={item}
            onFavoriteToggle={toggleFavorite}
            style={{ width: ITEM_W, height: ITEM_W * 1.25, marginRight: 0 }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    screenFill: {
      width: '100%',
      alignSelf: 'stretch',
    },
    pageHeader: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    scrollPad: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionTitle: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginBottom: 10,
    },
    savedHeader: {
      marginTop: 8,
      marginBottom: 12,
    },
    subtitle: {
      color: Colors.textSecondary,
      fontSize: 14,
      marginTop: 2,
      fontWeight: '500',
    },
    mySection: {
      marginBottom: 8,
    },
    myEmpty: {
      color: Colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      paddingVertical: 4,
    },
    myGrid: {
      flexDirection: 'column',
    },
    myGridTablet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 12,
    },
    grid: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 12,
    },
    row: {
      gap: 12,
    },
    catalogEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 32,
      gap: 10,
    },
    catalogEmptyTitle: {
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    catalogEmptyBody: {
      color: Colors.textSecondary,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
}
