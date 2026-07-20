import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const JAI_LOGO = require('../assets/images/logo.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function RoleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setRole } = useApp();
  const { lang, font, toggleLanguage } = useLanguage();
  const isAR = lang === 'ar';

  const pick = async (role: 'customer' | 'technician') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await setRole(role);
    router.replace(role === 'customer' ? '/auth' : '/driver-auth');
  };

  return (
    <View style={styles.root}>
      {/* Full-screen gradient background */}
      <LinearGradient
        colors={['#1A0845', '#2D1B69', '#5B2C91']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 16,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Lang toggle */}
        <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
          <Ionicons name="language-outline" size={15} color="rgba(255,255,255,0.85)" />
          <Text style={[styles.langText, { fontFamily: font.medium }]}>
            {isAR ? 'English' : 'العربية'}
          </Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={JAI_LOGO} style={styles.logoImg} resizeMode="contain" />
          <Text style={[styles.title, { fontFamily: font.bold }]}>
            {isAR ? 'مرحباً بك في جاي' : 'Welcome to JAI'}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
            {isAR ? 'من أنت؟' : 'Who are you?'}
          </Text>
        </View>

        {/* Customer card */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => pick('customer')} style={styles.cardWrap}>
          <View style={[styles.card, styles.cardLight]}>
            <LinearGradient colors={['#2D1B69', '#5B2C91']} style={styles.cardIcon}>
              <Ionicons name="person-outline" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.cardTitle, { fontFamily: font.bold, color: '#1A1A1A' }]}>
              {isAR ? 'عميل' : 'Customer'}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: font.regular, color: '#6B7280' }]}>
              {isAR ? 'أحتاج مساعدة على الطريق' : 'I need roadside assistance'}
            </Text>
            <View style={[styles.arrow, { backgroundColor: '#F0ECFB' }]}>
              <Ionicons name={isAR ? 'arrow-back' : 'arrow-forward'} size={18} color="#2D1B69" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Technician card */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => pick('technician')} style={[styles.cardWrap, { marginTop: 16 }]}>
          <View style={[styles.card, styles.cardDark]}>
            <LinearGradient colors={['#C21875', '#7B2A9E']} style={styles.cardIcon}>
              <Ionicons name="construct-outline" size={32} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.cardTitle, { fontFamily: font.bold, color: '#EEEDF5' }]}>
              {isAR ? 'فني' : 'Technician'}
            </Text>
            <Text style={[styles.cardSub, { fontFamily: font.regular, color: '#8E8A9D' }]}>
              {isAR ? 'موظف جاي — أستلم الطلبات' : 'JAI staff — I receive requests'}
            </Text>
            <View style={[styles.arrow, { backgroundColor: 'rgba(194,24,117,0.2)' }]}>
              <Ionicons name={isAR ? 'arrow-back' : 'arrow-forward'} size={18} color="#C21875" />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={[styles.footer, { fontFamily: font.regular }]}>
          {isAR ? 'يمكنك التبديل لاحقاً من إعدادات حسابك' : 'You can switch later from your account settings'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },

  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 8,
  },
  langText: { color: '#FFFFFF', fontSize: 13 },

  hero: { alignItems: 'center', marginBottom: 32 },
  logoImg: {
    width: 88, height: 88, borderRadius: 22,
    marginBottom: 20,
  },
  title: { color: '#FFFFFF', fontSize: 28, marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },

  cardWrap: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  card: { borderRadius: 20, padding: 24 },
  cardLight: { backgroundColor: '#FFFFFF' },
  cardDark: { backgroundColor: '#1A1726', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 22, marginBottom: 6 },
  cardSub: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  footer: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 28 },
});
