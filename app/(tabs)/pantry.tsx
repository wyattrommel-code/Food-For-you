import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import {
  PRESET_PANTRY_BY_CATEGORY,
  ALL_PRESET_ITEMS,
  isPresetName,
  type PantryItem,
} from '@/lib/pantry';
import { useUserPantry } from '@/hooks/useUserPantry';

function pantryHasName(pantryNames: string[], name: string): boolean {
  const l = name.trim().toLowerCase();
  return pantryNames.some((n) => n.trim().toLowerCase() === l);
}

export default function PantryScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pantryNames, load, toggleName, removeName, clearAll, addCustom } =
    useUserPantry();

  const [search, setSearch] = useState('');
  const [customDraft, setCustomDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const q = search.trim().toLowerCase();

  const customInPantry = useMemo(
    () => pantryNames.filter((n) => !isPresetName(n)),
    [pantryNames]
  );

  const filteredCustom = useMemo(() => {
    if (!q) return customInPantry;
    return customInPantry.filter((n) => n.toLowerCase().includes(q));
  }, [customInPantry, q]);

  const presetSections = useMemo(() => {
    return PRESET_PANTRY_BY_CATEGORY.map((sec) => ({
      title: sec.title,
      data: sec.data.filter(
        (item) => !q || item.name.toLowerCase().includes(q)
      ),
    })).filter((s) => s.data.length > 0);
  }, [q]);

  const sections = useMemo(() => {
    const out: { title: string; data: PantryItem[] }[] = [];
    if (filteredCustom.length > 0) {
      out.push({
        title: 'Custom',
        data: filteredCustom.map((name) => ({
          name,
          category: 'Custom',
          isCustom: true,
        })),
      });
    }
    for (const s of presetSections) {
      out.push(s);
    }
    return out;
  }, [filteredCustom, presetSections]);

  const onAddCustom = useCallback(() => {
    const t = customDraft.trim();
    if (!t) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCustom(t);
    setCustomDraft('');
  }, [customDraft, addCustom]);

  const header = (
    <>
      <Text style={styles.screenTitle}>My Pantry</Text>

      <View style={styles.pantryRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {pantryNames.length === 0 ? (
            <Text style={styles.emptyChips}>Nothing saved yet — pick items below</Text>
          ) : (
            pantryNames.map((name) => (
              <View key={name} style={[styles.chip, { borderColor: Colors.border }]}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    removeName(name);
                  }}
                  hitSlop={8}
                  style={styles.chipX}
                >
                  <Ionicons name="close" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
        {pantryNames.length > 0 ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              clearAll();
            }}
            style={styles.clearAllBtn}
          >
            <Text style={[styles.clearAllText, { color: Colors.accent }]}>Clear All</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.searchWrap, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: Colors.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search ingredients..."
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const renderItem = useCallback(
    ({ item }: { item: PantryItem }) => {
      const checked = pantryHasName(pantryNames, item.name);
      return (
        <Pressable
          style={({ pressed }) => [
            styles.row,
            { borderColor: Colors.border, backgroundColor: Colors.surface },
            pressed && { opacity: 0.88 },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            toggleName(item.name);
          }}
        >
          <Ionicons
            name={checked ? 'checkbox' : 'square-outline'}
            size={22}
            color={checked ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.rowLabel, { color: Colors.textPrimary }]}>
            {item.name}
          </Text>
        </Pressable>
      );
    },
    [pantryNames, toggleName, Colors]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHead, { backgroundColor: Colors.background }]}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>
          {section.title}
        </Text>
      </View>
    ),
    [Colors]
  );

  const footer = (
    <View style={styles.footerBlock}>
      <Text style={[styles.addCustomLabel, { color: Colors.textMuted }]}>
        Add custom ingredient
      </Text>
      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.addInput,
            {
              color: Colors.textPrimary,
              borderColor: Colors.border,
              backgroundColor: Colors.surfaceElevated,
            },
          ]}
          value={customDraft}
          onChangeText={setCustomDraft}
          placeholder="e.g. maple syrup"
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={onAddCustom}
          returnKeyType="done"
        />
        <Pressable
          onPress={onAddCustom}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: Colors.accent },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <Text style={[styles.presetHint, { color: Colors.textMuted }]}>
        {ALL_PRESET_ITEMS.length} staples in the list — tap to toggle
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors.background }]} edges={['top']}>
      <SectionList
        style={styles.sectionList}
        sections={sections}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <Text style={[styles.emptySearch, { color: Colors.textMuted }]}>
            {q
              ? `No ingredients match “${search.trim()}”.`
              : 'No ingredients to show.'}
          </Text>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: Colors.background,
            borderTopColor: Colors.border,
            paddingBottom: Math.max(16, insets.bottom),
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/pantry-match' as never);
          }}
          style={({ pressed }) => [
            styles.findBtn,
            { backgroundColor: Colors.accent },
            pressed && { opacity: 0.92 },
          ]}
        >
          <Ionicons name="restaurant" size={20} color="#fff" />
          <Text style={styles.findBtnText}>Find Recipes With What I Have</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(Colors: AppColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    sectionList: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 24,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: Colors.textPrimary,
      marginBottom: 16,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    pantryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      paddingLeft: 20,
      gap: 8,
    },
    chipsScroll: {
      flex: 1,
      maxHeight: 44,
    },
    chipsContent: {
      alignItems: 'center',
      paddingRight: 12,
      gap: 8,
    },
    emptyChips: {
      fontSize: 13,
      color: Colors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 200,
      borderWidth: 1,
      borderRadius: 20,
      paddingLeft: 12,
      paddingVertical: 8,
      paddingRight: 6,
      gap: 4,
      backgroundColor: Colors.surface,
    },
    chipText: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '600',
      color: Colors.textPrimary,
    },
    chipX: {
      padding: 2,
    },
    clearAllBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    clearAllText: {
      fontSize: 13,
      fontWeight: '700',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 12,
      height: 46,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 0,
    },
    sectionHead: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    footerBlock: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
    },
    addCustomLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 46,
      fontSize: 15,
    },
    addBtn: {
      paddingHorizontal: 20,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 15,
    },
    presetHint: {
      marginTop: 12,
      fontSize: 12,
    },
    emptySearch: {
      textAlign: 'center',
      paddingHorizontal: 32,
      paddingVertical: 24,
      fontSize: 15,
      fontWeight: '500',
    },
    bottomBar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    findBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 52,
      borderRadius: 16,
    },
    findBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
  });
}
