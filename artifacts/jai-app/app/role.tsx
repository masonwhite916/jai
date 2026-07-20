import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setRole(role);
    if (role === 'customer') {
      router.replace('/auth');
    } else {
      router.replace('/driver-auth');
    }
  };

  return (
    <LinearGradient
      colors={['#1A0845', '#2D1B69', '#5B2C91']}
      style={[styles.root, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}
    >
      {/* Lang toggle */}
      <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
        <Ionicons name="language-outline" size={15} color="rgba(255,255,255,0.85)" />
        <Text style={[styles.langText, { fontFamily: font.medium }]}>
          {isAR ? 'English' : 'العربية'}
        </Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <LinearGradient colors={['#C21875', '#7B2A9E']} style={styles.logoGrad}>
            <Text style={[styles.logoJ, { fontFamily: font.bold }]}>JAI</Text>
          </LinearGradient>
        </View>
        <Text style={[styles.title, { fontFamily: font.bold }]}>
          {isAR ? 'مرحباً بك في جاي' : 'Welcome to JAI'}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: font.regular }]}>
          {isAR ? 'من أنت؟' : 'Who are you?'}
        </Text>
      </View>

      <View style={styles.cards}>
        {/* Customer */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => pick('customer')} style={styles.cardWrap}>
          <View style={[styles.card, styles.cardLight]}>
            <View style={styles.cardIconWrap}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} style={styles.cardIcon}>
                <Ionicons name="person-outline" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
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

        {/* Technician */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => pick('technician')} style={styles.cardWrap}>
          <View style={[styles.card, styles.cardDark]}>
            <View style={styles.cardIconWrap}>
              <LinearGradient colors={['#C21875', '#7B2A9E']} style={styles.cardIcon}>
                <Ionicons name="construct-outline" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
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
      </View>

      <Text style={[styles.footer, { fontFamily: font.regular }]}>
        {isAR ? 'يمكنك التبديل لاحقاً من إعدادات حسابك' : 'You can switch later from your account settings'}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 8,
  },
  langText: { color: '#FFFFFF', fontSize: 13 },

  hero: { alignItems: 'center', marginTop: 16, marginBottom: 36 },
  logoMark: { marginBottom: 20 },
  logoGrad: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  logoJ: { color: '#FFFFFF', fontSize: 26, letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 28, marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },

  cards: { gap: 16 },
  cardWrap: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  card: { borderRadius: 20, padding: 24 },
  cardLight: { backgroundColor: '#FFFFFF' },
  cardDark: { backgroundColor: '#1A1726', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardIconWrap: { marginBottom: 16 },
  cardIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 22, marginBottom: 6 },
  cardSub: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  footer: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 28 },
});
