import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

type Plan = {
  id: string;
  nameEn: string;
  nameAr: string;
  subtitleEn: string;
  subtitleAr: string;
  price: string;
  gradient: readonly [string, string];
  popular: boolean;
  benefitsEn: string[];
  benefitsAr: string[];
};

const PLANS: Plan[] = [
  {
    id: 'basic',
    nameEn: 'Basic Package',
    nameAr: 'الباقة الأساسية',
    subtitleEn: 'Daily Use',
    subtitleAr: 'للاستخدام اليومي',
    price: '199',
    gradient: ['#5B2C91', '#7B2A9E'],
    popular: false,
    benefitsEn: [
      'Battery charge — 6 times',
      'Fuel supply — 6 times',
      'Tire change — 6 times',
      'Light electrical & mechanical maintenance — 2 times',
      'Emergency car towing — 2 times',
    ],
    benefitsAr: [
      'شحن البطارية — 6 مرات',
      'تزويد الوقود — 6 مرات',
      'تغيير الإطارات — 6 مرات',
      'صيانة كهربائية وميكانيكية خفيفة — مرتان',
      'سحب السيارة في حالات الطوارئ — مرتان',
    ],
  },
  {
    id: 'accidents',
    nameEn: 'Accidents Package',
    nameAr: 'باقة الحوادث',
    subtitleEn: 'Emergency Coverage',
    subtitleAr: 'لحالات الطوارئ',
    price: '299',
    gradient: ['#2D1B69', '#5B2C91'],
    popular: true,
    benefitsEn: [
      'Battery charge — 6 times',
      'Fuel supply — 6 times',
      'Tire change — 6 times',
      'Light electrical & mechanical maintenance',
      'Car towing in breakdowns — 2 times',
      'Transfer to accident assessment center',
      'Workshop of client\'s choice',
    ],
    benefitsAr: [
      'شحن البطارية — 6 مرات',
      'تزويد الوقود — 6 مرات',
      'تغيير الإطارات — 6 مرات',
      'صيانة كهربائية وميكانيكية خفيفة',
      'سحب السيارة في حالة العطل — مرتان',
      'نقل سيارة الحادث إلى مركز تقدير الحوادث',
      'ورشة من اختيار العميل',
    ],
  },
  {
    id: 'rental',
    nameEn: 'Rental Package',
    nameAr: 'باقة الإجرة',
    subtitleEn: 'Full Coverage & Comfort',
    subtitleAr: 'تغطية شاملة وراحة تامة',
    price: '600',
    gradient: ['#8B35BB', '#C21875'],
    popular: false,
    benefitsEn: [
      'Battery charge — 6 times',
      'Fuel supply — 6 times',
      'Tire change — 6 times',
      'Light electrical & mechanical maintenance — 2 times',
      'Car towing in breakdowns — 2 times',
      'Computer fault diagnostics — 3 times',
    ],
    benefitsAr: [
      'شحن البطاريات — 6 مرات',
      'تزويد الوقود — 6 مرات',
      'تغيير الإطارات — 6 مرات',
      'صيانة كهربائية وميكانيكية خفيفة — مرتان',
      'سحب السيارة في حالة العطل — مرتان',
      'كشف الأعطال بالكمبيوتر — 3 مرات',
    ],
  },
];

const PLAN_ICONS = {
  basic:     { name: 'build',      lib: 'Ion' },
  accidents: { name: 'warning',    lib: 'Ion' },
  rental:    { name: 'car-sport',  lib: 'Ion' },
};

