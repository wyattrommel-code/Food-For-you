import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const mountedRef = useRef(true);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const completedRef = useRef(false);

  const confirmRef = useRef<RNTextInput>(null);

  useEffect(() => {
    mountedRef.current = true;
    async function syncSession() {
      const {
        data: { session: next },
      } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      setSession(next);
      setSessionLoading(false);
    }
    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mountedRef.current) return;
      if (event === 'INITIAL_SESSION') return;
      setSession(next);
      setSessionLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionLoading || completedRef.current) return;
    if (!session) {
      setError('This link is invalid or has expired. Request a new reset link from the login screen.');
    }
  }, [session, sessionLoading]);

  const validateFields = useCallback((): boolean => {
    setPasswordError(null);
    setConfirmError(null);
    let ok = true;
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      ok = false;
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.');
      ok = false;
    }
    return ok;
  }, [password, confirm]);

  const handleUpdate = useCallback(async () => {
    setError(null);
    if (!validateFields()) return;
    if (!session) {
      setError('No active session. Open the reset link from your email again.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      completedRef.current = true;
      setError(null);
      setSuccessMessage('Password updated successfully');
      await supabase.auth.signOut();
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [password, confirm, session, validateFields]);

  const blocked = sessionLoading || !session || !!successMessage;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose a New Password</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputWithToggle]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                  setPasswordError(null);
                }}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!loading && !blocked}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmRef}
                style={[styles.input, styles.inputWithToggle]}
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setError(null);
                  setConfirmError(null);
                }}
                placeholder="Re-enter password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleUpdate}
                editable={!loading && !blocked}
              />
              <Pressable
                onPress={() => setShowConfirm((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
            {confirmError ? <Text style={styles.fieldError}>{confirmError}</Text> : null}
          </View>

          {error ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle" size={16} color={Colors.accent} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.banner, styles.successBanner]}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={[styles.bannerText, styles.successBannerText]}>{successMessage}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              (loading || blocked) && styles.submitBtnDisabled,
            ]}
            onPress={handleUpdate}
            disabled={loading || blocked}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </Pressable>
        </ScrollView>
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
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 32,
    },
    title: {
      color: Colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      marginBottom: 28,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
      height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      color: Colors.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    inputWithToggle: {
      marginRight: 8,
    },
    eyeBtn: {
      padding: 4,
    },
    fieldError: {
      color: Colors.accent,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 8,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: Colors.accentSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,58,45,0.25)',
    },
    successBanner: {
      backgroundColor: 'rgba(34,197,94,0.1)',
      borderColor: 'rgba(34,197,94,0.25)',
    },
    bannerText: {
      color: Colors.accent,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
      lineHeight: 18,
    },
    successBannerText: {
      color: Colors.success,
    },
    submitBtn: {
      height: 54,
      backgroundColor: '#FF3A2D',
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      shadowColor: '#FF3A2D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    submitBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    submitBtnDisabled: {
      opacity: 0.55,
    },
    submitBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
  });
}
