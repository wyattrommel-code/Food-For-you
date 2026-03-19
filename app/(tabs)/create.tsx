import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { MealTime, EffortScore } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────

const MEAL_TIMES: { key: MealTime; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { key: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { key: 'snack',     label: 'Snack',     emoji: '✨' },
];

const DIFFICULTIES: { label: string; score: EffortScore; color: string }[] = [
  { label: 'Easy',   score: 1, color: '#22C55E' },
  { label: 'Medium', score: 3, color: '#F59E0B' },
  { label: 'Hard',   score: 5, color: '#EF4444' },
];

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';

// ─── Sub-components ───────────────────────────────────────────

function FormLabel({ children }: { children: string }) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return <Text style={styles.label}>{children}</Text>;
}

function SectionDivider({ title }: { title: string }) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionDividerLine} />
      <Text style={styles.sectionDividerText}>{title}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  );
}

function DynamicItem({
  value,
  index,
  placeholder,
  onChangeText,
  onRemove,
  multiline = false,
  onSubmitEditing,
}: {
  value: string;
  index: number;
  placeholder: string;
  onChangeText: (text: string) => void;
  onRemove: () => void;
  multiline?: boolean;
  onSubmitEditing?: () => void;
}) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={styles.dynamicItem}>
      <View style={styles.dynamicIndex}>
        <Text style={styles.dynamicIndexText}>{index + 1}</Text>
      </View>
      <TextInput
        style={[styles.dynamicInput, multiline && styles.dynamicInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        returnKeyType={multiline ? 'default' : 'next'}
        blurOnSubmit={!multiline}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
      onPress={onPress}
    >
      <Ionicons name="add" size={16} color={Colors.accent} />
      <Text style={styles.addBtnText}>{label}</Text>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function CreateScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const { userId } = useSession();

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri]       = useState<string | null>(null);
  const [cuisine, setCuisine]         = useState('');
  const [cookTime, setCookTime]       = useState('');

  const [selectedMealTimes, setSelectedMealTimes] = useState<Set<MealTime>>(new Set());
  const [difficulty, setDifficulty]               = useState<EffortScore>(1);

  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps]             = useState<string[]>(['']);
  const [submitting, setSubmitting]   = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const handlePickPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const toggleMealTime = useCallback((key: MealTime) => {
    Haptics.selectionAsync();
    setSelectedMealTimes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const updateIngredient = useCallback((index: number, value: string) => {
    setIngredients((prev) => prev.map((v, i) => (i === index ? value : v)));
  }, []);

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, '']);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) =>
      prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)
    );
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) => prev.map((v, i) => (i === index ? value : v)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, '']);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) =>
      prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in to publish a recipe.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    const finalTitle     = title.trim() || 'Untitled Recipe';
    const finalImage     = photoUri ?? FALLBACK_IMAGE;
    const parsedTime     = parseInt(cookTime, 10);
    const finalCookTime  = isNaN(parsedTime) ? 0 : parsedTime;
    const finalMealTimes =
      selectedMealTimes.size > 0 ? [...selectedMealTimes] : (['dinner'] as MealTime[]);

    try {
      const { error } = await supabase.from('recipes').insert({
        title:                finalTitle,
        description:          description.trim() || null,
        image_url:            finalImage,
        meal_time:            finalMealTimes,
        prep_time_mins:       finalCookTime,
        effort_score:         difficulty,
        cuisine:              cuisine.trim() || null,
        ingredients_list:     ingredients.map((s) => s.trim()).filter(Boolean),
        recipe_steps:         steps.map((s) => s.trim()).filter(Boolean),
        shopping_list:        [],
        tags:                 [],
        is_recipe_of_the_day: false,
        created_by:           userId,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTitle('');
      setDescription('');
      setPhotoUri(null);
      setCuisine('');
      setCookTime('');
      setSelectedMealTimes(new Set());
      setDifficulty(1);
      setIngredients(['']);
      setSteps(['']);

      router.navigate('/(tabs)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Publish failed', msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    userId, title, description, photoUri,
    selectedMealTimes, cookTime, difficulty, cuisine, ingredients, steps,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>New Recipe</Text>
            <Text style={styles.headerSub}>Share something delicious</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.publishBtn,
              submitting && styles.publishBtnDisabled,
              pressed && styles.publishBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={styles.publishBtnText}>Publish</Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Photo picker ─────────────────────────────── */}
          <View style={styles.photoSection}>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Pressable onPress={handlePickPhoto} style={styles.photoPreview}>
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                </Pressable>
                <Pressable
                  style={styles.photoClearBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPhotoUri(null);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.photoEmpty,
                  pressed && styles.photoEmptyPressed,
                ]}
                onPress={handlePickPhoto}
              >
                <View style={styles.photoIconWrap}>
                  <Ionicons name="camera-outline" size={28} color={Colors.accent} />
                </View>
                <Text style={styles.photoEmptyTitle}>📸  Add a Photo</Text>
                <Text style={styles.photoEmptyHint}>
                  Tap to pick from your camera roll
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Title ────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <FormLabel>Recipe Name</FormLabel>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Spicy Honey Garlic Chicken"
              placeholderTextColor={Colors.textMuted}
              maxLength={80}
            />
          </View>

          {/* ── Description ──────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <FormLabel>Description</FormLabel>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="A short, appetising description of the dish…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <SectionDivider title="Details" />

          {/* ── Meal Time chips ───────────────────────────── */}
          <View style={styles.fieldGroup}>
            <FormLabel>Meal Time</FormLabel>
            <View style={styles.chipRow}>
              {MEAL_TIMES.map(({ key, label, emoji }) => {
                const active = selectedMealTimes.has(key);
                return (
                  <Pressable
                    key={key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleMealTime(key)}
                  >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Cook Time + Cuisine ──────────────────────── */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, styles.flex]}>
              <FormLabel>Cook Time (mins)</FormLabel>
              <TextInput
                style={styles.input}
                value={cookTime}
                onChangeText={(t) => setCookTime(t.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 30"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={[styles.fieldGroup, styles.flex]}>
              <FormLabel>Cuisine</FormLabel>
              <TextInput
                style={styles.input}
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Italian, Thai…"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* ── Difficulty ───────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <FormLabel>Difficulty</FormLabel>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map(({ label, score, color }) => {
                const active = difficulty === score;
                return (
                  <Pressable
                    key={score}
                    style={[
                      styles.difficultyBtn,
                      active && {
                        backgroundColor: `${color}20`,
                        borderColor: color,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDifficulty(score);
                    }}
                  >
                    <Text
                      style={[styles.difficultyText, active && { color }]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <SectionDivider title="Ingredients" />

          {/* ── Ingredients ──────────────────────────────── */}
          <View style={styles.dynamicSection}>
            {ingredients.map((value, index) => (
              <DynamicItem
                key={index}
                value={value}
                index={index}
                placeholder="e.g. 2 cloves garlic, minced"
                onChangeText={(t) => updateIngredient(index, t)}
                onRemove={() => removeIngredient(index)}
                onSubmitEditing={addIngredient}
              />
            ))}
            <AddButton label="Add Ingredient" onPress={addIngredient} />
          </View>

          <SectionDivider title="Instructions" />

          {/* ── Steps ────────────────────────────────────── */}
          <View style={styles.dynamicSection}>
            {steps.map((value, index) => (
              <DynamicItem
                key={index}
                value={value}
                index={index}
                placeholder={`Describe step ${index + 1}…`}
                onChangeText={(t) => updateStep(index, t)}
                onRemove={() => removeStep(index)}
                multiline
              />
            ))}
            <AddButton label="Add Step" onPress={addStep} />
          </View>

          {/* ── Bottom publish button ─────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.bottomPublishBtn,
              submitting && styles.publishBtnDisabled,
              pressed && styles.publishBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.bottomPublishBtnText}>Publish Recipe</Text>
              </>
            )}
          </Pressable>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    flex: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: {
      color: Colors.textPrimary,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    headerSub: {
      color: Colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 2,
    },
    publishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: Colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
    },
    publishBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    publishBtnDisabled: {
      opacity: 0.55,
    },
    publishBtnPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.97 }],
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 8,
    },

    // Photo picker
    photoSection: {
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 20,
    },
    photoEmpty: {
      height: 160,
      backgroundColor: Colors.surface,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: Colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    photoEmptyPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.985 }],
    },
    photoIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: Colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    photoEmptyTitle: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    photoEmptyHint: {
      color: Colors.textMuted,
      fontSize: 12,
      fontWeight: '500',
    },
    photoPreviewWrap: {
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
    },
    photoPreview: {
      height: 200,
      width: '100%',
      borderRadius: 20,
      overflow: 'hidden',
    },
    photoImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    photoClearBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
    },

    // Label
    label: {
      color: Colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },

    // Generic field group
    fieldGroup: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    input: {
      backgroundColor: Colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    titleInput: {
      backgroundColor: Colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: Colors.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    textArea: {
      minHeight: 80,
      paddingTop: 13,
      textAlignVertical: 'top',
    },

    // Row layout
    rowFields: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 16,
    },

    // Section divider
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      gap: 12,
      marginTop: 8,
      marginBottom: 16,
    },
    sectionDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.border,
    },
    sectionDividerText: {
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    // Meal time chips
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    chipActive: {
      backgroundColor: Colors.accentSoft,
      borderColor: Colors.accent,
    },
    chipEmoji: {
      fontSize: 13,
    },
    chipText: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    chipTextActive: {
      color: Colors.accent,
    },

    // Difficulty buttons
    difficultyRow: {
      flexDirection: 'row',
      gap: 10,
    },
    difficultyBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      alignItems: 'center',
    },
    difficultyText: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },

    // Dynamic list items
    dynamicSection: {
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 8,
    },
    dynamicItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    dynamicIndex: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    dynamicIndexText: {
      color: Colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    dynamicInput: {
      flex: 1,
      backgroundColor: Colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: '500',
      minHeight: 44,
    },
    dynamicInputMulti: {
      minHeight: 72,
      paddingTop: 10,
      textAlignVertical: 'top',
    },
    removeBtn: {
      marginTop: 12,
    },

    // Add pill button
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.accent,
      backgroundColor: Colors.accentSoft,
      marginTop: 4,
    },
    addBtnPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    addBtnText: {
      color: Colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },

    // Bottom publish
    bottomPublishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 24,
      height: 56,
      borderRadius: 16,
      backgroundColor: Colors.accent,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    bottomPublishBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
}
