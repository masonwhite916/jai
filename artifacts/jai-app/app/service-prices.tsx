import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { useApp } from '@/context/AppContext';

type ServiceRow = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  nameEn: string;
  nameAr: string;
  price: string | null;   // null = always free
  noteEn?: string;
  noteAr?: string;
};

/** Which service IDs each plan covers (free of charge). */
const PLAN_COVERED: Record<string, string[]> = {
  basic:     ['battery', 'fuel', 'tire', 'tow_emergency', 'tow_breakdown', 'mechanic'],
  accidents: ['battery', 'fuel', 'tire', 'tow_emergency', 'tow_breakdown', 'mechanic', 'accident_transport', 'workshop'],
  rental:    ['battery', 'fuel', 'tire', 'tow_emergency', 'tow_breakdown', 'mechanic', 'diagnostics'],
  premium:   ['battery', 'fuel', 'tire', 'tow_emergency', 'tow_breakdown', 'mechanic', 'lockout', 'diagnostics'],
};

const SERVICES: ServiceRow[] = [
  {
    id: 'battery',
    icon: 'battery-charging-outline',
    nameEn: 'Battery Charge',
    nameAr: 'شحن البطارية',
    price: '120',
  },
  {
    id: 'fuel',
    icon: 'water-outline',
    nameEn: 'Fuel Delivery',
    nameAr: 'تزويد الوقود',
    price: '100',
    noteEn: 'Delivery fee only — fuel cost charged separately',
    noteAr: 'سعر التوصيل فقط، دون احتساب سعر الوقود',
  },
  {
    id: 'tire',
    icon: 'settings-outline',
    nameEn: 'Tire Change',
    nameAr: 'تغيير الإطارات',
    price: '120',
  },
  {
    id: 'mechanic',
    icon: 'construct-outline',
    nameEn: 'Light Electrical & Mechanical Repair',
    nameAr: 'صيانة كهربائية وميكانيكية خفيفة',
    price: '200',
  },
  {
    id: 'tow_emergency',
    icon: 'car-outline',
    nameEn: 'Emergency Tow',
    nameAr: 'سحب السيارة في حالات الطوارئ',
    price: '250',
    noteEn: 'Average distance within city',
    noteAr: 'لمسافة متوسطة داخل المدينة',
  },
  {
    id: 'tow_breakdown',
    icon: 'car-outline',
    nameEn: 'Breakdown Tow',
    nameAr: 'سحب السيارة في حالة العطل',
    price: '250',
    noteEn: 'Average distance within city',
    noteAr: 'لمسافة متوسطة داخل المدينة',
  },
  {
    id: 'accident_transport',
    icon: 'navigate-outline',
    nameEn: 'Accident Transport to Assessment Centre',
    nameAr: 'نقل سيارة الحادث إلى مركز تقدير الحوادث',
    price: '150',
  },
  {
    id: 'workshop',
    icon: 'business-outline',
    nameEn: "Workshop Referral (client's choice)",
    nameAr: 'ورشة من اختيار العميل',
    price: null,
    noteEn: 'Facilitation service — no direct charge',
    noteAr: 'خدمة تسهيلية دون تكلفة مباشرة',
  },
  {
    id: 'diagnostics',
    icon: 'laptop-outline',
    nameEn: 'Computer Fault Diagnostics',
    nameAr: 'كشف الأعطال بالكمبيوتر',
    price: '80',
  },
  {
    id: 'carwash',
    icon: 'sparkles-outline',
    nameEn: 'Car Wash',
    nameAr: 'غسيل السيارة',
    price: '29',
    noteEn: 'Fixed price',
    noteAr: 'سعر ثابت',
  },
];

