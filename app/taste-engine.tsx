import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { usePreferences } from '@/hooks/usePreferences';
import { TagChip } from '@/components/TagChip';
import { LoadingScreen } from '@/components/LoadingScreen';

// ─── Quick-add suggestion pills ──────────────────────────────
const SUGGESTED_INGREDIENTS = [
  'shellfish', 'peanuts', 'gluten', 'dairy', 'eggs',
  'mushrooms', 'cilantro', 'olives', 'anchovies', 'lamb',
];

const SUGGESTED_CUISINES = [
  'Thai', 'Indian', 'Mexican', 'Italian', 'Korean',
  'Middle Eastern', 'Japanese', 'Chinese', 'American', 'French',
];

// ─── Inline text input with add button ───────────────────────
interface AddInputProps {
  placeholder:  string;
  onAdd:        (value: string) => void;
  accentColor:  string;
}

function AddInput({ placeholder, onAdd, accentColor }: AddInputProps) {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeStyles(Colors), [Colors]);

  const [text, setText] = useState('');
  const inputRef        = useRef<TextInput>(null);

  const handleAdd = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(trimmed);
    setText('');
    inputRef.current?.focus();
  }, [text, onAdd]);

  return (
    <View style={[styles.addRow, { borderColor: accentColor + '40' }]}>
      <TextInput
        ref={inputRef}
        style={styles.addInput}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={[styles.addBtn, { backgroundColor: accentColor }]}
        onPress={handleAdd}
      >
        <Ionicons name="add" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── A single preference section card ────────────────────────
interface PrefSectionProps {
  icon:           React.ComponentProps<typeof Ionicons>['name'];
  title:          string;
  description:    string;
  tags:           string[];
  onRemove:       (tag: string) => void;
  onAdd:          (tag: string) => void;
  suggestions?:   string[];
  variant:        'dislike' | 'like';
  addPlaceholder: string;
}

function PrefSection({
  icon, title, description, tags,
  onRemove, onAdd, suggestions, variant, addPlaceholder,
}: PrefSectionProps) {
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeStyles(Colors), [Colors]);

  const accentColor = variant === 'dislike' ? '#FF3A2D' : Colors.success;

  const filteredSuggestions = suggestions?.filter(
    (s) => !tags.includes(s.toLowerCase())
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconBg, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={icon} size={20} color={accentColor} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDesc}>{description}</Text>
        </View>
      </View>

      {tags.length > 0 && (
        <View style={styles.tagsWrap}>
          {tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              variant={variant}
              onRemove={() => onRemove(tag)}
            />
          ))}
        </View>
      )}

      <AddInput
        placeholder={addPlaceholder}
        onAdd={onAdd}
        accentColor={accentColor}
      />

      {filteredSuggestions && filteredSuggestions.length > 0 && (
        <View>
          <Text style={styles.suggestLabel}>Quick add:</Text>
          <View style={styles.suggestRow}>
            {filteredSuggestions.slice(0, 6).map((s) => (
              <Pressable
                key={s}
                style={styles.suggestPill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAdd(s);
                }}
              >
                <Text style={styles.suggestText}>+ {s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Taste Engine Screen ──────────────────────────────────────
export default function TasteEngineScreen() {
  const router     = useRouter();
  const { Colors } = useTheme();
  const styles     = useMemo(() => makeStyles(Colors), [Colors]);

  const { userId } = useSession();
  const {
    preferences,
    loading,
    syncing,
    syncError,
    addDislikedIngredient,
    removeDislikedIngredient,
    addDislikedCuisine,
    removeDislikedCuisine,
    addLikedIngredient,
    removeLikedIngredient,
    addLikedCuisine,
    removeLikedCuisine,
  } = usePreferences(userId);

  if (loading) return <LoadingScreen message="Loading your Taste Engine..." />;

  return (
    <SafeAreaView style={[styles.safeArea, styles.screenFill]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.kavFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top nav bar ───────────────────────────────────── */}
        <View style={styles.navBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.navTitle}>Food Preferences</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Subtitle ────────────────────────────────────── */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageSubtitle}>
              Tell us what you love and what to hide — the app learns your palate.
            </Text>
          </View>

          {/* ── Banner ──────────────────────────────────────── */}
          <View style={styles.banner}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.accent} />
            <Text style={styles.bannerText}>
              Disliked items are{' '}
              <Text style={{ color: Colors.accent, fontWeight: '700' }}>strictly banned</Text>
              {' '}— those recipes will never appear.
            </Text>
          </View>

          {/* ── DISLIKES ────────────────────────────────────── */}
          <Text style={styles.groupLabel}>🚫 HIDE FROM ME</Text>

          <PrefSection
            icon="ban-outline"
            title="Disliked Ingredients"
            description="Recipes containing ANY of these will be completely hidden."
            tags={preferences.disliked_ingredients}
            onRemove={removeDislikedIngredient}
            onAdd={addDislikedIngredient}
            suggestions={SUGGESTED_INGREDIENTS}
            variant="dislike"
            addPlaceholder="e.g. shellfish, peanuts, cilantro..."
          />

          <PrefSection
            icon="globe-outline"
            title="Disliked Cuisines"
            description="Entire cuisine styles you want removed from the app."
            tags={preferences.disliked_cuisines}
            onRemove={removeDislikedCuisine}
            onAdd={addDislikedCuisine}
            suggestions={SUGGESTED_CUISINES}
            variant="dislike"
            addPlaceholder="e.g. Thai, Indian, Mexican..."
          />

          {/* ── LIKES ───────────────────────────────────────── */}
          <Text style={[styles.groupLabel, { marginTop: 32 }]}>💚 SHOW ME MORE OF THIS</Text>

          <PrefSection
            icon="heart-outline"
            title="Loved Ingredients"
            description="Recipes with these ingredients will be prioritized in recommendations and the RNG."
            tags={preferences.liked_ingredients}
            onRemove={removeLikedIngredient}
            onAdd={addLikedIngredient}
            suggestions={['garlic', 'chicken', 'lemon', 'pasta', 'avocado', 'salmon', 'beef', 'spinach', 'cheese', 'ginger']}
            variant="like"
            addPlaceholder="e.g. garlic, salmon, avocado..."
          />

          <PrefSection
            icon="restaurant-outline"
            title="Loved Cuisines"
            description="Your favorite cuisine styles are heavily weighted in the RNG selection."
            tags={preferences.liked_cuisines}
            onRemove={removeLikedCuisine}
            onAdd={addLikedCuisine}
            suggestions={SUGGESTED_CUISINES}
            variant="like"
            addPlaceholder="e.g. Italian, Korean, Hawaiian..."
          />

          {/* Cloud sync status */}
          <View style={styles.bottomNote}>
            {syncError ? (
              <>
                <Ionicons name="cloud-offline-outline" size={15} color="#FF3A2D" />
                <Text style={[styles.bottomNoteText, { color: '#FF3A2D' }]}>
                  Offline — saved locally
                </Text>
              </>
            ) : syncing ? (
              <>
                <Ionicons name="cloud-upload-outline" size={15} color={Colors.accent} />
                <Text style={[styles.bottomNoteText, { color: Colors.accent }]}>
                  Saving to cloud…
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
                <Text style={[styles.bottomNoteText, { color: Colors.success }]}>
                  Synced to your account
                </Text>
              </>
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
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
    kavFill: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    scroll: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollContent: {
      flexGrow: 1,
    },

    // ── Nav bar ──────────────────────────────────────────────
    navBar: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      color:         Colors.textPrimary,
      fontSize:      18,
      fontWeight:    '800',
      letterSpacing: -0.3,
    },

    pageHeader: {
      paddingHorizontal: 20,
      paddingTop:        16,
      paddingBottom:     16,
    },
    pageSubtitle: {
      color:      Colors.textSecondary,
      fontSize:   14,
      lineHeight: 20,
      fontWeight: '500',
    },

    banner: {
      flexDirection:   'row',
      alignItems:      'flex-start',
      gap:             10,
      backgroundColor: Colors.accentSoft,
      marginHorizontal: 20,
      borderRadius:    12,
      padding:         14,
      marginBottom:    24,
      borderWidth:     1,
      borderColor:     Colors.accent + '30',
    },
    bannerText: {
      color:      Colors.textSecondary,
      fontSize:   13,
      lineHeight: 18,
      flex:       1,
    },
    groupLabel: {
      color:          Colors.textMuted,
      fontSize:       11,
      fontWeight:     '800',
      letterSpacing:  1.2,
      textTransform:  'uppercase',
      paddingHorizontal: 20,
      marginBottom:   12,
    },
    section: {
      marginHorizontal: 20,
      backgroundColor:  Colors.surface,
      borderRadius:     18,
      padding:          18,
      marginBottom:     12,
      borderWidth:      1,
      borderColor:      Colors.border,
      gap:              14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems:    'flex-start',
      gap:           12,
    },
    iconBg: {
      width:          38,
      height:         38,
      borderRadius:   10,
      alignItems:     'center',
      justifyContent: 'center',
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      color:      Colors.textPrimary,
      fontSize:   16,
      fontWeight: '700',
    },
    sectionDesc: {
      color:      Colors.textSecondary,
      fontSize:   12,
      lineHeight: 17,
      marginTop:  3,
    },
    tagsWrap: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           8,
    },
    addRow: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            10,
      backgroundColor: Colors.surfaceElevated,
      borderRadius:   12,
      borderWidth:    1,
      paddingLeft:    14,
      paddingRight:   6,
      paddingVertical: 6,
    },
    addInput: {
      flex:       1,
      color:      Colors.textPrimary,
      fontSize:   14,
      fontWeight: '500',
      paddingVertical: 6,
    },
    addBtn: {
      width:          36,
      height:         36,
      borderRadius:   9,
      alignItems:     'center',
      justifyContent: 'center',
    },
    suggestLabel: {
      color:        Colors.textMuted,
      fontSize:     11,
      fontWeight:   '600',
      marginBottom: 8,
    },
    suggestRow: {
      flexDirection: 'row',
      flexWrap:      'wrap',
      gap:           8,
    },
    suggestPill: {
      backgroundColor: Colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius:    20,
      borderWidth:     1,
      borderColor:     Colors.border,
    },
    suggestText: {
      color:         Colors.textSecondary,
      fontSize:      12,
      fontWeight:    '600',
      textTransform: 'capitalize',
    },
    bottomNote: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            8,
      justifyContent: 'center',
      marginTop:      24,
      paddingHorizontal: 20,
    },
    bottomNoteText: {
      color:      Colors.textMuted,
      fontSize:   12,
      fontWeight: '500',
    },
  });
}