export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const { isRTL, font, t } = useLanguage();
  const router = useRouter();

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  function handleSubscribe(plan: Plan) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/subscribe/${plan.id}` as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2FA' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1E0D4E', '#3D2080', '#6A2597']}
        locations={[0, 0.55, 1]}
        style={[styles.header, { paddingTop: insets.top + 20 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="star" size={28} color="#FFD700" />
        </View>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isRTL ? 'باقات جاي' : 'JAI Packages'}
        </Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
          {isRTL
            ? 'خدمات متكاملة لمركبتك على مدار الساعة'
            : 'Complete vehicle services, around the clock'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 140 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
      >
        {PLANS.map((plan) => {
          const name     = isRTL ? plan.nameAr     : plan.nameEn;
          const subtitle = isRTL ? plan.subtitleAr : plan.subtitleEn;
          const benefits = isRTL ? plan.benefitsAr : plan.benefitsEn;
          const isActive = user?.membership === plan.id;
          const icon = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS];

          return (
            <View
              key={plan.id}
              style={[styles.card, plan.popular && styles.cardPopular]}
            >
              {/* Popular ribbon */}
              {plan.popular && (
                <LinearGradient
                  colors={['#C21875', '#8B35BB']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.ribbon}
                >
                  <Ionicons name="star" size={11} color="#FFD700" />
                  <Text style={[styles.ribbonText, { fontFamily: font.bold }]}>
                    {isRTL ? 'الأكثر طلباً' : 'MOST POPULAR'}
                  </Text>
                  <Ionicons name="star" size={11} color="#FFD700" />
                </LinearGradient>
              )}

              {/* Gradient body */}
              <LinearGradient
                colors={plan.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.gradientBody}
              >
                {/* Plan header row */}
                <View style={[styles.planHeaderRow, { flexDirection: rowDir }]}>
                  <View style={styles.planIconWrap}>
                    <Ionicons name={icon.name as any} size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { fontFamily: font.bold, textAlign: align }]}>
                      {name}
                    </Text>
                    <Text style={[styles.planSubtitle, { fontFamily: font.regular, textAlign: align }]}>
                      {subtitle}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
                      <Text style={[styles.activeBadgeText, { fontFamily: font.semibold }]}>
                        {isRTL ? 'نشط' : 'Active'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Price */}
                <View style={[styles.priceRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.priceNum, { fontFamily: font.bold }]}>{plan.price}</Text>
                  <View style={styles.priceMeta}>
                    <Text style={[styles.priceCurrency, { fontFamily: font.semibold }]}>
                      {isRTL ? 'ريال' : 'SAR'}
                    </Text>
                    <Text style={[styles.pricePeriod, { fontFamily: font.regular }]}>
                      / {isRTL ? 'سنوياً' : 'year'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Benefits */}
                {benefits.map((b, i) => (
                  <View key={i} style={[styles.benefitRow, { flexDirection: rowDir }]}>
                    <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.95)" />
                    <Text style={[styles.benefitText, { fontFamily: font.regular, textAlign: align }]}>
                      {b}
                    </Text>
                  </View>
                ))}
              </LinearGradient>

              {/* Subscribe button */}
              <TouchableOpacity
                style={[styles.subscribeBtn, isActive && styles.subscribeBtnActive]}
                activeOpacity={0.85}
                disabled={isActive}
                onPress={() => handleSubscribe(plan)}
              >
                {isActive ? (
                  <View style={[styles.subscribeBtnInner, { flexDirection: rowDir }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                    <Text style={[styles.subscribeBtnText, { fontFamily: font.bold, color: '#6B7280' }]}>
                      {isRTL ? 'باقتك الحالية' : 'Current Plan'}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={plan.gradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.subscribeBtnGrad}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={[styles.subscribeBtnText, { fontFamily: font.bold, color: '#FFFFFF' }]}>
                      {isRTL ? 'اشترك الآن' : 'Subscribe Now'}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
          <Text style={[styles.footerNoteText, { fontFamily: font.regular, textAlign: align }]}>
            {isRTL
              ? 'يتم تفعيل العضوية خلال 48 ساعة بعد الشراء. مدة الاشتراك سنة كاملة تبدأ من تاريخ التفعيل. التسجيل على مركبة واحدة فقط.'
              : 'Membership is activated within 48 hours of purchase. Valid for one full year from activation date. Registration on one vehicle only.'}
          </Text>
        </View>

        {/* Bottom perks row */}
        <View style={[styles.perksRow, { flexDirection: rowDir }]}>
          {[
            { icon: 'time-outline',     en: '24/7 Service',     ar: 'خدمة 24/7'          },
            { icon: 'location-outline', en: 'All KSA',          ar: 'جميع مناطق المملكة' },
            { icon: 'flash-outline',    en: 'Fast Response',    ar: 'استجابة سريعة'       },
          ].map((p) => (
            <View key={p.en} style={styles.perkItem}>
              <View style={styles.perkIconWrap}>
                <Ionicons name={p.icon as any} size={18} color="#5B2C91" />
              </View>
              <Text style={[styles.perkText, { fontFamily: font.medium }]}>
                {isRTL ? p.ar : p.en}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingBottom: 40,
    alignItems: 'center', gap: 8,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 14,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 26, color: '#FFFFFF' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  scrollContent: { padding: 16, paddingTop: 20 },

  // Card
  card: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 20,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
    backgroundColor: '#FFFFFF',
  },
  cardPopular: { borderWidth: 2, borderColor: '#C21875' },

  ribbon: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 8,
  },
  ribbonText: { fontSize: 11, color: '#FFFFFF', letterSpacing: 1.5 },

  gradientBody: { padding: 22 },

  planHeaderRow: { alignItems: 'center', gap: 12, marginBottom: 18 },
  planIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  planName:     { fontSize: 20, color: '#FFFFFF', marginBottom: 2 },
  planSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  activeBadgeText: { fontSize: 12, color: '#2ECC71' },

  priceRow: { alignItems: 'baseline', gap: 8, marginBottom: 20 },
  priceNum:      { fontSize: 52, color: '#FFFFFF', lineHeight: 56 },
  priceMeta:     { gap: 0 },
  priceCurrency: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  pricePeriod:   { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },

  benefitRow: { alignItems: 'center', gap: 10, marginBottom: 11 },
  benefitText: { fontSize: 14, color: 'rgba(255,255,255,0.92)', flex: 1, lineHeight: 20 },

  // Subscribe button
  subscribeBtn: { margin: 16, borderRadius: 14, overflow: 'hidden' },
  subscribeBtnActive: { backgroundColor: '#F4F2FA', borderWidth: 1.5, borderColor: '#E0DBEF' },
  subscribeBtnInner: { paddingVertical: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  subscribeBtnGrad: {
    flexDirection: 'row', paddingVertical: 16,
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  subscribeBtnText: { fontSize: 15 },

  // Footer note
  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  footerNoteText: { fontSize: 13, color: '#6B7280', lineHeight: 20, flex: 1 },

  // Perks
  perksRow: { gap: 10, marginBottom: 8 },
  perkItem: { flex: 1, alignItems: 'center', gap: 8 },
  perkIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center',
  },
  perkText: { fontSize: 11, color: '#5B2C91', textAlign: 'center' },
});
