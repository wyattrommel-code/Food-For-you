import React, { useState, useCallback, useRef, useMemo } from 'react';
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
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/Colors';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const { Colors } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [mode, setMode]                     = useState<Mode>('login');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordRef = useRef<RNTextInput>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    clearMessages();

    const trimmedEmail    = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter your email and password.');
      return;
    }
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email:    trimmedEmail,
          password: trimmedPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email:    trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: 'foodforyou://auth/callback',
          },
        });
        if (error) throw error;
        setSuccessMessage(
          "We've sent a confirmation email. Please verify your address, then log in."
        );
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, clearMessages]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    clearMessages();
  }, [clearMessages]);

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
          {/* ── Branding ─────────────────────────────────── */}
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>M</Text>
            </View>
          </View>
          <Text style={styles.appName}>Mealsolved</Text>
          <Text style={styles.tagline}>Recipes that match your taste.</Text>

          {/* ── Card ────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'login'
                ? 'Sign in to access your personalised menu'
                : 'Sign up to save your preferences and favourites'}
            </Text>

            {/* ── Error / Success banners ──────────────── */}
            {error && (
              <View style={styles.banner}>
                <Ionicons name="alert-circle" size={16} color={Colors.accent} />
                <Text style={styles.bannerText}>{error}</Text>
              </View>
            )}
            {successMessage && (
              <View style={[styles.banner, styles.successBanner]}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={[styles.bannerText, styles.successBannerText]}>
                  {successMessage}
                </Text>
              </View>
            )}

            {/* ── Email ───────────────────────────────── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearMessages(); }}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            </View>

            {/* ── Password ────────────────────────────── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputWithToggle]}
                  accessibilityLabel="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearMessages(); }}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
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
            </View>

            {mode === 'login' && (
              <Pressable
                style={styles.forgotRow}
                onPress={() => router.push('/forgot-password' as Href)}
                disabled={loading}
                hitSlop={8}
              >
                <Text style={styles.forgotLink}>Forgot your password?</Text>
              </Pressable>
            )}

            {/* ── Submit ──────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            {/* ── Toggle ──────────────────────────────── */}
            <View style={styles.toggleRow}>
              <Text style={styles.togglePrompt}>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <Pressable onPress={toggleMode} disabled={loading}>
                <Text style={styles.toggleLink}>
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Pressable>
            </View>
          </View>
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
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 32,
      alignItems: 'center',
    },

    // ── Branding ─────────────────────────────────
    brandRow: {
      marginBottom: 16,
    },
    logoMark: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: Colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    logoMarkText: {
      color: '#fff',
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -1,
    },
    appName: {
      color: Colors.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    tagline: {
      color: Colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
      marginBottom: 40,
    },

    // ── Card ──────────────────────────────────────
    card: {
      width: '100%',
      backgroundColor: Colors.surface,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    cardTitle: {
      color: Colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    cardSubtitle: {
      color: Colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      marginBottom: 20,
    },

    // ── Banners ───────────────────────────────────
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

    // ── Fields ────────────────────────────────────
    forgotRow: {
      alignSelf: 'flex-end',
      marginBottom: 4,
    },
    forgotLink: {
      color: Colors.accent,
      fontSize: 13,
      fontWeight: '700',
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
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      minWidth: 0,
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

    // ── Submit ────────────────────────────────────
    submitBtn: {
      height: 54,
      backgroundColor: Colors.accent,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 20,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    submitBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },

    // ── Toggle ────────────────────────────────────
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    togglePrompt: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    toggleLink: {
      color: Colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