export default function ServicePricesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRTL, font } = useLanguage();
  const { user } = useApp();
  const align = isRTL ? 'right' : 'left';
  const rowDir: 'row' | 'row-reverse' = isRTL ? 'row-reverse' : 'row';
  const membership = user?.membership ?? 'none';
  const coveredIds = PLAN_COVERED[membership] ?? [];

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={['#1E0D4E', '#3D2080', '#6A2597']}
        locations={[0, 0.55, 1]}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerIconWrap}>
          <Ionicons name="pricetag-outline" size={26} color="#FFD700" />
        </View>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isRTL ? 'أسعار الخدمات المفردة' : 'Individual Service Prices'}
        </Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
          {isRTL
            ? 'الأسعار تقديرية بناءً على متوسط السوق السعودي'
            : 'Estimated prices based on average Saudi market rates'}
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
      >
        {/* Covered-by-plan banner */}
        {membership !== 'none' && (
          <View style={[styles.planBanner, { flexDirection: rowDir }]}>
            <Ionicons name="shield-checkmark" size={16} color="#2ECC71" />
            <Text style={[styles.planBannerText, { fontFamily: font.medium, textAlign: align }]}>
              {isRTL
                ? 'الخدمات المميزة بالأخضر مشمولة مجاناً بباقتك الحالية'
                : 'Services highlighted in green are free under your current plan'}
            </Text>
          </View>
        )}

        {SERVICES.map((svc, i) => {
          const covered = svc.price === null || coveredIds.includes(svc.id);
          return (
            <View
              key={svc.id}
              style={[
                styles.row,
                { flexDirection: rowDir },
                i < SERVICES.length - 1 && styles.rowDivider,
                covered && styles.rowCovered,
              ]}
            >
              <View style={[styles.iconWrap, covered && styles.iconWrapCovered]}>
                <Ionicons name={svc.icon} size={20} color={covered ? '#2ECC71' : '#5B2C91'} />
              </View>

              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { fontFamily: font.semibold, textAlign: align }]}>
                  {isRTL ? svc.nameAr : svc.nameEn}
                </Text>
                {(svc.noteEn || svc.noteAr) ? (
                  <Text style={[styles.rowNote, { fontFamily: font.regular, textAlign: align }]}>
                    {isRTL ? svc.noteAr : svc.noteEn}
                  </Text>
                ) : null}
              </View>

              <View style={styles.priceWrap}>
                {covered ? (
                  <View style={{ alignItems: 'flex-end', gap: 1 }}>
                    {svc.price && (
                      <Text style={[styles.priceStrike, { fontFamily: font.regular }]}>{svc.price} {isRTL ? 'ر.س' : 'SAR'}</Text>
                    )}
                    <Text style={[styles.priceFree, { fontFamily: font.semibold }]}>
                      {isRTL ? 'مجاناً' : 'Free'}
                    </Text>
                  </View>
                ) : svc.price ? (
                  <>
                    <Text style={[styles.priceNum, { fontFamily: font.bold }]}>{svc.price}</Text>
                    <Text style={[styles.priceCur, { fontFamily: font.regular }]}>
                      {isRTL ? 'ر.س' : 'SAR'}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.priceFree, { fontFamily: font.semibold }]}>
                    {isRTL ? 'مجاناً' : 'Free'}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { flexDirection: rowDir }]}>
          <Ionicons name="information-circle-outline" size={15} color="#9CA3AF" />
          <Text style={[styles.disclaimerText, { fontFamily: font.regular, textAlign: align }]}>
            {isRTL
              ? 'الأسعار تقديرية وقد تتفاوت حسب الموقع والظروف. غسيل السيارة بسعر ثابت محدد مسبقاً.'
              : 'Prices are estimates and may vary by location and conditions. Car wash has a fixed pre-set price.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F2FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  backBtn: {
    width: '100%',
    paddingBottom: 4,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  list: {
    padding: 16,
    paddingTop: 12,
  },

  // Plan banner
  planBanner: {
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderRadius: 12, padding: 12, marginBottom: 8,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)',
  },
  planBannerText: { fontSize: 13, color: '#1A1A1A', flex: 1, lineHeight: 18 },

  row: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EDE8F8',
  },
  rowCovered: { backgroundColor: 'rgba(46,204,113,0.05)' },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginLeft: 14,
    flexShrink: 0,
  },
  iconWrapCovered: { backgroundColor: 'rgba(46,204,113,0.15)' },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    color: '#1F1235',
    lineHeight: 20,
  },
  rowNote: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 17,
    marginTop: 2,
  },

  priceWrap: {
    alignItems: 'flex-end',
    marginLeft: 12,
    marginRight: 12,
    flexShrink: 0,
  },
  priceNum: {
    fontSize: 22,
    color: '#5B2C91',
    lineHeight: 26,
  },
  priceCur: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  priceFree: {
    fontSize: 14,
    color: '#2ECC71',
  },
  priceStrike: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },

  disclaimer: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    flex: 1,
    marginLeft: 6,
    marginRight: 6,
  },
});
