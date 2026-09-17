import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import {
  getMealTimeForHour,
  MEAL_TIME_META,
  MealTime,
  Recipe,
} from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { supabase } from '@/lib/supabase';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';
import { useRecipes } from '@/hooks/useRecipes';
import {
  RecipeCard,
  CAROUSEL_CARD_WIDTH_PHONE,
  CAROUSEL_CARD_WIDTH_TABLET,
} from '@/components/RecipeCard';
import { SectionHeader } from '@/components/SectionHeader';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useIsLandscape, useIsTablet } from '@/hooks/useIsTablet';
import { RecipeImage } from '@/components/RecipeImage';
import {RecipeDislikeButton} from '@/components/RecipeDislikeButton';
import {QuickPlanButton} from '@/components/QuickPlanButton';
import {CookingForControl} from '@/components/CookingForControl';
import {useCooking} from '@/context/CookingContext';

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDifficulty(score: number): string {
  if (score <= 2) return 'Easy';
  if (score === 3) return 'Moderate';
  return 'Hard';
}

/** Browse screen titles by meal_time (matches carousel "See all" destinations). */
const BROWSE_SECTION_TITLE: Record<MealTime, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snacks',
  dessert:   'Desserts & Sweets',
  smoothie: 'Smoothies & Shakes',
  sides:     'Side Dishes',
};

