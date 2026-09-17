// NOTE: Before this works you must create a public Storage bucket called
// "avatars" in your Supabase dashboard → Storage → New bucket.
// Set it to Public so avatar_url links are accessible without auth.

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';
import {usePreferences} from '@/hooks/usePreferences';
import {preferenceSummary} from '@/lib/preferences';
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
      accessibilityRole="button"
      accessibilityLabel={title}
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

// ─── Profile Edit Modal ───────────────────────────────────────
function ProfileEditModal({
  visible,
  onClose,
  userId,
  email,
  initialName,
  initialAvatarUrl,
  onSaved,
  Colors,
}: {
  visible:          boolean;
  onClose:          () => void;
  userId:           string | null;
  email:            string;
  initialName:      string;
  initialAvatarUrl: string;
  onSaved:          (name: string, avatarUrl: string) => void;
  Colors:           AppColors;
}) {
  const styles                      = useMemo(() => makeStyles(Colors), [Colors]);
  const [name, setName]             = useState(initialName);
  const [avatarUrl, setAvatarUrl]   = useState(initialAvatarUrl);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setAvatarUrl(initialAvatarUrl);
    }
  }, [visible, initialName, initialAvatarUrl]);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    if (!userId) return;

    const uri = result.assets[0].uri;
    setUploading(true);

    try {
      const response    = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const filePath    = `${userId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert:      true,
        });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Bust the cache by appending a timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('users')
        .upsert({ id: userId, avatar_url: publicUrl });

      if (dbError) {
        Alert.alert('Save failed', dbError.message);
        return;
      }

      setAvatarUrl(publicUrl);
    } catch (err) {
      Alert.alert('Error', 'Something went wrong uploading your photo.');
    } finally {
      setUploading(false);
    }
  }, [userId]);

  const handleSaveName = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .upsert({ id: userId, name: name.trim() });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    onSaved(name.trim(), avatarUrl);
    onClose();
  }, [userId, name, avatarUrl, onSaved, onClose]);

  const initials = name.trim()
    ? name.trim().charAt(0).toUpperCase()
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: Colors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatarLarge}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarLargeImg}
                    resizeMode="cover"
                  />
                ) : initials ? (
                  <Text style={styles.avatarLargeInitials}>{initials}</Text>
                ) : (
                  <Ionicons name="person" size={40} color="#fff" />
                )}

                {/* Camera button overlay */}
                <Pressable
                  style={({ pressed }) => [
                    styles.cameraBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handlePickPhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </Pressable>
              </View>

              {uploading && (
                <Text style={styles.uploadingText}>Uploading…</Text>
              )}
            </View>

            {/* Email (read-only) */}
            <Text style={styles.emailLabel}>Email</Text>
            <View style={styles.emailBox}>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Display name input */}
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />

            {/* Save button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.8 },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSaveName}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Settings Screen ──────────────────────────────────────────
export default function SettingsScreen() {
  const router                              = useRouter();
  const { Colors, themeMode, setThemeMode } = useTheme();
  const styles                              = useMemo(() => makeStyles(Colors), [Colors]);
  const { session, userId }                 = useSession();
  const {preferences,syncError,refresh:retryPreferences}=usePreferences(userId);

  const email = session?.user?.email ?? '';

  // ── Profile state ─────────────────────────────────────────
  const [profileName, setProfileName]         = useState('');
  const [profileAvatar, setProfileAvatar]     = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('users')
      .select('name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setProfileName(data.name ?? '');
      setProfileAvatar(data.avatar_url ?? '');
    }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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

  // ── Theme options ─────────────────────────────────────────
  const THEME_OPTIONS: { key: typeof themeMode; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light',  label: 'Light'  },
    { key: 'dark',   label: 'Dark'   },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, styles.screenFill]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* ── SECTION 1: My Account ─────────────────────────── */}
        <Section label="MY ACCOUNT" Colors={Colors}>
          <SettingRow
            icon="people-outline"
            title="Household"
            subtitle="Shared plans, groceries and food preferences"
            onPress={() => router.push('/household')}
            Colors={Colors}
          />
          <SettingRow
            icon="person-outline"
            title="Profile"
            subtitle={profileName || email}
            onPress={() => setShowProfileModal(true)}
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
            subtitle={preferenceSummary(preferences)}
            onPress={() => router.push('/onboarding?from=settings')}
            isLast
            Colors={Colors}
          />
        </Section>

        <Section label="MORE FOOD SETTINGS" Colors={Colors}>
          <SettingRow icon="thumbs-down-outline" title="Disliked recipes" subtitle={`${preferences.disliked_recipe_ids?.length??0} hidden · Restore recipes anytime`} onPress={()=>router.push('/disliked-recipes' as never)} Colors={Colors}/>
          <SettingRow icon="heart-outline" title="Ingredients & cuisines" subtitle="Edit detailed likes and dislikes" onPress={()=>router.push('/taste-engine')} isLast Colors={Colors}/>
        </Section>
        {syncError && <Pressable accessibilityRole="button" onPress={retryPreferences} style={{padding:20,minHeight:48}}><Text style={{color:Colors.accent}}>{syncError} Tap to retry.</Text></Pressable>}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Profile Edit Modal ────────────────────────────── */}
      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userId={userId}
        email={email}
        initialName={profileName}
        initialAvatarUrl={profileAvatar}
        onSaved={(newName, newAvatar) => {
          setProfileName(newName);
          setProfileAvatar(newAvatar);
        }}
        Colors={Colors}
      />
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
    scroll: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
    },
    scrollContent: {
      flexGrow: 1,
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
      marginTop: 24,
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
      flexDirection:     'row',
      alignItems:        'center',
      paddingVertical:   13,
      paddingHorizontal: 14,
      gap:               12,
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
      flexDirection: 'row',
      gap:           8,
      padding:       14,
    },
    themeBtn: {
      flex:            1,
      paddingVertical: 10,
      borderRadius:    12,
      borderWidth:     1,
      alignItems:      'center',
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

    // ── Profile modal ─────────────────────────────────────────
    modalSafe: {
      flex: 1,
    },
    modalHeader: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      paddingHorizontal: 20,
      paddingVertical:   16,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    modalTitle: {
      color:         Colors.textPrimary,
      fontSize:      17,
      fontWeight:    '700',
      letterSpacing: -0.2,
    },
    modalContent: {
      paddingHorizontal: 24,
      paddingTop:        32,
      paddingBottom:     60,
      alignItems:        'center',
    },

    // Avatar (large, in modal)
    avatarWrap: {
      alignItems:   'center',
      marginBottom: 32,
    },
    avatarLarge: {
      width:           100,
      height:          100,
      borderRadius:    50,
      overflow:        'hidden',
      backgroundColor: Colors.accent,
      alignItems:      'center',
      justifyContent:  'center',
    },
    avatarLargeImg: {
      width:  100,
      height: 100,
    },
    avatarLargeInitials: {
      color:      '#fff',
      fontSize:   38,
      fontWeight: '800',
    },
    cameraBtn: {
      position:        'absolute',
      bottom:          4,
      right:           4,
      width:           30,
      height:          30,
      borderRadius:    15,
      backgroundColor: Colors.accent,
      alignItems:      'center',
      justifyContent:  'center',
      borderWidth:     2,
      borderColor:     Colors.background,
    },
    uploadingText: {
      color:     Colors.textMuted,
      fontSize:  12,
      marginTop: 8,
    },

    // Email / name fields
    emailLabel: {
      alignSelf:  'flex-start',
      color:      Colors.textMuted,
      fontSize:   12,
      fontWeight: '600',
      marginBottom: 6,
    },
    emailBox: {
      width:             '100%',
      backgroundColor:   Colors.surfaceElevated,
      borderRadius:      12,
      borderWidth:       1,
      borderColor:       Colors.border,
      paddingHorizontal: 14,
      paddingVertical:   13,
      marginBottom:      20,
    },
    emailText: {
      color:      Colors.textMuted,
      fontSize:   15,
    },
    fieldLabel: {
      alignSelf:    'flex-start',
      color:        Colors.textMuted,
      fontSize:     12,
      fontWeight:   '600',
      marginBottom: 6,
    },
    nameInput: {
      width:             '100%',
      backgroundColor:   Colors.surfaceElevated,
      borderRadius:      12,
      borderWidth:       1,
      borderColor:       Colors.border,
      paddingHorizontal: 14,
      paddingVertical:   13,
      color:             Colors.textPrimary,
      fontSize:          15,
      fontWeight:        '500',
      marginBottom:      24,
    },
    saveBtn: {
      width:           '100%',
      backgroundColor: Colors.accent,
      borderRadius:    14,
      paddingVertical: 16,
      alignItems:      'center',
    },
    saveBtnText: {
      color:      '#fff',
      fontSize:   16,
      fontWeight: '700',
    },
  });
}
