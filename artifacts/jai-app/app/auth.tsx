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

type Step = 'phone' | 'otp';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useApp();
  const { t, isRTL, font, lang, toggleLanguage } = useLanguage();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePhoneSubmit() {
    if (phone.length < 9) { setError(t('phoneError')); return; }
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('otp');
  }

  async function handleOtpSubmit() {
    if (otp.length < 4) { setError(t('otpError')); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(r => setTimeout(r, 800));
    await login(DEFAULT_USER);
    setLoading(false);
    router.replace('/(tabs)');
  }

  async function handleGuest() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await login({ ...DEFAULT_USER, id: 'guest', name: 'Guest User', membership: 'none' });
    router.replace('/(tabs)');
  }

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const writingDir = isRTL ? 'rtl' : 'ltr';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 24 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        {/* Language toggle */}
        <TouchableOpacity
          style={[styles.langToggle, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
          onPress={toggleLanguage}
        >
          <Text style={[styles.langToggleText, { fontFamily: font.semibold }]}>
            {lang === 'en' ? 'العربية' : 'English'}
          </Text>
        </TouchableOpacity>

        <Image
          source={require('../assets/images/jai-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'phone' ? (
          <>
            <Text style={[styles.heading, { fontFamily: font.bold, textAlign: align, writingDirection: writingDir }]}>
              {t('enterPhone')}
            </Text>
            <Text style={[styles.hint, { fontFamily: font.regular, textAlign: align, writingDirection: writingDir }]}>
              {t('phoneHint')}
            </Text>

            <View style={[styles.phoneRow, { flexDirection: rowDir }]}>
              <View style={styles.countryCode}>
                <Text style={[styles.countryCodeText, { fontFamily: font.medium }]}>🇸🇦 +966</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { fontFamily: font.medium, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="5X XXX XXXX"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {!!error && <Text style={[styles.error, { fontFamily: font.regular, textAlign: align }]}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handlePhoneSubmit} activeOpacity={0.85}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={[styles.btnText, { fontFamily: font.bold }]}>{t('sendOTP')}</Text>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setStep('phone')} style={[styles.backBtn, { flexDirection: rowDir }]}>
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#2D1B69" />
              <Text style={[styles.backText, { fontFamily: font.medium }]}>{t('changeNumber')}</Text>
            </TouchableOpacity>

            <Text style={[styles.heading, { fontFamily: font.bold, textAlign: align, writingDirection: writingDir }]}>
              {t('enterOTP')}
            </Text>
            <Text style={[styles.hint, { fontFamily: font.regular, textAlign: align, writingDirection: writingDir }]}>
              {t('otpSentTo')} +966 {phone}
            </Text>

            <TextInput
              style={[styles.phoneInput, styles.otpInput, { fontFamily: font.medium }]}
              placeholder="----"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
            />

            {!!error && <Text style={[styles.error, { fontFamily: font.regular, textAlign: align }]}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleOtpSubmit} activeOpacity={0.85} disabled={loading}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={[styles.btnText, { fontFamily: font.bold }]}>
                  {loading ? t('verifying') : t('verifyAndContinue')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn}>
              <Text style={[styles.resendText, { fontFamily: font.regular }]}>{t('resendCode')}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={[styles.dividerText, { fontFamily: font.regular }]}>{t('or')}</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.8}>
          <Text style={[styles.guestText, { fontFamily: font.medium }]}>{t('continueAsGuest')}</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 28, paddingBottom: 40, alignItems: 'center' },
  langToggle: {
    position: 'absolute', top: 12, right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  langToggleText: { color: '#FFFFFF', fontSize: 13 },
  logo: { width: 180, height: 80 },
  body: { flex: 1, backgroundColor: '#FFFFFF' },
  bodyContent: { padding: 28 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  hint: { fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 22 },
  phoneRow: { gap: 10, marginBottom: 8 },
  countryCode: {
    backgroundColor: '#F8F9FC', borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBF5',
    paddingHorizontal: 14, justifyContent: 'center',
  },
  countryCodeText: { fontSize: 15, color: '#1A1A1A' },
  phoneInput: {
    flex: 1, backgroundColor: '#F8F9FC', borderRadius: 12, borderWidth: 1.5, borderColor: '#EBEBF5',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: '#1A1A1A',
  },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 10, marginBottom: 8 },
  error: { fontSize: 13, color: '#E74C3C', marginBottom: 12 },
  btn: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  btnGradient: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  backBtn: { alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { color: '#2D1B69', fontSize: 15 },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: '#6B7280', fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#EBEBF5' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  guestBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: '#EBEBF5', paddingVertical: 16, alignItems: 'center' },
  guestText: { fontSize: 15, color: '#6B7280' },
});