// ─── Home Recipe Card ─────────────────────────────────────────
function HomeRecipeCard({
  recipe,
  onFavoriteToggle,
  cardWidth,
}: {
  recipe: Recipe;
  onFavoriteToggle: (id: string) => void;
  cardWidth: number;
}) {
  const router     = useRouter();
  const { Colors } = useTheme();
  const hcard      = useMemo(() => makeHcard(Colors, cardWidth), [Colors, cardWidth]);

  const difficulty = getDifficulty(recipe.effort_score);
  const diffColor  =
    recipe.effort_score <= 2 ? Colors.success
    : recipe.effort_score === 3 ? Colors.warning
    : Colors.accent;
  const homePlaceholderIcon = Math.max(28, Math.min(52, Math.round(cardWidth * 0.24)));

  return (
    <Pressable
      style={hcard.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/recipe/${recipe.id}`);
      }}
      android_ripple={{ color: Colors.overlayLight }}
    >
      <RecipeImage url={recipe.image_url} style={hcard.image} iconSize={homePlaceholderIcon} accessibilityLabel={recipe.title} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.88)']}
        style={hcard.gradient}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
      />

      <QuickPlanButton recipe={recipe} overlay/>
      <RecipeDislikeButton recipe={recipe} overlay/>
      {/* Fav button */}
      <Pressable
        style={hcard.favBtn}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`${recipe.is_favorited ? 'Unsave' : 'Save'} ${recipe.title}`}
        onPress={(event) => {
          event.stopPropagation();
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
  compact,
  onSeeAll,
  hideSeeAll,
}: {
  title:        string;
  accentColor:  string;
  rightAction?: React.ReactNode;
  compact?:     boolean;
  onSeeAll?:    () => void;
  hideSeeAll?:  boolean;
}) {
  const { Colors } = useTheme();
  const {width,fontScale}=useWindowDimensions();
  const stacked=width<350 || fontScale>1.3;
  const sh = useMemo(() => makeSh(Colors, compact), [Colors, compact]);

  return (
    <View style={[sh.row,stacked && {flexWrap:'wrap'}]}>
      <View style={{flexDirection:'row',alignItems:'center',gap:10,flex:stacked?undefined:1,width:stacked?'100%':undefined,minWidth:0}}>
        <View style={[sh.bar, { backgroundColor: accentColor,flexShrink:0 }]} />
        <Text style={[sh.title,{flex:1,minWidth:0}]}>{title}</Text>
      </View>
      {rightAction ??
        (!hideSeeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            style={{minHeight:44,justifyContent:'center',flexShrink:0}}
            hitSlop={4}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSeeAll?.();
            }}
          >
            <Text style={sh.seeAll}>See all →</Text>
          </Pressable>
        ) : null)}
    </View>
  );
}

// ─── Horizontal carousel ─────────────────────────────────────
function HCarousel({
  recipes,
  onFavoriteToggle,
  cardWidth,
  snapInterval,
}: {
  recipes:          Recipe[];
  onFavoriteToggle: (id: string) => void;
  cardWidth:        number;
  snapInterval:     number;
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
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={3}
      getItemLayout={(_,index)=>({length:snapInterval,offset:20+snapInterval*index,index})}
      data={recipes}
      keyExtractor={(r) => r.id}
      showsHorizontalScrollIndicator={false}
      style={{ width: '100%' }}
      contentContainerStyle={[styles.carouselContent, { flexGrow: 1 }]}
      snapToInterval={snapInterval}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <HomeRecipeCard
          recipe={item}
          onFavoriteToggle={onFavoriteToggle}
          cardWidth={cardWidth}
        />
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
      <View style={{flexDirection:'row',alignItems:'stretch',gap:8}}><View style={[styles.searchRow,{flex:1,minWidth:0}]}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel="Search recipes, ingredients..."
          placeholder="Search recipes…"
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
      </View><CookingForControl compact/></View>
    </View>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────
export default function HomeScreen() {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeMainStyles(Colors), [Colors]);
  const router     = useRouter();
  const { width: winW } = useWindowDimensions();
  const isTablet   = useIsTablet();
  const isLandscape = useIsLandscape();
  const useThreeActionColumns = isTablet || isLandscape;

  const carouselGap = 14;
  const carouselHPad = 40;
  const { carouselCardW, carouselSnap } = useMemo(() => {
    if (isLandscape) {
      const raw = Math.floor((winW - carouselHPad - carouselGap * 2) / 3);
      const w = Math.max(130, Math.min(raw, CAROUSEL_CARD_WIDTH_TABLET));
      return { carouselCardW: w, carouselSnap: w + carouselGap };
    }
    const w = isTablet ? CAROUSEL_CARD_WIDTH_TABLET : CAROUSEL_CARD_WIDTH_PHONE;
    return { carouselCardW: w, carouselSnap: w + carouselGap };
  }, [isLandscape, isTablet, winW]);

  const { userId } = useSession();
  const { preferences, refresh: refreshPreferences } = usePreferences(userId);
  const cooking=useCooking();

  // ── Profile avatar ────────────────────────────────────────
  const [profile, setProfile] = useState<{ name: string | null; avatarUrl: string | null }>({
    name: null, avatarUrl: null,
  });
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('users')
      .select('name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (data) setProfile({ name: data.name ?? null, avatarUrl: data.avatar_url ?? null });
  }, [userId]);

  const {
    loading,
    visibleRecipes,
    refreshing,
    error,
    toggleFavorite,
    refresh,
  } = useRecipes(userId, preferences,cooking);
  const {getCarouselRecipes,reroll} = useDiscoveryFeed(visibleRecipes,userId,JSON.stringify([preferences,cooking.key,cooking.profiles]));
  const refreshFeed = useCallback(async () => {
    reroll();
    await refresh();
  }, [reroll,refresh]);

  useFocusEffect(
    useCallback(() => {
      refreshPreferences();
      fetchProfile();
    }, [refreshPreferences, fetchProfile])
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

  // ── Derived recipe lists ──────────────────────────────────
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
  const sidesRecipes = useMemo(
    () => getCarouselRecipes('sides'),
    [getCarouselRecipes]
  );
  const dessertRecipes = useMemo(
    () => getCarouselRecipes('dessert'),
    [getCarouselRecipes]
  );
  const smoothieRecipes = useMemo(
    () => getCarouselRecipes('smoothie'),
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
    snack:   [],
    dessert: [],
    sides:   [],
    smoothie: [],
  };

  const openChoices = useCallback((mode: 'hungryNow'|'sweetTreat'|'pickForMe'|'feelingBold') => {
    router.push({pathname:'/meal-choices',params:{mode}} as Href);
  },[router]);
  const sweetButton = <Pressable accessibilityRole="button" accessibilityLabel="I need a sweet treat" onPress={()=>openChoices('sweetTreat')} style={{minHeight:48,padding:12,justifyContent:'center',borderRadius:16,borderWidth:1,borderColor:Colors.dessert,backgroundColor:Colors.surface,marginVertical:8}}>
    <Text style={{color:Colors.textPrimary,fontSize:17,fontWeight:'700'}}>I need a sweet treat</Text>
  </Pressable>;

  const handleCookWhatIHave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/pantry' as never);
  }, [router]);

  if (loading) {
    return <LoadingScreen message="Loading your personalized menu..." />;
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting(hour)}
            </Text>
            <Text style={styles.greetingSub}>What are we eating today?</Text>
          </View>
          <Pressable
            style={styles.avatarRing}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/settings');
            }}
            hitSlop={6}
          >
            <View style={styles.avatarInner}>
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : profile.name ? (
                <Text style={styles.avatarInitials}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={20} color="#fff" />
              )}
            </View>
          </Pressable>
        </View>

        {/* ── Search bar ──────────────────────────────────── */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        <View style={{paddingHorizontal:20,marginTop:10,alignItems:'flex-start'}}>
          {!!cooking.message&&<Text accessibilityRole="alert" style={{color:Colors.textSecondary,lineHeight:20}}>{cooking.message}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh meal ideas" onPress={refreshFeed} disabled={refreshing} style={{minHeight:44,justifyContent:'center',paddingHorizontal:4}}>
            <Text style={{color:Colors.accent,fontWeight:'700'}}>{refreshing?'Refreshing…':'↻ New meal ideas'}</Text>
          </Pressable>
          {error && <Text accessibilityRole="alert" style={{color:Colors.textSecondary}}>{visibleRecipes.length?'Could not update the catalog. Showing fresh picks from loaded recipes.':'Could not load recipes. Tap New meal ideas to retry.'}</Text>}
        </View>
        {/* ── Action buttons ──────────────────────────────── */}
        <View style={[styles.buttonsWrap, isLandscape && styles.buttonsWrapLandscape]}>
          {useThreeActionColumns ? (
            <>
              <View style={styles.tabletActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabletActionCell,
                    styles.tabletHungryBtn,
                    isLandscape && styles.tabletHungryBtnLandscape,
                    pressed && styles.bigBtnPressed,
                  ]}
                  accessibilityRole="button" accessibilityLabel="I'm Hungry Now" onPress={()=>openChoices('hungryNow')}
                >
                  <Text style={styles.tabletHungryTitle}>I'm Hungry Now</Text>
                  <Text style={styles.tabletHungrySub}>30 min or less · 3 picks</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabletActionCell,
                    styles.secondBtn,
                    pressed && styles.secondBtnPressed,
                  ]}
                  accessibilityRole="button" accessibilityLabel="Pick For Me" onPress={()=>openChoices('pickForMe')}
                >
                  <Text style={styles.secondTitle}>Pick For Me</Text>
                  <Text style={styles.secondSub}>One perfect dish</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.tabletActionCell,
                    styles.secondBtn,
                    pressed && styles.secondBtnPressed,
                  ]}
                  accessibilityRole="button" accessibilityLabel="Feeling Bold" onPress={()=>openChoices('feelingBold')}
                >
                  <Text style={styles.secondTitle}>Feeling Bold</Text>
                  <Text style={styles.secondSub}>Challenge · 3 picks</Text>
                </Pressable>
              </View>
              {sweetButton}
              <Pressable
                style={({ pressed }) => [
                  styles.pantryHomeBtn,
                  pressed && styles.pantryHomeBtnPressed,
                ]}
                onPress={handleCookWhatIHave}
              >
                <View style={styles.pantryHomeTextCol}>
                  <Text style={styles.pantryHomeTitle}>Cook What I Have</Text>
                  <Text style={styles.pantryHomeSub}>Match recipes to your pantry</Text>
                </View>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.bigBtn,
                  pressed && styles.bigBtnPressed,
                ]}
                accessibilityRole="button" accessibilityLabel="I'm Hungry Now" onPress={()=>openChoices('hungryNow')}
              >
                <View style={styles.bigBtnLeft}>
                  <Text style={styles.bigBtnTitle}>I'm Hungry Now</Text>
                  <Text style={styles.bigBtnSub}>30 min or less · 3 picks</Text>
                </View>
              </Pressable>

              {sweetButton}
              <View style={styles.secondaryRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondBtn,
                    pressed && styles.secondBtnPressed,
                  ]}
                  accessibilityRole="button" accessibilityLabel="Pick For Me" onPress={()=>openChoices('pickForMe')}
                >
                  <Text style={styles.secondTitle}>Pick For Me</Text>
                  <Text style={styles.secondSub}>One perfect dish</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondBtn,
                    pressed && styles.secondBtnPressed,
                  ]}
                  accessibilityRole="button" accessibilityLabel="Feeling Bold" onPress={()=>openChoices('feelingBold')}
                >
                  <Text style={styles.secondTitle}>Feeling Bold</Text>
                  <Text style={styles.secondSub}>Challenge · 3 picks</Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.pantryHomeBtn,
                  pressed && styles.pantryHomeBtnPressed,
                ]}
                onPress={handleCookWhatIHave}
              >
                <View style={styles.pantryHomeTextCol}>
                  <Text style={styles.pantryHomeTitle}>Cook What I Have</Text>
                  <Text style={styles.pantryHomeSub}>Match recipes to your pantry</Text>
                </View>
              </Pressable>
            </>
          )}
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
              compact={isLandscape}
              hideSeeAll
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
                cardWidth={carouselCardW}
                snapInterval={carouselSnap}
              />
            )}
          </>
        )}

        {/* ── Default feed — meal-time carousels ────────── */}
        {searchResults === null && (
          <>
            {mealSections.map((mt) => {
              const recipes = carouselMap[mt];
              if (recipes.length === 0) return null;
              const meta = MEAL_TIME_META[mt];
              return (
                <React.Fragment key={mt}>
                  <FeedSectionHeader
                    title={
                      mt === currentMealTime ? meta.greeting : meta.label
                    }
                    accentColor={meta.color}
                    compact={isLandscape}
                    onSeeAll={() =>
                      router.push(
                        `/browse?category=${mt}&title=${encodeURIComponent(BROWSE_SECTION_TITLE[mt])}` as Href
                      )
                    }
                  />
                  <HCarousel
                    recipes={recipes}
                    onFavoriteToggle={toggleFavorite}
                    cardWidth={carouselCardW}
                    snapInterval={carouselSnap}
                  />
                </React.Fragment>
              );
            })}

            {smoothieRecipes.length > 0 && (
              <>
                <FeedSectionHeader
                  title="Smoothies & Shakes"
                  accentColor={Colors.info}
                  compact={isLandscape}
                  onSeeAll={() => router.push('/browse?category=smoothie&title=Smoothies%20%26%20Shakes' as Href)}
                />
                <HCarousel
                  recipes={smoothieRecipes}
                  onFavoriteToggle={toggleFavorite}
                  cardWidth={carouselCardW}
                  snapInterval={carouselSnap}
                />
              </>
            )}

            {snackRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Snacks"
                  accentColor={Colors.snack}
                  onSeeAll={() =>
                    router.push(
                      `/browse?category=snack&title=${encodeURIComponent(BROWSE_SECTION_TITLE.snack)}` as Href
                    )
                  }
                  compact={isLandscape}
                />
                <FlatList
                  horizontal
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={3}
                  getItemLayout={(_,index)=>({length:carouselSnap,offset:20+carouselSnap*index,index})}
                  data={snackRecipes}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={[styles.carouselContent, { flexGrow: 1 }]}
                  snapToInterval={carouselSnap}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <RecipeCard
                      quickPlan
                      recipe={item}
                      onFavoriteToggle={toggleFavorite}
                      carouselWidth={carouselCardW}
                    />
                  )}
                />
              </>
            )}

            {sidesRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Side Dishes"
                  accentColor={Colors.sides}
                  onSeeAll={() =>
                    router.push(
                      `/browse?category=sides&title=${encodeURIComponent(BROWSE_SECTION_TITLE.sides)}` as Href
                    )
                  }
                  compact={isLandscape}
                />
                <FlatList
                  horizontal
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={3}
                  getItemLayout={(_,index)=>({length:carouselSnap,offset:20+carouselSnap*index,index})}
                  data={sidesRecipes}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={[styles.carouselContent, { flexGrow: 1 }]}
                  snapToInterval={carouselSnap}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <RecipeCard
                      quickPlan
                      recipe={item}
                      onFavoriteToggle={toggleFavorite}
                      carouselWidth={carouselCardW}
                    />
                  )}
                />
              </>
            )}

            {dessertRecipes.length > 0 && (
              <>
                <SectionHeader
                  title="Desserts & Sweets"
                  accentColor={Colors.dessert}
                  onSeeAll={() =>
                    router.push(
                      `/browse?category=dessert&title=${encodeURIComponent(BROWSE_SECTION_TITLE.dessert)}` as Href
                    )
                  }
                  compact={isLandscape}
                />
                <FlatList
                  horizontal
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={3}
                  getItemLayout={(_,index)=>({length:carouselSnap,offset:20+carouselSnap*index,index})}
                  data={dessertRecipes}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={[styles.carouselContent, { flexGrow: 1 }]}
                  snapToInterval={carouselSnap}
                  decelerationRate="fast"
                  renderItem={({ item }) => (
                    <RecipeCard
                      quickPlan
                      recipe={item}
                      onFavoriteToggle={toggleFavorite}
                      carouselWidth={carouselCardW}
                    />
                  )}
                />
              </>
            )}
          </>
        )}

        <View style={{ height: isLandscape ? 28 : 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Per-component style factories ───────────────────────────

function makeHcard(Colors: AppColors, cardWidth: number) {
  const cardHeight = cardWidth * 1.18;
  return StyleSheet.create({
    card: {
      width: cardWidth,
      height: cardHeight,
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

function makeSh(Colors: AppColors, compact?: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: compact ? 14 : 28,
      marginBottom: compact ? 8 : 14,
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
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: Colors.background,
    },
    scroll: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollContent: {
      paddingBottom: 24,
      flexGrow: 1,
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
    headerLandscape: {
      paddingTop: 8,
      paddingBottom: 6,
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
    avatarRing: {
      width:        44,
      height:       44,
      borderRadius: 22,
      borderWidth:  2,
      borderColor:  Colors.border,
      marginLeft:   14,
    },
    avatarInner: {
      flex:            1,
      borderRadius:    20,
      overflow:        'hidden',
      backgroundColor: Colors.accent,
      alignItems:      'center',
      justifyContent:  'center',
    },
    avatarImage: {
      width:  '100%',
      height: '100%',
    },
    avatarInitials: {
      color:      '#fff',
      fontSize:   16,
      fontWeight: '800',
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
      minHeight: 58,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
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
    buttonsWrapLandscape: {
      marginTop: 8,
    },
    tabletActionRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    tabletActionCell: {
      flex: 1,
      minWidth: 0,
      borderRadius: 16,
    },
    tabletHungryBtn: {
      backgroundColor: Colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      paddingHorizontal: 10,
      gap: 6,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    },
    tabletHungryBtnLandscape: {
      paddingVertical: 12,
    },
    tabletHungryTitle: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    tabletHungrySub: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
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
    secondBtnPressed: {
      transform: [{ scale: 0.96 }],
      opacity: 0.85,
    },
    secondTitle: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    pantryHomeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginTop: 4,
    },
    pantryHomeBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.985 }],
    },
    pantryHomeTextCol: {
      flex: 1,
      gap: 2,
    },
    pantryHomeTitle: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    pantryHomeSub: {
      color: Colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
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
