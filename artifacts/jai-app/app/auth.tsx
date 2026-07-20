import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Platform, ScrollView, KeyboardAvoidingView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp, DEFAULT_USER } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

type Step = 'phone' | 'otp';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, loginAsGuest } = useApp();
  const { t, isRTL, font, lang, toggleLanguage } = useLanguage();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  async function handlePhoneSubmit() {
    if (phone.replace(/\D/g, '').length < 9) { setError(t('phoneError')); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) throw new Error(data.error ?? 'Failed to send OTP');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setOtp('');
    await handlePhoneSubmit();
  }

  async function handleOtpSubmit() {
    if (otp.length < 6) { setError(t('otpError')); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok || !data.ok) throw new Error(data.error ?? 'Incorrect code');
      await login(DEFAULT_USER);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.');
      setLoading(false);
    }
  }

  async function handleGuest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loginAsGuest({ ...DEFAULT_USER, id: 'guest', name: 'Guest User', membership: 'none' });
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1A0845', '#3D2080', '#6A2597']}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: insets.top + 24 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        {/* Language toggle */}
        <TouchableOpacity
          style={[styles.langBtn, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
          onPress={toggleLanguage}
        >
          <Ionicons name="language-outline" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.langBtnText, { fontFamily: font.semibold }]}>
            {lang === 'en' ? 'العربية' : 'English'}
          </Text>
        </TouchableOpacity>

        <Image source={require('../assets/images/jai-logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.tagline, { fontFamily: font.regular }]}>
          {lang === 'ar' ? 'مساعدتك على الطريق، في أي وقت' : 'Always there when you need us'}
        </Text>
      </LinearGradient>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'phone' ? (
          <>
            <Text style={[styles.heading, { fontFamily: font.bold, textAlign: align }]}>{t('enterPhone')}</Text>
            <Text style={[styles.hint, { fontFamily: font.regular, textAlign: align }]}>{t('phoneHint')}</Text>

            <View style={[styles.phoneRow, { flexDirection: rowDir }]}>
              <View style={styles.countryCode}>
                <Text style={[styles.countryText, { fontFamily: font.medium }]}>🇸🇦 +966</Text>
              </View>
              <TextInput
                style={[styles.input, { fontFamily: font.medium, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
                placeholder="5X XXX XXXX"
                placeholderTextColor="#C0C0D4"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {!!error && <Text style={[styles.error, { fontFamily: font.regular, textAlign: align }]}>{error}</Text>}

            <TouchableOpacity onPress={handlePhoneSubmit} activeOpacity={0.88} style={styles.primaryBtnWrap}>
              <LinearGradient
                colors={['#2D1B69', '#6A2597']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, { flexDirection: rowDir }]}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: font.bold }]}>{t('sendOTP')}</Text>
                <Ionicons name={isRTL ? 'arrow-back-outline' : 'arrow-forward-outline'} size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setStep('phone')}
              style={[styles.backRow, { flexDirection: rowDir }]}
            >
              <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={18} color="#2D1B69" />
              <Text style={[styles.backText, { fontFamily: font.medium }]}>{t('changeNumber')}</Text>
            </TouchableOpacity>

            <Text style={[styles.heading, { fontFamily: font.bold, textAlign: align }]}>{t('enterOTP')}</Text>
            <View style={[styles.whatsappHint, { flexDirection: rowDir }]}>
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text style={[styles.hint, { fontFamily: font.regular, textAlign: align, marginBottom: 0 }]}>
                {isRTL
                  ? `تم إرسال رمز التحقق عبر واتساب إلى +966 ${phone}`
                  : `Code sent via WhatsApp to +966 ${phone}`}
              </Text>
            </View>

            {/* OTP boxes — 6 digits (Twilio Verify) */}
            <View style={[styles.otpRow, { flexDirection: rowDir }]}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                  <Text style={[styles.otpDigit, { fontFamily: font.bold }]}>{otp[i] ?? ''}</Text>
                </View>
              ))}
            </View>
            {/* Hidden input captures the text */}
            <TextInput
              style={styles.hiddenInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              caretHidden
            />

            {!!error && <Text style={[styles.error, { fontFamily: font.regular, textAlign: align }]}>{error}</Text>}

            <TouchableOpacity onPress={handleOtpSubmit} activeOpacity={0.88} disabled={loading} style={styles.primaryBtnWrap}>
              <LinearGradient
                colors={loading ? ['#9CA3AF', '#9CA3AF'] : ['#2D1B69', '#6A2597']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: font.bold }]}>
                  {loading ? t('verifying') : t('verifyAndContinue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 16 }}
              onPress={handleResend}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, { fontFamily: font.regular }]}>{t('resendCode')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Divider */}
        <View style={styles.divRow}>
          <View style={styles.divLine} />
          <Text style={[styles.divText, { fontFamily: font.regular }]}>{t('or')}</Text>
          <View style={styles.divLine} />
        </View>

        {/* Guest */}
        <TouchableOpacity onPress={handleGuest} style={styles.guestBtn} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={18} color="#6B7280" />
          <Text style={[styles.guestText, { fontFamily: font.medium }]}>{t('continueAsGuest')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingBottom: 44,
    alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 14,
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  langBtnText: { color: '#FFFFFF', fontSize: 13 },
  logo: { width: 200, height: 88 },
  tagline: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6 },

  scroll: { flex: 1, backgroundColor: '#F4F2FA' },
  formContainer: { paddingHorizontal: 24, paddingTop: 32 },

  heading: { fontSize: 22, color: '#120840', marginBottom: 8 },
  hint: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 26 },

  phoneRow: { gap: 10, marginBottom: 8 },
  countryCode: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 14, paddingVertical: 15,
    justifyContent: 'center',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  countryText: { fontSize: 15, color: '#120840' },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 17, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },

  whatsappHint: {
    alignItems: 'center', gap: 8, marginBottom: 26,
  },

  // OTP
  backRow: { alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontSize: 14, color: '#2D1B69' },
  otpRow: { gap: 12, justifyContent: 'center', marginBottom: 8, zIndex: 1 },
  otpBox: {
    width: 50, height: 58, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E0DBEF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  otpBoxFilled: { borderColor: '#2D1B69', backgroundColor: '#EDE8F8' },
  otpDigit: { fontSize: 26, color: '#120840' },
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0,
  },

  error: { fontSize: 13, color: '#E74C3C', marginBottom: 10 },

  primaryBtnWrap: {
    borderRadius: 16, overflow: 'hidden', marginTop: 20,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  primaryBtn: {
    paddingVertical: 18, justifyContent: 'center',
    alignItems: 'center', gap: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16 },

  resendText: { fontSize: 13, color: '#9CA3AF' },

  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: '#E0DBEF' },
  divText: { fontSize: 13, color: '#9CA3AF' },

  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E0DBEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  guestText: { fontSize: 15, color: '#6B7280' },
});
