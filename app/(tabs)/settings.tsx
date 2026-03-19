import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Setting Row ──────────────────────────────────────────────
interface RowProps {
  icon:        IoniconsName;
  iconColor?:  string;
  title:       string;
  subtitle?:   string;
  titleColor?: string;
  onPress:     () => void;
  isLast?:     boolean;
  Colors:      AppColors;
}

function SettingRow({
  icon, iconColor, title, subtitle, titleColor, onPress, isLast, Colors,
}: RowProps) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const color  = iconColor ?? Colors.accent;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, titleColor ? { color: titleColor } : null]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
    </Pressable>
  );
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({
  label,
  children,
  Colors,
}: {
  label:    string;
  children: React.ReactNode;
  Colors:   AppColors;
}) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

// ─── Settings Screen ──────────────────────────────────────────
export default function SettingsScreen() {
  const router                            = useRouter();
  const { Colors, themeMode, setThemeMode } = useTheme();
  const styles                            = useMemo(() => makeStyles(Colors), [Colors]);
  const { session, userId }               = useSession();

  const email = session?.user?.email ?? '';

  // ── Account actions ───────────────────────────────────────
  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleChangePassword = () => {
    let newPassword     = '';
    let confirmPassword = '';

    Alert.prompt(
      'New Password',
      'Enter your new password:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (pw = '') => {
            newPassword = pw.trim();
            if (newPassword.length < 6) {
              Alert.alert('Too short', 'Password must be at least 6 characters.');
              return;
            }
            Alert.prompt(
              'Confirm Password',
              'Re-enter your new password:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: async (pw2 = '') => {
                    confirmPassword = pw2.trim();
                    if (newPassword !== confirmPassword) {
                      Alert.alert('Mismatch', 'Passwords do not match.');
                      return;
                    }
                    const { error } = await supabase.auth.updateUser({
                      password: newPassword,
                    });
                    if (error) {
                      Alert.alert('Error', error.message);
                    } else {
                      Alert.alert('Success', 'Your password has been updated.');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'secure-text'
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone. All your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_user');
            if (error) {
              Alert.alert(
                'Cannot Delete',
                'Please contact support to delete your account.'
              );
              return;
            }
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleProfile = () => {
    let displayName = '';
    Alert.prompt(
      'Display Name',
      `Your email: ${email}\n\nEnter a display name:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name = '') => {
            displayName = name.trim();
            if (!displayName || !userId) return;
            const { error } = await supabase
              .from('users')
              .update({ display_name: displayName })
              .eq('id', userId);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Saved', 'Display name updated.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // ── Theme options ─────────────────────────────────────────
  const THEME_OPTIONS: { key: typeof themeMode; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light',  label: 'Light'  },
    { key: 'dark',   label: 'Dark'   },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── SECTION 1: My Account ─────────────────────────── */}
        <Section label="MY ACCOUNT" Colors={Colors}>
          <SettingRow
            icon="person-outline"
            title="Profile"
            subtitle={email}
            onPress={handleProfile}
            Colors={Colors}
          />
          <SettingRow
            icon="lock-closed-outline"
            title="Change Password"
            onPress={handleChangePassword}
            Colors={Colors}
          />
          <SettingRow
            icon="log-out-outline"
            iconColor={Colors.accent}
            title="Sign Out"
            titleColor={Colors.accent}
            onPress={handleSignOut}
            Colors={Colors}
          />
          <SettingRow
            icon="trash-outline"
            iconColor="#FF3A2D"
            title="Delete Account"
            titleColor="#FF3A2D"
            onPress={handleDeleteAccount}
            isLast
            Colors={Colors}
          />
        </Section>

        {/* ── SECTION 2: Appearance ─────────────────────────── */}
        <Section label="APPEARANCE" Colors={Colors}>
          <View style={styles.themeWrap}>
            {THEME_OPTIONS.map(({ key, label }) => {
              const active = themeMode === key;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.themeBtn,
                    active ? styles.themeBtnActive : styles.themeBtnInactive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setThemeMode(key);
                  }}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      active ? styles.themeBtnTextActive : styles.themeBtnTextInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* ── SECTION 3: Food Preferences ───────────────────── */}
        <Section label="FOOD PREFERENCES" Colors={Colors}>
          <SettingRow
            icon="options-outline"
            title="Food Preferences"
            subtitle="Manage your food likes and dislikes"
            onPress={() => router.push('/taste-engine')}
            isLast
            Colors={Colors}
          />
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
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
    scroll: {
      flex: 1,
    },
    pageHeader: {
      paddingHorizontal: 20,
      paddingTop:        20,
      paddingBottom:     8,
    },
    pageTitle: {
      color:         Colors.textPrimary,
      fontSize:      30,
      fontWeight:    '800',
      letterSpacing: -0.5,
    },

    // ── Section ───────────────────────────────────────────────
    sectionWrap: {
      marginTop:    24,
    },
    sectionLabel: {
      color:             Colors.textMuted,
      fontSize:          11,
      fontWeight:        '800',
      letterSpacing:     1.2,
      textTransform:     'uppercase',
      paddingHorizontal: 20,
      marginBottom:      8,
    },
    card: {
      marginHorizontal: 20,
      backgroundColor:  Colors.surface,
      borderRadius:     16,
      borderWidth:      1,
      borderColor:      Colors.border,
      overflow:         'hidden',
    },

    // ── Row ───────────────────────────────────────────────────
    row: {
      flexDirection:  'row',
      alignItems:     'center',
      paddingVertical: 13,
      paddingHorizontal: 14,
      gap:             12,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowIconWrap: {
      width:          36,
      height:         36,
      borderRadius:   10,
      alignItems:     'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      gap:  2,
    },
    rowTitle: {
      color:      Colors.textPrimary,
      fontSize:   15,
      fontWeight: '600',
    },
    rowSubtitle: {
      color:      Colors.textSecondary,
      fontSize:   12,
      fontWeight: '400',
    },

    // ── Theme toggle ──────────────────────────────────────────
    themeWrap: {
      flexDirection:     'row',
      gap:               8,
      padding:           14,
    },
    themeBtn: {
      flex:           1,
      paddingVertical: 10,
      borderRadius:   12,
      borderWidth:    1,
      alignItems:     'center',
    },
    themeBtnActive: {
      backgroundColor: Colors.accent,
      borderColor:     Colors.accent,
    },
    themeBtnInactive: {
      backgroundColor: Colors.surface,
      borderColor:     Colors.border,
    },
    themeBtnText: {
      fontSize:   14,
      fontWeight: '700',
    },
    themeBtnTextActive: {
      color: '#fff',
    },
    themeBtnTextInactive: {
      color: Colors.textSecondary,
    },
  });
}
