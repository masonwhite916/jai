import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Platform, ScrollView, KeyboardAvoidingView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp, DEFAULT_USER } from '@/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type Step = 'phone' | 'otp';

export default function Auth() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useApp();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePhoneSubmit() {
    if (phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('otp');
  }

  async function handleOtpSubmit() {
    if (otp.length < 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Simulate API call
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#2D1B69', '#5B2C91']} style={[styles.header, { paddingTop: insets.top + 24 + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Image
          source={require('../assets/images/jai-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {step === 'phone' ? (
          <>
            <Text style={styles.heading}>Enter your mobile number</Text>
            <Text style={styles.hint}>We'll send a verification code to confirm your number</Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇸🇦 +966</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="5X XXX XXXX"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handlePhoneSubmit} activeOpacity={0.85}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnText}>Send OTP</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#2D1B69" />
              <Text style={styles.backText}>Change Number</Text>
            </TouchableOpacity>

            <Text style={styles.heading}>Enter Verification Code</Text>
            <Text style={styles.hint}>Sent to +966 {phone}</Text>

            <TextInput
              style={[styles.phoneInput, styles.otpInput]}
              placeholder="---- "
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.btn} onPress={handleOtpSubmit} activeOpacity={0.85} disabled={loading}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn}>
              <Text style={styles.resendText}>Resend code in 60s</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.8}>
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: { width: 180, height: 80 },
  body: { flex: 1, backgroundColor: '#FFFFFF' },
  bodyContent: { padding: 28 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  hint: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 28, lineHeight: 20 },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countryCode: {
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBF5',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  countryCodeText: { fontSize: 15, color: '#1A1A1A', fontFamily: 'Inter_500Medium' },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBF5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#1A1A1A',
    fontFamily: 'Inter_500Medium',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    marginBottom: 8,
  },
  error: { fontSize: 13, color: '#E74C3C', marginBottom: 12, fontFamily: 'Inter_400Regular' },
  btn: { borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  btnGradient: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { color: '#2D1B69', fontSize: 15, fontFamily: 'Inter_500Medium' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: '#6B7280', fontSize: 14, fontFamily: 'Inter_400Regular' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#EBEBF5' },
  dividerText: { fontSize: 13, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  guestBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EBEBF5',
    paddingVertical: 16,
    alignItems: 'center',
  },
  guestText: { fontSize: 15, color: '#6B7280', fontFamily: 'Inter_500Medium' },
});
