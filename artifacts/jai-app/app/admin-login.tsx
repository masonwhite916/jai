import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdminConfig } from '@/context/AdminConfigContext';
import { useLanguage } from '@/context/LanguageContext';

const JAI_LOGO = require('../assets/images/jai-logo.png');

export default function AdminLoginScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { login, isAdmin } = useAdminConfig();
  const { isRTL, font } = useLanguage();

  const [password, setPassword] = useState('');
  const [secure,   setSecure]   = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // If already logged in, jump straight to panel
  React.useEffect(() => {
    if (isAdmin) router.replace('/admin-panel' as any);
  }, [isAdmin]);

  async function handleLogin() {
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(password.trim());
      router.replace('/admin-panel' as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#5B2C91" />
        </TouchableOpacity>

        {/* Logo + heading */}
        <View style={styles.topBlock}>
          <Image source={JAI_LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.heading, { fontFamily: font.bold }]}>
            {isRTL ? 'لوحة التحكم' : 'Admin Panel'}
          </Text>
          <Text style={[styles.sub, { fontFamily: font.regular }]}>
            {isRTL ? 'أدخل كلمة المرور للمتابعة' : 'Enter the admin password to continue'}
          </Text>
        </View>

        {/* Password input */}
        <View style={styles.inputWrap}>
          <TextInput
            style={[styles.input, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isRTL ? 'كلمة المرور' : 'Password'}
            placeholderTextColor="#9E9AB0"
            secureTextEntry={secure}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecure(!secure)}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9E9AB0" />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={15} color="#E74C3C" />
            <Text style={[styles.errorText, { fontFamily: font.regular }]}>{error}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnLoading]}
          onPress={handleLogin}
          disabled={loading || !password.trim()}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={[styles.btnText, { fontFamily: font.bold }]}>
                {isRTL ? 'دخول' : 'Sign In'}
              </Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F2FA' },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
  },
  back: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 24,
  },
  topBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: { width: 110, height: 48, marginBottom: 20 },
  heading: {
    fontSize: 26,
    color: '#2D1B69',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0DCF0',
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeBtn: { padding: 6 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#E74C3C',
    flex: 1,
  },
  btn: {
    backgroundColor: '#2D1B69',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnLoading: { opacity: 0.7 },
  btnText: { fontSize: 17, color: '#FFFFFF', letterSpacing: 0.3 },
});
