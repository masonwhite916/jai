import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch, getAuthToken } from '@/lib/api';
import { SERVICE_PAYOUTS } from '@/lib/serviceConstants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id: number;
  service_type: string;
  created_at: string;
  payment_id: string | null;
  payment_method: string | null;
  address: string | null;
  amount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, { icon: string; lib: 'MC' | 'Ion' }> = {
  battery:  { icon: 'battery-charging', lib: 'Ion' },
  fuel:     { icon: 'gas-station',      lib: 'MC'  },
  tire:     { icon: 'tire',             lib: 'MC'  },
  tow:      { icon: 'tow-truck',        lib: 'MC'  },
  lockout:  { icon: 'key',              lib: 'Ion' },
  mechanic: { icon: 'wrench',           lib: 'MC'  },
  electric: { icon: 'flash',            lib: 'Ion' },
};

const SERVICE_LABELS: Record<string, { en: string; ar: string }> = {
  battery:  { en: 'Battery Jump Start',       ar: 'شحن البطارية'       },
  fuel:     { en: 'Fuel Delivery',            ar: 'توصيل الوقود'       },
  tire:     { en: 'Tire Replacement',         ar: 'تغيير الإطار'       },
  tow:      { en: 'Vehicle Towing',           ar: 'سحب السيارة'        },
  lockout:  { en: 'Lockout Assistance',       ar: 'فتح السيارة'        },
  mechanic: { en: 'Light Mechanical Repair',  ar: 'إصلاح ميكانيكي'    },
  electric: { en: 'Electrical Repair',        ar: 'إصلاح كهربائي'     },
};

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (lang === 'ar') {
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ServiceIcon({ type }: { type: string }) {
  const s = SERVICE_ICONS[type] ?? SERVICE_ICONS.battery;
  if (s.lib === 'MC') return <MaterialCommunityIcons name={s.icon as any} size={26} color="#2D1B69" />;
  return <Ionicons name={s.icon as any} size={26} color="#2D1B69" />;
}

function methodLabel(method: string | null, isRTL: boolean): string {
  if (method === 'cash')    return isRTL ? 'نقداً — يُدفع عند الوصول' : 'Cash — Paid on arrival';
  if (method === 'covered') return isRTL ? 'مغطى بالعضوية'           : 'Covered by membership';
  if (method === 'card')    return isRTL ? 'بطاقة (مدى / فيزا)'      : 'Card (Mada / Visa)';
  return method ?? '—';
}

function methodIcon(method: string | null): string {
  if (method === 'cash')    return 'cash-outline';
  if (method === 'covered') return 'star-outline';
  return 'card-outline';
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRTL, font, lang } = useLanguage();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align  = isRTL ? 'right' : 'left';

  const [payments, setPayments]     = useState<PaymentRow[]>([]);
  const [loading,  setLoading]      = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!getAuthToken()) { setLoading(false); return; }
    try {
      const data = await apiFetch<{ payments: PaymentRow[] }>('/api/payments');
      setPayments(data.payments);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const title = isRTL ? 'سجل المدفوعات' : 'Payment History';
  const empty = isRTL ? 'لا توجد مدفوعات بعد' : 'No payments yet';
  const hint  = isRTL
    ? 'ستظهر إيصالاتك هنا بعد اكتمال كل خدمة.'
    : 'Your receipts will appear here after each completed service.';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: font.bold, flex: 1, textAlign: 'center' }]}>
            {title}
          </Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2D1B69" />
            <Text style={[styles.emptyText, { fontFamily: font.regular, marginTop: 12 }]}>
              {isRTL ? 'جارٍ التحميل...' : 'Loading…'}
            </Text>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={56} color="#C0C0D0" />
            <Text style={[styles.emptyHead, { fontFamily: font.semibold, marginTop: 16 }]}>{empty}</Text>
            <Text style={[styles.emptyText, { fontFamily: font.regular, marginTop: 8 }]}>{hint}</Text>
          </View>
        ) : (
          payments.map((p) => {
            const svcLabel = (SERVICE_LABELS[p.service_type] ?? { en: p.service_type, ar: p.service_type })[lang === 'ar' ? 'ar' : 'en'];
            const amount   = p.amount > 0 ? p.amount : (SERVICE_PAYOUTS[p.service_type] ?? 0);
            const isCard   = p.payment_method === 'card';

            return (
              <View key={p.id} style={styles.card}>
                {/* Top row: icon + service + date */}
                <View style={[styles.cardTop, { flexDirection: rowDir }]}>
                  <View style={styles.iconBg}>
                    <ServiceIcon type={p.service_type} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.svcName, { fontFamily: font.semibold, textAlign: align }]}>
                      {svcLabel}
                    </Text>
                    <Text style={[styles.date, { fontFamily: font.regular, textAlign: align }]}>
                      {formatDate(p.created_at, lang ?? 'en')}
                    </Text>
                    {p.address ? (
                      <Text style={[styles.address, { fontFamily: font.regular, textAlign: align }]} numberOfLines={1}>
                        {p.address}
                      </Text>
                    ) : null}
                  </View>
                  {/* Amount */}
                  <Text style={[styles.amount, { fontFamily: font.bold }]}>
                    {p.payment_method === 'covered' ? (isRTL ? 'مجاني' : 'Free') : `${amount} SAR`}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Bottom row: method + receipt ID */}
                <View style={[styles.cardBottom, { flexDirection: rowDir }]}>
                  <View style={[styles.methodPill, { flexDirection: rowDir }]}>
                    <Ionicons name={methodIcon(p.payment_method) as any} size={14} color="#5B2C91" />
                    <Text style={[styles.methodText, { fontFamily: font.medium }]}>
                      {methodLabel(p.payment_method, isRTL)}
                    </Text>
                  </View>
                  {isCard && p.payment_id ? (
                    <Text style={[styles.receiptId, { fontFamily: font.regular }]}>
                      {isRTL ? 'رقم الإيصال: ' : 'Receipt: '}
                      {p.payment_id.slice(0, 8).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:     { alignItems: 'center', gap: 12 },
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  center:        { alignItems: 'center', paddingTop: 72 },
  emptyHead:     { fontSize: 16, color: '#1A1A1A', textAlign: 'center' },
  emptyText:     { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 14,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop:     { alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  iconBg:      { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  svcName:     { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  date:        { fontSize: 12, color: '#9CA3AF' },
  address:     { fontSize: 13, color: '#6B7280' },
  amount:      { fontSize: 16, fontWeight: '700', color: '#2D1B69', alignSelf: 'flex-start' },
  divider:     { height: 1, backgroundColor: '#F0F0F5', marginBottom: 12 },
  cardBottom:  { alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  methodPill:  { backgroundColor: '#EDE8F8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', gap: 5 },
  methodText:  { fontSize: 12, color: '#5B2C91', fontWeight: '500' },
  receiptId:   { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto', marginRight: 'auto' },
});
