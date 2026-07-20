import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useColors();
  const { login } = useDriver();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const driverName = name.trim() || (isRTL ? 'سائق ضيف' : 'Guest Driver');
    const driverPhone = phone.trim() || '+966 55 000 0000';
    login({
      id: 'd-' + Date.now().toString(),
      name: driverName,
      phone: driverPhone,
      rating: 4.8,
      jobsCompleted: 0,
      isOnline: true,
      earnings: { today: 0, week: 0, month: 0, total: 0 },
    });
    router.replace('/(tabs)');
  };

  const handleGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    login({
      id: 'd-guest',
      name: isRTL ? 'سائق ضيف' : 'Guest Driver',
      phone: '+966 55 000 0000',
      rating: 4.8,
      jobsCompleted: 124,
      isOnline: true,
      earnings: { today: 340, week: 1280, month: 5120, total: 18900 },
    });
    router.replace('/(tabs)');
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
        <Text style={[styles.title, { fontFamily: font.bold }]}>{t('welcome')}</Text>
        <Text style={[styles.subtitle, { fontFamily: font.regular }]}>{t('signIn')}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: insets.bottom + 24, paddingTop: 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { fontFamily: font.medium, textAlign }]}>{t('nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={isRTL ? 'أحمد العتيبي' : 'Ahmed Al-Dossari'}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { fontFamily: font.regular, textAlign, color: colors.text }]}
        />

        <Text style={[styles.label, { fontFamily: font.medium, textAlign, marginTop: 20 }]}>{t('phoneLabel')}</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder={t('phoneHint')}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          style={[styles.input, { fontFamily: font.regular, textAlign, color: colors.text }]}
        />

        <TouchableOpacity activeOpacity={0.85} onPress={handleLogin} style={styles.btnWrap}>
          <LinearGradient colors={['#C21875', '#7B2A9E']} start={[0, 0]} end={[1, 0]} style={styles.btn}>
            <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t('continue')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={handleGuest} style={styles.guestBtn}>
          <Text style={[styles.guestText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {t('guestContinue')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 40 },
  badge: { alignItems: 'center', gap: 10, marginBottom: 24 },
  badgeText: { color: '#F8F7FA', fontSize: 20, marginTop: 2 },
  title: { color: '#F8F7FA', fontSize: 28, textAlign: 'left' },
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
  btnWrap: { marginTop: 32, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 54, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  guestBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 10 },
  guestText: { fontSize: 15 },
});
