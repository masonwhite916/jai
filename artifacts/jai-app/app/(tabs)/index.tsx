import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const JAI_LOGO = require('../../assets/images/jai-logo.png');
const { width } = Dimensions.get('window');

type ServiceDef = {
  id: string;
  labelKey: TranslationKeys;
  icon: string;
  lib: 'Ionicons' | 'MCIcons';
  color: string;
};

const SERVICES: ServiceDef[] = [
  { id: 'battery', labelKey: 'battery', icon: 'battery-charging', lib: 'Ionicons', color: '#2D1B69' },
  { id: 'fuel', labelKey: 'fuel', icon: 'gas-station', lib: 'MCIcons', color: '#5B2C91' },
  { id: 'tire', labelKey: 'tire', icon: 'tire', lib: 'MCIcons', color: '#7B2A9E' },
  { id: 'tow', labelKey: 'tow', icon: 'tow-truck', lib: 'MCIcons', color: '#C21875' },
  { id: 'lockout', labelKey: 'lockout', icon: 'key', lib: 'Ionicons', color: '#2D1B69' },
  { id: 'mechanic', labelKey: 'mechanic', icon: 'wrench', lib: 'MCIcons', color: '#5B2C91' },
  { id: 'electric', labelKey: 'electric', icon: 'flash', lib: 'Ionicons', color: '#C21875' },
];

function ServiceIcon({ icon, lib, color }: { icon: string; lib: string; color: string }) {
  if (lib === 'Ionicons') return <Ionicons name={icon as any} size={26} color={color} />;
  return <MaterialCommunityIcons name={icon as any} size={26} color={color} />;
}

function PulsingButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity style={styles.sosButton} onPress={onPress} activeOpacity={0.85}>
        <LinearGradient colors={['#E74C3C', '#C0392B']} style={styles.sosGradient}>
          <Ionicons name="warning" size={28} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const { t, isRTL, font } = useLanguage();

  const firstName = user?.name?.split(' ')[0] ?? 'Guest';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  function handleService(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/request/${id}` as any);
  }

  function handleSOS() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/request/tow' as any);
  }

  const OFFERS = [
    { id: '1', title: t('offer1Title'), subtitle: t('offer1Sub'), badge: t('hot') },
    { id: '2', title: t('offer2Title'), subtitle: t('offer2Sub'), badge: t('new') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91', '#7B2A9E']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.headerTop, { flexDirection: rowDir }]}>
          <Image source={JAI_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingRow}>
          <Text style={[styles.greeting, { fontFamily: font.regular, textAlign: align }]}>{t('goodMorning')}</Text>
          <Text style={[styles.userName, { fontFamily: font.bold, textAlign: align }]}>{firstName} 👋</Text>
        </View>

        <TouchableOpacity style={[styles.locationRow, { flexDirection: rowDir }]}>
          <Ionicons name="location-sharp" size={16} color="#C21875" />
          <Text style={[styles.locationText, { fontFamily: font.regular }]}>{t('locationCity')}</Text>
          <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.searchBar, { flexDirection: rowDir }]}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <Text style={[styles.searchPlaceholder, { fontFamily: font.regular, textAlign: align }]}>
            {t('searchPlaceholder')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.sosRow, { flexDirection: rowDir }]}>
          <PulsingButton onPress={handleSOS} />
          <View style={styles.sosLabel}>
            <Text style={[styles.sosLabelTitle, { fontFamily: font.bold, textAlign: align }]}>{t('emergencyLabel')}</Text>
            <Text style={[styles.sosLabelSub, { fontFamily: font.regular, textAlign: align }]}>{t('emergencyTap')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {user?.membership !== 'none' && (
          <TouchableOpacity style={styles.memberBadge} onPress={() => router.push('/(tabs)/membership' as any)}>
            <LinearGradient colors={['#2D1B69', '#C21875']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.memberBadgeGradient, { flexDirection: rowDir }]}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={[styles.memberBadgeText, { fontFamily: font.semibold, flex: 1, textAlign: align }]}>
                {t('premiumMember')}
              </Text>
              <Text style={[styles.memberPoints, { fontFamily: font.semibold }]}>{user?.points} {t('pts')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('chooseService')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
            {SERVICES.map((svc) => (
              <TouchableOpacity key={svc.id} style={styles.serviceCard} onPress={() => handleService(svc.id)} activeOpacity={0.8}>
                <View style={[styles.serviceIconBg, { backgroundColor: svc.color + '15' }]}>
                  <ServiceIcon icon={svc.icon} lib={svc.lib} color={svc.color} />
                </View>
                <Text style={[styles.serviceLabel, { fontFamily: font.medium }]}>{t(svc.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('quickContact')}</Text>
          <View style={[styles.contactRow, { flexDirection: rowDir }]}>
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: '#25D366' }]} activeOpacity={0.85}>
              <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              <Text style={[styles.contactLabel, { fontFamily: font.semibold }]}>{t('whatsapp')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: '#2D1B69' }]} activeOpacity={0.85}>
              <Ionicons name="call" size={24} color="#FFFFFF" />
              <Text style={[styles.contactLabel, { fontFamily: font.semibold }]}>{t('callCenter')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('nearbyTechs')}</Text>
          <View style={[styles.nearbyCard, { flexDirection: rowDir }]}>
            <View style={styles.nearbyDot} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nearbyCount, { fontFamily: font.semibold, textAlign: align }]}>{t('techsNearby')}</Text>
              <Text style={[styles.nearbyRadius, { fontFamily: font.regular, textAlign: align }]}>{t('within5km')}</Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={[styles.nearbyEtaText, { fontFamily: font.bold }]}>~8 {isRTL ? 'دقيقة' : 'min'}</Text>
              <Text style={[styles.nearbyEtaLabel, { fontFamily: font.regular }]}>{t('avgETA')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('latestOffers')}</Text>
          {OFFERS.map((offer) => (
            <TouchableOpacity key={offer.id} style={styles.offerCard} activeOpacity={0.85}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.offerGradient}>
                <View style={[styles.offerBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.offerBadgeText, { fontFamily: font.bold }]}>{offer.badge}</Text>
                </View>
                <Text style={[styles.offerTitle, { fontFamily: font.bold, textAlign: align }]}>{offer.title}</Text>
                <Text style={[styles.offerSubtitle, { fontFamily: font.regular, textAlign: align }]}>{offer.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerLogo: { width: 120, height: 52 },
  greetingRow: { marginBottom: 6 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  locationRow: { alignItems: 'center', gap: 4, marginBottom: 14 },
  locationText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', gap: 10, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  searchPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.5)', flex: 1 },
  sosRow: { alignItems: 'center', gap: 16 },
  sosButton: {
    borderRadius: 28, overflow: 'hidden',
    shadowColor: '#E74C3C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  sosGradient: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', gap: 2 },
  sosText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  sosLabel: {},
  sosLabelTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sosLabelSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  memberBadge: { marginHorizontal: 20, marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  memberBadgeGradient: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  memberBadgeText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  memberPoints: { fontSize: 14, color: '#FFD700' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  servicesScroll: { gap: 12, paddingRight: 20 },
  serviceCard: { alignItems: 'center', gap: 8, width: 80 },
  serviceIconBg: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  serviceLabel: { fontSize: 12, color: '#1A1A1A', textAlign: 'center' },
  contactRow: { gap: 12 },
  contactCard: {
    flex: 1, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  contactLabel: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  nearbyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  nearbyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71' },
  nearbyCount: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  nearbyRadius: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  nearbyEtaText: { fontSize: 18, fontWeight: '700', color: '#2D1B69' },
  nearbyEtaLabel: { fontSize: 11, color: '#6B7280' },
  offerCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  offerGradient: { padding: 18 },
  offerBadge: { backgroundColor: '#C21875', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  offerBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  offerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  offerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});
