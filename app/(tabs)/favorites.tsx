import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { useRecipes } from '@/hooks/useRecipes';
import { RecipeCard, CARD_WIDTH, CARD_HEIGHT } from '@/components/RecipeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Recipe } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');
const NUM_COLS = 2;
const ITEM_W = (SCREEN_W - 20 * 2 - 12) / 2;

export default function FavoritesScreen() {
  const { userId } = useSession();
  const { preferences } = usePreferences(userId);
  const { loading, visibleRecipes, toggleFavorite } = useRecipes(userId, preferences);

  const favorites = useMemo(
    () => visibleRecipes.filter((r) => r.is_favorited),
    [visibleRecipes]
  );

  if (loading) return <LoadingScreen message="Loading your saved recipes..." />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Recipes</Text>
        <Text style={styles.subtitle}>{favorites.length} recipe{favorites.length !== 1 ? 's' : ''}</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>
            Tap the heart on any recipe to save it here for quick access.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Recipe }) => (
            <RecipeCard
              recipe={item}
              onFavoriteToggle={toggleFavorite}
              style={{ width: ITEM_W, height: ITEM_W * 1.25, marginRight: 0 }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 3,
    fontWeight: '500',
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
