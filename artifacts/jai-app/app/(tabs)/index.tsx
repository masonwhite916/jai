import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, Image, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import { useJaiLocation } from '@/context/LocationContext';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const JAI_LOGO = require('../../assets/images/jai-logo.png');
const { width } = Dimensions.get('window');

// ── Subscription plans (compact — matches membership.tsx) ─────────────────────
const HOME_PLANS = [
  {
    id: 'basic',
    nameEn: 'Basic', nameAr: 'الأساسية',
    subtitleEn: 'Daily Use', subtitleAr: 'للاستخدام اليومي',
    price: '199',
    gradient: ['#5B2C91', '#7B2A9E'] as [string, string],
    popular: false,
  },
  {
    id: 'accidents',
    nameEn: 'Accidents', nameAr: 'الحوادث',
    subtitleEn: 'Emergency Coverage', subtitleAr: 'لحالات الطوارئ',
    price: '299',
    gradient: ['#2D1B69', '#5B2C91'] as [string, string],
    popular: true,
  },
  {
    id: 'rental',
    nameEn: 'Rental', nameAr: 'الإجرة',
    subtitleEn: 'Full Coverage', subtitleAr: 'تغطية شاملة',
    price: '600',
    gradient: ['#8B35BB', '#C21875'] as [string, string],
    popular: false,
  },
];

// 4-column grid: 20px padding each side + 3 gaps of 10px
const CELL = (width - 40 - 30) / 4;

type ServiceDef = { id: string; labelKey: TranslationKeys; icon: string; lib: 'Ion' | 'MCI'; color: string; bg: string };

const SERVICES: ServiceDef[] = [
  { id: 'battery',  labelKey: 'battery',  icon: 'battery-charging',  lib: 'Ion', color: '#2D1B69', bg: '#EDE8F8' },
  { id: 'fuel',     labelKey: 'fuel',     icon: 'gas-station',       lib: 'MCI', color: '#7B2A9E', bg: '#F3E8FC' },
  { id: 'tire',     labelKey: 'tire',     icon: 'tire',              lib: 'MCI', color: '#5B2C91', bg: '#EDE8F8' },
  { id: 'tow',      labelKey: 'tow',      icon: 'tow-truck',         lib: 'MCI', color: '#C21875', bg: '#FCE8F3' },
  { id: 'lockout',  labelKey: 'lockout',  icon: 'key',               lib: 'Ion', color: '#2D1B69', bg: '#EDE8F8' },
  { id: 'mechanic', labelKey: 'mechanic', icon: 'wrench',            lib: 'MCI', color: '#7B2A9E', bg: '#F3E8FC' },
  { id: 'electric', labelKey: 'electric', icon: 'flash',             lib: 'Ion', color: '#C21875', bg: '#FCE8F3' },
];

function SvcIcon({ icon, lib, color }: { icon: string; lib: string; color: string }) {
  if (lib === 'Ion') return <Ionicons name={icon as any} size={26} color={color} />;
  return <MaterialCommunityIcons name={icon as any} size={26} color={color} />;
}

