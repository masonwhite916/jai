import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, ScrollView, KeyboardAvoidingView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDriver, DEFAULT_DRIVER } from '@/context/DriverContext';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

type Step = 'info' | 'otp';

export default function DriverAuth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login: driverLogin } = useDriver();
  const { login: appLogin, setRole } = useApp();
  const { lang, font, toggleLanguage } = useLanguage();
  const isAR = lang === 'ar';
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!name.trim()) { setError(isAR ? 'أدخل اسمك الكامل' : 'Enter your full name'); return; }
    if (!inviteCode.trim()) { setError(isAR ? 'أدخل رمز الدعوة' : 'Enter your invite code'); return; }
    if (phone.replace(/\D/g, '').length < 9) { setError(isAR ? 'أدخل رقم هاتف صحيح' : 'Enter a valid phone number'); return; }
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
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError(isAR ? 'أدخل الرمز المكوّن من ٦ أرقام' : 'Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, name: name.trim(), invite_code: inviteCode.trim() }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string; token?: string; user?: any };
      if (!resp.ok || !data.ok) throw new Error(data.error ?? 'Incorrect code');
      const apiUser = data.user ?? {};

      // Gate on server-returned role — if the invite code was invalid the server
      // will have created a 'customer' account and this flow should block entry.
      if (apiUser.role !== 'technician') {
        setError(isAR
          ? 'رمز الدعوة غير صحيح. تواصل مع المشرف للحصول على رمز صالح.'
          : 'Invalid invite code. Please contact your dispatcher for a valid code.');
        setLoading(false);
        return;
      }

      const mergedUser = {
        id:         apiUser.id         ?? 'd1',
        name:       apiUser.name       ?? name.trim(),
        phone:      apiUser.phone      ?? phone,
        membership: apiUser.membership ?? 'none',
        points:     apiUser.points     ?? 0,
        vehicles:   [],
      };
      // Store auth in AppContext and as Driver
      await appLogin(mergedUser, data.token);
      await setRole('technician');
      await driverLogin({
        ...DEFAULT_DRIVER,
        id:   apiUser.id ? String(apiUser.id) : 'd1',
        name: mergedUser.name,
        phone: mergedUser.phone,
        jobsCompleted: apiUser.jobsCompleted ?? DEFAULT_DRIVER.jobsCompleted,
        earnings: {
          ...DEFAULT_DRIVER.earnings,
          total: apiUser.earningsTotal ?? DEFAULT_DRIVER.earnings.total,
        },
      });
      router.replace('/(driver)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await driverLogin(DEFAULT_DRIVER);
    router.replace('/(driver)');
  };

  const handleBack = async () => {
    if (step === 'otp') { setStep('info'); setOtp(''); setError(''); return; }
    await setRole(null);
    router.replace('/role');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91', '#C21875']}
        style={[styles.header, { paddingTop: insets.top + 24 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity
          style={[styles.langBtn, { alignSelf: isAR ? 'flex-start' : 'flex-end' }]}
          onPress={toggleLanguage}
        >
          <Ionicons name="language-outline" size={15} color="rgba(255,255,255,0.9)" />
          <Text style={[styles.langBtnText, { fontFamily: font.semibold }]}>
            {lang === 'en' ? 'العربية' : 'English'}
          </Text>
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <LinearGradient colors={['#C21875', '#7B2A9E']} style={styles.badge}>
            <Ionicons name="construct-outline" size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isAR ? 'جاي — بوابة الفنيين' : 'JAI Technician Portal'}
        </Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
          {isAR ? 'سجّل دخولك لاستلام الطلبات' : 'Sign in to receive service requests'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 + (Platform.OS === 'web' ? 34 : 0) }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'info' ? (
          <>
            <Text style={[styles.label, { fontFamily: font.semibold, textAlign: isAR ? 'right' : 'left' }]}>
              {isAR ? 'الاسم الكامل' : 'Full name'}
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: isAR ? 'right' : 'left' }]}
              placeholder={isAR ? 'أحمد الدوسري' : 'Ahmed Al-Dossari'}
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { fontFamily: font.semibold, textAlign: isAR ? 'right' : 'left', marginTop: 16 }]}>
              {isAR ? 'رمز الدعوة' : 'Invite code'}
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: isAR ? 'right' : 'left' }]}
              placeholder={isAR ? 'JAI-TECH-XXXX' : 'JAI-TECH-XXXX'}
              placeholderTextColor="#9CA3AF"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.label, { fontFamily: font.semibold, textAlign: isAR ? 'right' : 'left', marginTop: 16 }]}>
              {isAR ? 'رقم الجوال' : 'Phone number'}
            </Text>
            <View style={[styles.phoneRow, { flexDirection: 'row-reverse' }]}>
              <View style={styles.flag}>
                <Text style={[styles.flagText, { fontFamily: font.medium }]}>🇸🇦 +966</Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1, fontFamily: font.medium, textAlign: 'left' }]}
                placeholder="05X XXX XXXX"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {!!error && (
              <Text style={[styles.error, { fontFamily: font.regular, textAlign: isAR ? 'right' : 'left' }]}>{error}</Text>
            )}

            <TouchableOpacity activeOpacity={0.85} onPress={handleSendOtp} disabled={loading} style={styles.primaryWrap}>
              <LinearGradient
                colors={loading ? ['#555', '#555'] : ['#C21875', '#7B2A9E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={[styles.primaryText, { fontFamily: font.bold }]}>
                  {loading ? (isAR ? 'جارٍ الإرسال...' : 'Sending…') : (isAR ? 'إرسال الرمز' : 'Send code')}
                </Text>
                <Ionicons name={isAR ? 'arrow-back-outline' : 'arrow-forward-outline'} size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={[styles.divText, { fontFamily: font.regular }]}>{isAR ? 'أو' : 'or'}</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity onPress={handleGuest} style={styles.guestBtn} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={18} color="#6B7280" />
              <Text style={[styles.guestText, { fontFamily: font.medium }]}>
                {isAR ? 'متابعة كضيف' : 'Continue as guest'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.label, { fontFamily: font.semibold, textAlign: isAR ? 'right' : 'left' }]}>
              {isAR ? 'رمز التحقق' : 'Verification code'}
            </Text>
            <Text style={[styles.hint, { fontFamily: font.regular, textAlign: isAR ? 'right' : 'left' }]}>
              {isAR
                ? `أُرسل رمز مكوّن من ٦ أرقام إلى +966 ${phone} عبر واتساب`
                : `A 6-digit code was sent to +966 ${phone} via WhatsApp`}
            </Text>
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: 'center', letterSpacing: 6, fontSize: 22 }]}
              placeholder="------"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {!!error && (
              <Text style={[styles.error, { fontFamily: font.regular, textAlign: isAR ? 'right' : 'left' }]}>{error}</Text>
            )}

            <TouchableOpacity activeOpacity={0.85} onPress={handleVerifyOtp} disabled={loading} style={styles.primaryWrap}>
              <LinearGradient
                colors={loading ? ['#555', '#555'] : ['#C21875', '#7B2A9E']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                <Text style={[styles.primaryText, { fontFamily: font.bold }]}>
                  {loading ? (isAR ? 'جارٍ التحقق...' : 'Verifying…') : (isAR ? 'تأكيد' : 'Verify')}
                </Text>
                <Ionicons name={isAR ? 'arrow-back-outline' : 'arrow-forward-outline'} size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleSendOtp()} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={[styles.backText, { fontFamily: font.regular }]}>
                {isAR ? 'إعادة إرسال الرمز' : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={15} color="#9CA3AF" />
          <Text style={[styles.backText, { fontFamily: font.regular }]}>
            {step === 'otp'
              ? (isAR ? 'تغيير رقم الجوال' : 'Change number')
              : (isAR ? 'العودة' : 'Back to role selection')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 20,
  },
  langBtnText: { color: '#FFFFFF', fontSize: 13 },
  badgeRow: { marginBottom: 16 },
  badge: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 22, marginBottom: 6 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },

  scroll: { flex: 1, backgroundColor: '#F8F9FC' },
  form: { paddingHorizontal: 24, paddingTop: 32 },

  label: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  hint: { color: '#9CA3AF', fontSize: 13, marginBottom: 20, lineHeight: 19 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#EBEBF5',
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#1A1A1A',
  },
  phoneRow: { gap: 10, maxWidth: '100%', overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  flag: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#EBEBF5',
    paddingHorizontal: 14, paddingVertical: 15,
    justifyContent: 'center', alignItems: 'flex-start',
  },
  flagText: { fontSize: 15, color: '#1A1A1A' },

  error: { color: '#E74C3C', fontSize: 13, marginTop: 8 },

  primaryWrap: {
    borderRadius: 16, overflow: 'hidden', marginTop: 24,
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  primaryBtn: {
    paddingVertical: 18, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  primaryText: { color: '#FFFFFF', fontSize: 16 },

  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine: { flex: 1, height: 1, backgroundColor: '#EBEBF5' },
  divText: { color: '#9CA3AF', fontSize: 13 },

  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#EBEBF5',
  },
  guestText: { color: '#6B7280', fontSize: 15 },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20,
  },
  backText: { color: '#9CA3AF', fontSize: 13 },
});
