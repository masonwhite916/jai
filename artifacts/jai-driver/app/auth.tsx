import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type ServerUser } from '@/context/DriverContext';
import { useColors } from '@/hooks/useColors';
import { apiFetch } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';

type Step = 'info' | 'otp';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useColors();
  const { login } = useDriver();

  const [step, setStep]           = useState<Step>('info');
  const [name, setName]           = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [resendIn, setResendIn]   = useState(0);

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const otpRef = useRef<TextInput>(null);

  const sendOtp = async (): Promise<boolean> => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim() }),
        skipAuth: true,
      });
      setResendIn(30);
      return true;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('errGeneric'));
      return false;
    }
  };

  const handleContinue = async () => {
    if (busy) return;
    setError(null);
    if (!name.trim()) { setError(t('errEnterName')); return; }
    if (!inviteCode.trim()) { setError(t('errEnterInvite')); return; }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) { setError(t('errEnterPhone')); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    const ok = await sendOtp();
    setBusy(false);
    if (ok) {
      setStep('otp');
      setOtp('');
      setTimeout(() => otpRef.current?.focus(), 250);
    }
  };

  const handleVerify = async () => {
    if (busy) return;
    setError(null);
    if (otp.trim().length < 4) { setError(t('errEnterOtp')); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      const resp = await apiFetch<{ ok: boolean; token: string; user: ServerUser }>(
        '/api/auth/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            phone: phone.trim(),
            otp: otp.trim(),
            name: name.trim(),
            invite_code: inviteCode.trim(),
          }),
          skipAuth: true,
        },
      );

      if (resp.user.role !== 'technician') {
        setError(t('errNotTechnician'));
        return;
      }

      await login(resp.user, resp.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (busy || resendIn > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    await sendOtp();
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['#2D1B69', '#0B0A0F']}
        start={[0, 0]}
        end={[0, 1]}
        style={[styles.header, { paddingTop: insets.top + 40 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.badge, { flexDirection: rowDir }]}>
          <Ionicons name="car-sport" size={24} color="#C21875" />
          <Text style={[styles.badgeText, { fontFamily: font.bold }]}>{t('appName')}</Text>
        </View>
        <Text style={[styles.title, { fontFamily: font.bold, textAlign }]}>{t('welcome')}</Text>
        <Text style={[styles.subtitle, { fontFamily: font.regular, textAlign }]}>
          {step === 'info' ? t('signIn') : t('verificationCode')}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: insets.bottom + 24, paddingTop: 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'info' ? (
          <>
            <Text style={[styles.label, { fontFamily: font.medium, textAlign }]}>{t('nameLabel')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isRTL ? 'أحمد العتيبي' : 'Ahmed Al-Dossari'}
              placeholderTextColor={colors.mutedForeground}
              autoComplete="name"
              style={[styles.input, { fontFamily: font.regular, textAlign, color: colors.text }]}
            />

            <Text style={[styles.label, { fontFamily: font.medium, textAlign, marginTop: 20 }]}>{t('inviteCode')}</Text>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder={t('inviteCodeHint')}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { fontFamily: font.regular, textAlign, color: colors.text }]}
            />

            <Text style={[styles.label, { fontFamily: font.medium, textAlign, marginTop: 20 }]}>{t('phoneLabel')}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phoneHint')}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              maxLength={13}
              style={[styles.input, { fontFamily: font.regular, textAlign, color: colors.text }]}
            />

            {error && (
              <Text style={[styles.error, { fontFamily: font.medium, textAlign, color: colors.destructive }]}>
                {error}
              </Text>
            )}

            <TouchableOpacity activeOpacity={0.85} onPress={handleContinue} style={styles.btnWrap} disabled={busy}>
              <LinearGradient colors={['#C21875', '#7B2A9E']} start={[0, 0]} end={[1, 0]} style={styles.btn}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t('sendCode')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.otpInfo, { fontFamily: font.regular, color: colors.mutedForeground, textAlign }]}>
              {t('otpSentTo')} {phone.trim()}
            </Text>

            <TextInput
              ref={otpRef}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
              placeholder="••••••"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.otpInput, { fontFamily: font.bold, color: colors.text }]}
            />

            {error && (
              <Text style={[styles.error, { fontFamily: font.medium, textAlign, color: colors.destructive }]}>
                {error}
              </Text>
            )}

            <TouchableOpacity activeOpacity={0.85} onPress={handleVerify} style={styles.btnWrap} disabled={busy}>
              <LinearGradient colors={['#C21875', '#7B2A9E']} start={[0, 0]} end={[1, 0]} style={styles.btn}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t('verify')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={[styles.otpActions, { flexDirection: rowDir }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={handleResend} disabled={busy || resendIn > 0}>
                <Text style={[styles.linkText, { fontFamily: font.medium, color: resendIn > 0 ? colors.mutedForeground : colors.primary }]}>
                  {resendIn > 0 ? `${t('resendCode')} (${resendIn})` : t('resendCode')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setStep('info'); setError(null); setOtp(''); }}
                disabled={busy}
              >
                <Text style={[styles.linkText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
                  {t('changeNumber')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 40 },
  badge: { alignItems: 'center', gap: 10, marginBottom: 24 },
  badgeText: { color: '#F8F7FA', fontSize: 20, marginTop: 2 },
  title: { color: '#F8F7FA', fontSize: 28 },
  subtitle: { color: 'rgba(248,247,250,0.7)', fontSize: 16, marginTop: 8 },
  form: { paddingHorizontal: 24, flexGrow: 1 },
  label: { color: '#F8F7FA', fontSize: 14, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 12 },
  otpInfo: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  error: { fontSize: 13, marginTop: 12 },
  btnWrap: { marginTop: 28, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 54, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  otpActions: { marginTop: 20, justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 14, paddingVertical: 8 },
});
