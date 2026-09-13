import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ToastAndroid,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useGroceryList } from '@/hooks/useGroceryList';
import {
  GroceryCategory,
  GroceryItem,
  CATEGORY_META,
  CATEGORY_ORDER,
  groupByCategory,
} from '@/lib/groceryHelpers';
import {
  mergeIngredientsIntoUserPantry,
  parseGroceryLineToPantryIngredients,
} from '@/lib/groceryPantrySync';

// ─── Checkbox component ───────────────────────────────────────

function Checkbox({
  name,
  checked,
  color,
  onPress,
}: {
  name: string;
  checked: boolean;
  color: string;
  onPress: () => void;
}) {
  const { Colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{checked}}
      accessibilityLabel={checked ? `Mark ${name} as needed` : `Mark ${name} as bought`}
      onPress={onPress}
      hitSlop={10}
      style={[
        checkboxStyle.box,
        checked
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: Colors.border },
      ]}
    >
      {checked && (
        <Ionicons name="checkmark" size={13} color="#fff" />
      )}
    </Pressable>
  );
}

// ─── Single grocery row ───────────────────────────────────────

function GroceryRow({
  item,
  accentColor,
  onToggle,
  onRemove,
}: {
  item: GroceryItem;
  accentColor: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={styles.row}>
      <Checkbox
        name={item.name}
        checked={item.checked}
        color={accentColor}
        onPress={() => {
          Haptics.selectionAsync();
          onToggle();
        }}
      />
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowText,
            item.checked && styles.rowTextChecked,
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <Text style={styles.rowSource} numberOfLines={1}>
          {item.sourceNames.join(', ')}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={'Remove '+item.name} onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ─── Category section ─────────────────────────────────────────

function CategorySection({
  category,
  items,
  onToggle,
  onRemove,
}: {
  category: GroceryCategory;
  items: GroceryItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  if (items.length === 0) return null;

  const meta         = CATEGORY_META[category];
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View
            style={[
              styles.sectionEmojiContainer,
              { backgroundColor: `${meta.color}18` },
            ]}
          >
            <Text style={styles.sectionEmoji}>{meta.emoji}</Text>
          </View>
          <Text style={styles.sectionLabel}>{meta.label}</Text>
        </View>
        <View style={styles.sectionBadge}>
          <Text style={[styles.sectionBadgeText, { color: meta.color }]}>
            {checkedCount}/{items.length}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: meta.color,
              width: items.length > 0
                ? `${(checkedCount / items.length) * 100}%`
                : '0%',
            },
          ]}
        />
      </View>

      {/* Items */}
      <View style={styles.itemList}>
        {items.map((item) => (
          <GroceryRow
            key={item.id}
            item={item}
            accentColor={meta.color}
            onToggle={() => onToggle(item.id)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🛒</Text>
      <Text style={styles.emptyTitle}>Your grocery list is empty</Text>
      <Text style={styles.emptySub}>
        Open any recipe and tap{' '}
        <Text style={{ color: Colors.accent, fontWeight: '700' }}>
          Add to Grocery List
        </Text>{' '}
        to start building your list.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function GroceryScreen() {
  const router = useRouter();
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const {
    items,
    loading,
    checkedCount,
    uncheckedCount,
    reload,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
    clearAll,
    household,
    pending,
    syncing,
    error,
    importCount,
    importItems,
  } = useGroceryList();

  const reportError = useCallback((err:unknown) => Alert.alert('Grocery list', err instanceof Error ? err.message : 'Could not save. Try again.'),[]);

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInputType>(null);
  const [inlineToastVisible, setInlineToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showPantryToast = useCallback(() => {
    const msg = 'Added to your pantry';
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
      return;
    }
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setInlineToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setInlineToastVisible(false);
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  const handleToggleWithPantry = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      const willCheck = item !== undefined && !item.checked;
      try { await toggleItem(id); } catch(err) { reportError(err); return; }
      if (!willCheck || !item) return;

      const parts = parseGroceryLineToPantryIngredients(item.name);
      const added = await mergeIngredientsIntoUserPantry(parts);
      if (added > 0) {
        showPantryToast();
      }
    },
    [items, toggleItem, showPantryToast, reportError]
  );

  const handleManualAdd = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await addItem(trimmed); } catch(err) { reportError(err); return; }
    setInputText('');
    inputRef.current?.blur();
  }, [inputText, addItem, reportError]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const grouped = useMemo(() => groupByCategory(items), [items]);

  const handleClearChecked = useCallback(() => {
    if (checkedCount === 0) return;
    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedCount} checked item${checkedCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void clearChecked().catch(reportError);
          },
        },
      ]
    );
  }, [checkedCount, clearChecked, reportError]);

  const handleClearAll = useCallback(() => {
    if (items.length === 0) return;
    Alert.alert(
      'Clear All Items',
      `Remove all ${items.length} items from your grocery list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void clearAll().catch(reportError);
          },
        },
      ]
    );
  }, [items.length, clearAll, reportError]);

  if (loading) return null;

  return (
    <SafeAreaView style={[styles.safe, styles.screenFill]} edges={['top']}>
      <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{flexShrink:1}}>
          <Text style={styles.headerTitle}>Grocery List</Text>
          <Text style={styles.headerSub}>
            {items.length === 0
              ? 'Nothing added yet'
              : `${uncheckedCount} remaining · ${checkedCount} done`}
          </Text>
        </View>

        {items.length > 0 && (
          <View style={styles.headerActions}>
            {checkedCount > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  pressed && styles.headerActionBtnPressed,
                ]}
                onPress={handleClearChecked}
              >
                <Ionicons name="checkmark-done-outline" size={15} color={Colors.success} />
                <Text style={[styles.headerActionText, { color: Colors.success }]}>
                  Clear done
                </Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.headerActionBtn,
                pressed && styles.headerActionBtnPressed,
              ]}
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
              <Text style={[styles.headerActionText, { color: Colors.textMuted }]}>
                Clear all
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={{paddingHorizontal:20,paddingBottom:12,gap:8}}>
        <Pressable accessibilityRole="button" onPress={()=>router.push('/household')} style={{minHeight:44,justifyContent:'center'}}>
          <Text style={{color:Colors.accent,fontWeight:'700'}}>{household ? household.name+' · Shared list' : 'Share a list with your household'}</Text>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={{color:Colors.textSecondary}}>
          {pending.length ? `${pending.length} change${pending.length===1?'':'s'} saved on this phone · waiting to sync` : syncing ? 'Syncing household list…' : error ? 'Showing the last saved list' : household ? 'Shared list is up to date' : 'Personal list · saved on this phone'}
        </Text>
        {error&&<Pressable accessibilityRole="button" onPress={()=>void reload()} style={{minHeight:44}}><Text accessibilityRole="alert" style={{color:Colors.accent}}>{error} Tap to retry.</Text></Pressable>}
        {importCount>0&&<Pressable accessibilityRole="button" onPress={()=>Alert.alert(household?'Copy your personal items?':'Import your old grocery list?',household?`Copy ${importCount} items into the list everyone in your household can see?`:`Import ${importCount} items saved by the older app on this phone into your personal list?`,[{text:'Cancel',style:'cancel'},{text:'Copy items',onPress:()=>void importItems().catch(reportError)}])} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:Colors.accent}}>{household?'Copy personal items to household':'Import items from the older app'} ({importCount})</Text></Pressable>}
      </View>

      {/* ── Manual add input ────────────────────────────────── */}
      <View style={styles.addRow}>
        <TextInput
          ref={inputRef}
          style={styles.addInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Add an item..."
          accessibilityLabel="Grocery item"
          maxLength={200}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleManualAdd}
          blurOnSubmit={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add grocery item"
          onPress={handleManualAdd}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && styles.addBtnPressed,
          ]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* ── Overall progress bar ────────────────────────────── */}
      {items.length > 0 && (
        <View style={styles.totalProgressTrack}>
          <View
            style={[
              styles.totalProgressFill,
              { width: `${(checkedCount / items.length) * 100}%` },
            ]}
          />
        </View>
      )}

      {/* ── Body ────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={[styles.scrollWide, styles.scrollContent]}>
          {CATEGORY_ORDER.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              items={grouped[cat]}
              onToggle={handleToggleWithPantry}
              onRemove={id=>void removeItem(id).catch(reportError)}
            />
          ))}
          <View style={{ height: 40 }} />
        </View>
      )}

      </ScrollView>
      {inlineToastVisible && (
        <View style={styles.toastOverlay} pointerEvents="none">
          <View style={[styles.toastBubble, { backgroundColor: Colors.surfaceElevated }]}>
            <Text style={[styles.toastText, { color: Colors.textPrimary }]}>
              Added to your pantry
            </Text>
          </View>
        </View>
      )}
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
    screenFill: {
      width: '100%',
      alignSelf: 'stretch',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 14,
    },
    headerTitle: {
      color: Colors.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    headerSub: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      marginTop: 3,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 4,
    },
    headerActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    headerActionBtnPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
    },
    headerActionText: {
      fontSize: 12,
      fontWeight: '700',
    },

    // Overall progress bar
    totalProgressTrack: {
      height: 3,
      backgroundColor: Colors.border,
      marginHorizontal: 20,
      borderRadius: 2,
      marginBottom: 8,
    },
    totalProgressFill: {
      height: '100%',
      backgroundColor: Colors.accent,
      borderRadius: 2,
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

    // Category section
    section: {
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: Colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionEmojiContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionEmoji: {
      fontSize: 18,
    },
    sectionLabel: {
      color: Colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    sectionBadge: {
      backgroundColor: Colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '800',
    },

    // Section progress bar
    progressTrack: {
      height: 2,
      backgroundColor: Colors.border,
      marginHorizontal: 16,
      borderRadius: 1,
      marginBottom: 6,
    },
    progressFill: {
      height: '100%',
      borderRadius: 1,
    },

    // Item list
    itemList: {
      paddingBottom: 6,
    },

    // Grocery row
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 11,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    rowText: {
      color: Colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    rowTextChecked: {
      textDecorationLine: 'line-through',
      color: Colors.textMuted,
    },
    rowSource: {
      color: Colors.textMuted,
      fontSize: 11,
      fontWeight: '500',
    },
    removeBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    // Manual add row
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 10,
    },
    addInput: {
      flex: 1,
      height: 46,
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: Colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.93 }],
    },

    // Empty state
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 12,
      paddingBottom: 60,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: 8,
    },
    emptyTitle: {
      color: Colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    emptySub: {
      color: Colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '500',
    },

    toastOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 48,
    },
    toastBubble: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    toastText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
}

// Static styles used by Checkbox (no color references)
const checkboxStyle = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