function PulsingSOS({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1000 }), withTiming(1, { duration: 800 })),
      -1, true,
    );
  }, []);
  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 2 - scale.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.sosHitArea}>
      <Animated.View style={[styles.sosRing, ring]} />
      <LinearGradient colors={['#E8285A', '#B01050']} style={styles.sosCore}>
        <Ionicons name="warning" size={22} color="#FFF" />
        <Text style={styles.sosText}>SOS</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useApp();

  useFocusEffect(React.useCallback(() => { void refreshUser(); }, []));
  const { t, isRTL, font } = useLanguage();
  const gps = useJaiLocation();

  const firstName = user?.name?.split(' ')[0] ?? 'Guest';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  function handleSvc(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/request/${id}` as any);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 140 + (Platform.OS === 'web' ? 34 : 0),
        }}
      >
        {/* ── Gradient header with curved bottom ───────────────────────────── */}
        <LinearGradient
          colors={['#1E0D4E', '#3D2080', '#6A2597']}
          locations={[0, 0.55, 1]}
          style={[styles.header, {
            paddingTop: insets.top + 14 + (Platform.OS === 'web' ? 67 : 0),
          }]}
        >
          {/* Logo row */}
          <View style={[styles.logoRow, { flexDirection: rowDir }]}>
            <Image source={JAI_LOGO} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Greeting */}
          <Text style={[styles.greeting, { fontFamily: font.regular, textAlign: 'right', alignSelf: 'flex-end' }]}>
            {t('goodMorning')}
          </Text>
          <Text style={[styles.userName, { fontFamily: font.bold, textAlign: 'right', alignSelf: 'flex-end' }]}>
            {firstName} 👋
          </Text>

          {/* Location */}
          <TouchableOpacity
            style={[styles.locationPill, { flexDirection: rowDir, alignSelf: isRTL ? 'flex-end' : 'flex-start', maxWidth: '85%' }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); gps.refresh(); }}
            disabled={gps.status === 'loading'}
            activeOpacity={0.7}
          >
            {gps.status === 'loading'
              ? <ActivityIndicator size="small" color="#C21875" style={{ transform: [{ scale: 0.65 }] }} />
              : <Ionicons name="location-sharp" size={13} color="#C21875" />}
            <Text style={[styles.locationText, { fontFamily: font.regular }]} numberOfLines={1}>
              {gps.status === 'loading'
                ? t('locating')
                : gps.city ?? gps.shortAddress ?? (gps.status === 'ready' ? t('locationCity') : t('tapToLocate'))}
            </Text>
            <Ionicons name="refresh" size={12} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Member pill */}
          {user && user.membership !== 'none' && (
            <TouchableOpacity
              style={[styles.memberPill, { flexDirection: rowDir, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
              onPress={() => router.push('/(tabs)/membership' as any)}
            >
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={[styles.memberPillText, { fontFamily: font.semibold }]}>{t('premiumMember')}</Text>
              <Text style={[styles.memberPoints, { fontFamily: font.bold }]}>{user.points} {t('pts')}</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
        {/* ── SOS Emergency Card ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.sosCard}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/emergency' as any); }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#C20A30', '#8B1020']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.sosCardGrad, { flexDirection: rowDir }]}
          >
            <View style={styles.sosBtnWrap}>
              <PulsingSOS onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/emergency' as any); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sosTitle, { fontFamily: font.bold, textAlign: align }]}>
                {t('emergencyLabel')}
              </Text>
              <Text style={[styles.sosSub, { fontFamily: font.regular, textAlign: align }]}>
                {t('emergencyTap')}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color="rgba(255,255,255,0.5)"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Subscription Plans ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.sectionRow, { flexDirection: rowDir }]}>
            <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>
              {isRTL ? 'باقاتنا' : 'Our Packages'}
            </Text>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/membership' as any); }}>
              <Text style={[styles.seeAll, { fontFamily: font.medium }]}>
                {isRTL ? 'عرض الكل' : 'See all'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {HOME_PLANS.map((plan) => {
              const isActive = user?.membership === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={isActive ? 1 : 0.88}
                  onPress={() => { if (!isActive) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/subscribe/${plan.id}` as any); } }}
                >
                  <LinearGradient colors={plan.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planCard}>
                    {isActive ? (
                      <View style={styles.planActiveBadge}>
                        <Ionicons name="checkmark-circle" size={9} color="#2ECC71" />
                        <Text style={[styles.planPopularText, { fontFamily: font.bold }]}>
                          {isRTL ? 'نشط' : 'ACTIVE'}
                        </Text>
                      </View>
                    ) : plan.popular ? (
                      <View style={styles.planPopularBadge}>
                        <Ionicons name="star" size={9} color="#FFD700" />
                        <Text style={[styles.planPopularText, { fontFamily: font.bold }]}>
                          {isRTL ? 'الأشهر' : 'TOP'}
                        </Text>
                      </View>
                    ) : <View style={{ height: 22 }} />}
                    <Text style={[styles.planCardName, { fontFamily: font.bold }]}>
                      {isRTL ? plan.nameAr : plan.nameEn}
                    </Text>
                    <Text style={[styles.planCardSub, { fontFamily: font.regular }]}>
                      {isRTL ? plan.subtitleAr : plan.subtitleEn}
                    </Text>
                    <View style={styles.planCardPriceRow}>
                      <Text style={[styles.planCardPrice, { fontFamily: font.bold }]}>{plan.price}</Text>
                      <Text style={[styles.planCardCurrency, { fontFamily: font.regular }]}>
                        {isRTL ? 'ر.س/سنة' : 'SAR/yr'}
                      </Text>
                    </View>
                    <View style={[styles.planCardBtn, isActive && styles.planCardBtnActive]}>
                      {isActive
                        ? <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
                        : null}
                      <Text style={[styles.planCardBtnText, { fontFamily: font.semibold, color: isActive ? '#2ECC71' : '#FFFFFF' }]}>
                        {isActive ? (isRTL ? 'باقتك الحالية' : 'Current Plan') : (isRTL ? 'اشترك' : 'Subscribe')}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Services Grid ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>
            {t('chooseService')}
          </Text>
          <View style={[styles.serviceGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {SERVICES.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.svcCell}
                onPress={() => handleSvc(svc.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.svcIcon, { backgroundColor: svc.bg }]}>
                  <SvcIcon icon={svc.icon} lib={svc.lib} color={svc.color} />
                </View>
                <Text style={[styles.svcLabel, { fontFamily: font.medium }]} numberOfLines={1}>
                  {t(svc.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Quick Contact ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>
            {t('quickContact')}
          </Text>
          <View style={[styles.contactRow, { flexDirection: rowDir }]}>
            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: '#1DA851' }]}
              activeOpacity={0.85}
              onPress={() => Linking.openURL('https://wa.me/966555616449')}
            >
              <View style={styles.contactIconRing}>
                <Ionicons name="logo-whatsapp" size={22} color="#1DA851" />
              </View>
              <Text style={[styles.contactLabel, { fontFamily: font.semibold }]}>{t('whatsapp')}</Text>
              <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactCard, { backgroundColor: '#2D1B69' }]}
              activeOpacity={0.85}
              onPress={() => Linking.openURL('tel:+966555616449')}
            >
              <View style={[styles.contactIconRing, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="call" size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.contactLabel, { fontFamily: font.semibold }]}>{t('callCenter')}</Text>
              <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Nearby Technicians ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>
            {t('nearbyTechs')}
          </Text>
          <View style={styles.nearbyCard}>
            <LinearGradient
              colors={['#F8F5FF', '#FFFFFF']}
              style={[styles.nearbyInner, { flexDirection: rowDir }]}
            >
              <View style={styles.nearbyLeft}>
                <View style={[styles.nearbyDotRow, { flexDirection: rowDir }]}>
                  <View style={styles.nearbyPing} />
                  <Text style={[styles.nearbyCount, { fontFamily: font.bold }]}>12</Text>
                </View>
                <Text style={[styles.nearbySubLabel, { fontFamily: font.regular, textAlign: align }]}>
                  {t('within5km')}
                </Text>
              </View>
              <View style={styles.nearbyDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[styles.etaNum, { fontFamily: font.bold }]}>~8</Text>
                <Text style={[styles.etaUnit, { fontFamily: font.regular }]}>
                  {isRTL ? 'دقيقة' : 'min'}
                </Text>
                <Text style={[styles.etaLabel, { fontFamily: font.regular }]}>{t('avgETA')}</Text>
              </View>
              <View style={styles.nearbyDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={[styles.availBadge, { flexDirection: rowDir }]}>
                  <View style={styles.availDot} />
                  <Text style={[styles.availText, { fontFamily: font.semibold }]}>
                    {isRTL ? 'متاح' : 'Online'}
                  </Text>
                </View>
                <Text style={[styles.etaLabel, { fontFamily: font.regular }]}>
                  {isRTL ? 'الحالة' : 'Status'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* ── Latest Offers ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>
            {t('latestOffers')}
          </Text>

          {/* Offer 1 */}
          <TouchableOpacity
            style={styles.offerCard}
            activeOpacity={0.9}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/membership' as any); }}
          >
            <LinearGradient
              colors={['#2D1B69', '#7B2A9E']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.offerGrad}
            >
              <View style={[styles.offerBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.offerBadgeText, { fontFamily: font.bold }]}>{t('hot')}</Text>
              </View>
              <Text style={[styles.offerTitle, { fontFamily: font.bold, textAlign: align }]}>
                {t('offer1Title')}
              </Text>
              <Text style={[styles.offerSub, { fontFamily: font.regular, textAlign: align }]}>
                {t('offer1Sub')}
              </Text>
              {/* Decorative circles */}
              <View style={styles.offerCircle1} />
              <View style={styles.offerCircle2} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Offer 2 */}
          <TouchableOpacity
            style={styles.offerCard}
            activeOpacity={0.9}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/membership' as any); }}
          >
            <LinearGradient
              colors={['#C21875', '#8B35BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.offerGrad}
            >
              <View style={[styles.offerBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[styles.offerBadgeText, { fontFamily: font.bold }]}>{t('new')}</Text>
              </View>
              <Text style={[styles.offerTitle, { fontFamily: font.bold, textAlign: align }]}>
                {t('offer2Title')}
              </Text>
              <Text style={[styles.offerSub, { fontFamily: font.regular, textAlign: align }]}>
                {t('offer2Sub')}
              </Text>
              <View style={[styles.offerCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={[styles.offerCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F2FA' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 14,
  },
  logoRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { width: 110, height: 48, margin: 1 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  userName: { fontSize: 22, color: '#FFFFFF', marginBottom: 10 },
  locationPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    gap: 5, alignItems: 'center', marginBottom: 10,
  },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  memberPill: {
    backgroundColor: 'rgba(194,24,117,0.22)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    gap: 6, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(194,24,117,0.35)',
  },
  memberPillText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  memberPoints: { fontSize: 12, color: '#FFD700' },

  scroll: { flex: 1 },

  // SOS Card
  sosCard: {
    marginHorizontal: 16, marginTop: 18, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#C20A30', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  sosCardGrad: { paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', gap: 14 },
  sosBtnWrap: { justifyContent: 'center', alignItems: 'center' },
  sosHitArea: {
    width: 70, height: 70,
    justifyContent: 'center', alignItems: 'center',
  },
  sosRing: {
    position: 'absolute',
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,80,80,0.35)',
  },
  sosCore: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center', gap: 1,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  sosText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  sosTitle: { fontSize: 16, color: '#FFFFFF', marginBottom: 4 },
  sosSub: { fontSize: 12, color: 'rgba(255,255,255,0.72)' },

  // Services
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 17, color: '#120840', marginBottom: 16 },
  serviceGrid: { flexWrap: 'wrap', gap: 10 },
  svcCell: { width: CELL, alignItems: 'center', gap: 8 },
  svcIcon: {
    width: CELL - 4, height: CELL - 4,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  svcLabel: { fontSize: 11, color: '#333', textAlign: 'center' },

  // Section header row (title + see-all)
  sectionRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAll: { fontSize: 13, color: '#C21875' },

  // Plan cards (horizontal scroll)
  planCard: {
    width: 150, borderRadius: 20, padding: 16,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  planPopularBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
  },
  planPopularText: { fontSize: 9, color: '#FFFFFF', letterSpacing: 1 },
  planCardName: { fontSize: 16, color: '#FFFFFF', marginBottom: 2 },
  planCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 14 },
  planCardPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  planCardPrice: { fontSize: 28, color: '#FFFFFF' },
  planCardCurrency: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  planActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46,204,113,0.25)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
  },
  planCardBtn: {
    flexDirection: 'row', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center', justifyContent: 'center',
  },
  planCardBtnActive: { backgroundColor: 'rgba(46,204,113,0.2)' },
  planCardBtnText: { fontSize: 13, color: '#FFFFFF' },

  // Contact
  contactRow: { gap: 12 },
  contactCard: {
    flex: 1, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 14,
    gap: 10, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 10, elevation: 6,
  },
  contactIconRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  contactLabel: { fontSize: 13, color: '#FFFFFF', flex: 1 },

  // Nearby
  nearbyCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  nearbyInner: { padding: 20, alignItems: 'center', gap: 12 },
  nearbyLeft: { alignItems: 'center', flex: 1, gap: 6 },
  nearbyDotRow: { alignItems: 'center', gap: 8 },
  nearbyPing: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#2ECC71',
    shadowColor: '#2ECC71', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  nearbyCount: { fontSize: 28, color: '#2D1B69' },
  nearbySubLabel: { fontSize: 11, color: '#9CA3AF' },
  nearbyDivider: { width: 1, height: 48, backgroundColor: '#EBEBF5' },
  etaNum: { fontSize: 28, color: '#5B2C91' },
  etaUnit: { fontSize: 13, color: '#9CA3AF', marginTop: -2 },
  etaLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  availBadge: { gap: 5, alignItems: 'center', marginBottom: 4 },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71' },
  availText: { fontSize: 13, color: '#2ECC71' },

  // Offers
  offerCard: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 7,
  },
  offerGrad: { padding: 22, minHeight: 120, overflow: 'hidden' },
  offerBadge: {
    backgroundColor: '#C21875', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  offerBadgeText: { fontSize: 10, color: '#FFFFFF', letterSpacing: 1.5 },
  offerTitle: { fontSize: 17, color: '#FFFFFF', marginBottom: 5, zIndex: 1 },
  offerSub: { fontSize: 12, color: 'rgba(255,255,255,0.72)', zIndex: 1 },
  offerCircle1: {
    position: 'absolute', right: -20, top: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  offerCircle2: {
    position: 'absolute', right: 40, bottom: -30,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
