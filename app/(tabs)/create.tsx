import {useRecipeCatalog} from '@/context/RecipeCatalogContext';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { MealTime, EffortScore, MEAL_TIME_META } from '@/lib/types';

const SAVE_RED = '#FF3A2D';

const MEAL_TIME_KEYS: MealTime[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'sides',
  'smoothie',
];

const DIFFICULTIES: { label: string; score: EffortScore; color: string }[] = [
  { label: 'Easy', score: 1, color: '#22C55E' },
  { label: 'Moderate', score: 2, color: '#F59E0B' },
  { label: 'Challenge', score: 3, color: '#EF4444' },
];

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

export default function CreateScreen() {
  const catalog=useRecipeCatalog();
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMealTimes, setSelectedMealTimes] = useState<Set<MealTime>>(new Set());
  const {category}=useLocalSearchParams<{category?:string}>();
  useEffect(()=>{if(category==='smoothie')setSelectedMealTimes(previous=>new Set([...previous,'smoothie']));},[category]);
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<EffortScore>(1);
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMounted, setToastMounted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const showToast = useCallback(() => {
    setToastMounted(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setToastMounted(false);
    });
  }, [toastOpacity]);

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
    setSubmitError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const titleTrim = title.trim();
    if (!titleTrim) {
      setSubmitError('Please enter a recipe title.');
      return;
    }

    const ingLines = ingredients.map((s) => s.trim()).filter(Boolean);
    if (ingLines.length < 1) {
      setSubmitError('Add at least one ingredient.');
      return;
    }

    const stepLines = steps.map((s) => s.trim()).filter(Boolean);
    if (stepLines.length < 1) {
      setSubmitError('Add at least one step.');
      return;
    }

    if (selectedMealTimes.size < 1) {
      setSubmitError('Select at least one meal type.');
      return;
    }

    const prepParsed = parseInt(prepTime.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(prepParsed) || prepParsed < 1) {
      setSubmitError('Prep time must be at least 1 minute.');
      return;
    }

    const servParsed = parseInt(servings.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(servParsed) || servParsed < 1) {
      setSubmitError('Servings must be at least 1.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        setSubmitError('Please sign in to save a recipe.');
        setSubmitting(false);
        return;
      }

      const meal_time = [...selectedMealTimes] as MealTime[];

      const { error } = await supabase.from('recipes').insert({
        title: titleTrim,
        description: description.trim() || '',
        meal_time,
        prep_time_mins: prepParsed,
        effort_score: difficulty,
        servings: servParsed,
        ingredients_list: ingLines,
        recipe_steps: stepLines,
        image_url: '',
        shopping_list: [],
        tags: [],
        is_user_created: true,
        user_id: uid,
      });

      if (error) throw error;
      void catalog.invalidate();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast();
      setTimeout(() => {
        router.replace('/(tabs)/favorites');
      }, 1500);

      setTitle('');
      setDescription('');
      setPrepTime('');
      setServings('');
      setSelectedMealTimes(new Set());
      setDifficulty(1);
      setIngredients(['']);
      setSteps(['']);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Something went wrong.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    selectedMealTimes,
    prepTime,
    servings,
    difficulty,
    ingredients,
    steps,
    showToast,
    catalog.invalidate,
  ]);

  return (
    <SafeAreaView style={[styles.safe, styles.screenFill]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>New Recipe</Text>
            <Text style={styles.headerSub}>Save it to your collection</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={[styles.scroll, styles.scrollWide]}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <FormLabel>Recipe title</FormLabel>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Spicy Honey Garlic Chicken"
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FormLabel>Description (optional)</FormLabel>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="A short description of the dish…"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <SectionDivider title="Details" />

          <View style={styles.fieldGroup}>
            <FormLabel>Meal type</FormLabel>
            <View style={styles.chipRow}>
              {MEAL_TIME_KEYS.map((key) => {
                const meta = MEAL_TIME_META[key];
                const active = selectedMealTimes.has(key);
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="checkbox"
                    aria-checked={active}
                    accessibilityLabel={meta.label}
                    accessibilityState={{checked:active}}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleMealTime(key)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, styles.rowFieldGrow]}>
              <FormLabel>Prep time (mins)</FormLabel>
              <TextInput
                style={styles.input}
                value={prepTime}
                onChangeText={(t) => setPrepTime(t.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 30"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={[styles.fieldGroup, styles.rowFieldGrow]}>
              <FormLabel>Servings</FormLabel>
              <TextInput
                style={styles.input}
                value={servings}
                onChangeText={(t) => setServings(t.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 4"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

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
                    <Text style={[styles.difficultyText, active && { color }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <SectionDivider title="Ingredients" />

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
            <AddButton label="Add ingredient" onPress={addIngredient} />
          </View>

          <SectionDivider title="Steps" />

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
            <AddButton label="Add step" onPress={addStep} />
          </View>

          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveRecipeBtn,
              submitting && styles.saveRecipeBtnDisabled,
              pressed && !submitting && styles.saveRecipeBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveRecipeBtnText}>Save Recipe</Text>
            )}
          </Pressable>

          <View style={{ height: 48 }} />
        </ScrollView>

        {toastMounted ? (
          <Animated.View
            style={[styles.toast, { opacity: toastOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.toastText}>Recipe saved!</Text>
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    screenFill: {
      width: '100%',
      alignSelf: 'stretch',
    },
    flex: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },

    header: {
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

    scroll: {
      flex: 1,
    },
    scrollWide: {
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollContent: {
      paddingTop: 8,
    },

    label: {
      color: Colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
    },

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

    rowFields: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    rowFieldGrow: {
      flex: 1,
    },

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

    errorText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '600',
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 4,
    },

    saveRecipeBtn: {
      marginHorizontal: 20,
      marginTop: 20,
      height: 56,
      borderRadius: 16,
      backgroundColor: SAVE_RED,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveRecipeBtnDisabled: {
      opacity: 0.55,
    },
    saveRecipeBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    saveRecipeBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },

    toast: {
      position: 'absolute',
      bottom: 100,
      left: 24,
      right: 24,
      backgroundColor: 'rgba(0,0,0,0.88)',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
    },
    toastText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
