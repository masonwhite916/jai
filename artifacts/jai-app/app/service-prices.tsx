import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';

type ServiceRow = {
  iconEn: string;
  nameEn: string;
  nameAr: string;
  price: string | null;   // null = free
  noteEn?: string;
  noteAr?: string;
};

const SERVICES: ServiceRow[] = [
  {
    iconEn: 'battery-charging',
    nameEn: 'Battery Charge',
    nameAr: 'شحن البطارية',
    price: '120',
  },
  {
    iconEn: 'water',
    nameEn: 'Fuel Delivery',
    nameAr: 'تزويد الوقود',
    price: '100',
    noteEn: 'Delivery fee only — fuel cost charged separately',
    noteAr: 'سعر التوصيل فقط، دون احتساب سعر الوقود',
  },
  {
    iconEn: 'settings',
    nameEn: 'Tire Change',
    nameAr: 'تغيير الإطارات',
    price: '120',
  },
  {
    iconEn: 'construct',
    nameEn: 'Light Electrical & Mechanical Repair',
    nameAr: 'صيانة كهربائية وميكانيكية خفيفة',
    price: '200',
  },
  {
    iconEn: 'car',
    nameEn: 'Emergency Tow',
    nameAr: 'سحب السيارة في حالات الطوارئ',
    price: '250',
    noteEn: 'Average distance within city',
    noteAr: 'لمسافة متوسطة داخل المدينة',
  },
  {
    iconEn: 'car',
    nameEn: 'Breakdown Tow',
    nameAr: 'سحب السيارة في حالة العطل',
    price: '250',
    noteEn: 'Average distance within city',
    noteAr: 'لمسافة متوسطة داخل المدينة',
  },
  {
    iconEn: 'navigate',
    nameEn: 'Accident Transport to Assessment Centre',
    nameAr: 'نقل سيارة الحادث إلى مركز تقدير الحوادث',
    price: '150',
  },
  {
    iconEn: 'business',
    nameEn: 'Workshop Referral (client\'s choice)',
    nameAr: 'ورشة من اختيار العميل',
    price: null,
    noteEn: 'Facilitation service — no direct charge',
    noteAr: 'خدمة تسهيلية دون تكلفة مباشرة',
  },
  {
    iconEn: 'laptop',
    nameEn: 'Computer Fault Diagnostics',
    nameAr: 'كشف الأعطال بالكمبيوتر',
    price: '80',
  },
  {
    iconEn: 'sparkles',
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
  const align = isRTL ? 'right' : 'left';
  const rowDir: 'row' | 'row-reverse' = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2FA' }}>
      {/* Header */}
      <LinearGradient
        colors={['#1E0D4E', '#3D2080', '#6A2597']}
        locations={[0, 0.55, 1]}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
          onPress={() => router.back()}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="pricetag" size={26} color="#FFD700" />
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
        {SERVICES.map((svc, i) => (
          <View key={i} style={[styles.row, { flexDirection: rowDir }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={svc.iconEn as any} size={20} color="#5B2C91" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { fontFamily: font.semibold, textAlign: align }]}>
                {isRTL ? svc.nameAr : svc.nameEn}
              </Text>
              {(svc.noteEn || svc.noteAr) && (
                <Text style={[styles.rowNote, { fontFamily: font.regular, textAlign: align }]}>
                  {isRTL ? svc.noteAr : svc.noteEn}
                </Text>
              )}
            </View>
            <View style={styles.priceWrap}>
              {svc.price ? (
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
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 14,
  },
  backBtn: {
    width: '100%',
    marginBottom: 4,
  },
  headerIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, color: '#FFFFFF', textAlign: 'center' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },

  list: { padding: 16, paddingTop: 20, gap: 10 },

  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  rowName: { fontSize: 14, color: '#1F1235', lineHeight: 20 },
  rowNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, marginTop: 2 },

  priceWrap: { alignItems: 'flex-end', gap: 0, flexShrink: 0 },
  priceNum:  { fontSize: 22, color: '#5B2C91', lineHeight: 26 },
  priceCur:  { fontSize: 11, color: '#9CA3AF' },
  priceFree: { fontSize: 14, color: '#2ECC71' },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    marginTop: 4,
  },
  disclaimerText: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, flex: 1 },
});
