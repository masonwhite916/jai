import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';

function StatusBadge({ status }: { status: 'active' | 'completed' | 'cancelled' }) {
  const { t, font } = useLanguage();
  const map = {
    active: { label: t('statusActive'), color: '#2ECC71', bg: '#E8F8F0' },
    completed: { label: t('statusCompleted'), color: '#2D1B69', bg: '#EDE8F8' },
    cancelled: { label: t('statusCancelled'), color: '#E74C3C', bg: '#FEE8E6' },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color, fontFamily: font.semibold }]}>{s.label}</Text>
    </View>
  );
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const REQUESTS = [
    { id: 'r1', service: t('reqBattery'), icon: 'battery-charging', date: isRTL ? 'اليوم، ١٠:٢٤ ص' : 'Today, 10:24 AM', address: t('reqAddrFahd'), status: 'active' as const, cost: '120 SAR', technician: t('reqTechAhmed') },
    { id: 'r2', service: t('reqTire'), icon: 'tire', date: t('notifDate15'), address: t('reqAddrOlaya'), status: 'completed' as const, cost: '350 SAR', technician: t('reqTechKhalid'), rating: 5 },
    { id: 'r3', service: t('reqFuel'), icon: 'gas-station', date: t('notifDate10'), address: t('reqAddrPMBS'), status: 'completed' as const, cost: '80 SAR', technician: t('reqTechOmar'), rating: 4 },
    { id: 'r4', service: t('reqLockout'), icon: 'key', date: isRTL ? '٢٨ يونيو ٢٠٢٦' : 'Jun 28, 2026', address: t('reqAddrNakheel'), status: 'cancelled' as const, cost: '-', technician: '-' },
  ];

  const activeRequest = REQUESTS.find(r => r.status === 'active');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <Text style={[styles.headerTitle, { fontFamily: font.bold, textAlign: align }]}>{t('myRequests')}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {activeRequest && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => router.push('/tracking' as any)} activeOpacity={0.9}>
            <LinearGradient colors={['#C21875', '#8B35BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.activeBannerGradient, { flexDirection: rowDir }]}>
              <View style={styles.activePulse} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeBannerTitle, { fontFamily: font.bold, textAlign: align }]}>{t('inProgress')}</Text>
                <Text style={[styles.activeBannerSub, { fontFamily: font.regular, textAlign: align }]}>{activeRequest.service} · {t('enRoute')}</Text>
              </View>
              <Ionicons name={isRTL ? 'navigate-outline' : 'navigate'} size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('requestHistory')}</Text>
        {REQUESTS.map((req) => (
          <TouchableOpacity
            key={req.id}
            style={[styles.requestCard, { flexDirection: rowDir }]}
            activeOpacity={0.85}
            onPress={req.status === 'active' ? () => router.push('/tracking' as any) : undefined}
          >
            <View style={[styles.reqIconBg, { backgroundColor: '#2D1B6915' }]}>
              <MaterialCommunityIcons name={req.icon as any} size={24} color="#2D1B69" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={[styles.reqTopRow, { flexDirection: rowDir }]}>
                <Text style={[styles.reqService, { fontFamily: font.semibold, textAlign: align }]} numberOfLines={1}>{req.service}</Text>
                <StatusBadge status={req.status} />
              </View>
              <Text style={[styles.reqAddress, { fontFamily: font.regular, textAlign: align }]} numberOfLines={1}>{req.address}</Text>
              <Text style={[styles.reqDate, { fontFamily: font.regular, textAlign: align }]}>{req.date}</Text>
              {req.rating ? (
                <View style={[{ flexDirection: rowDir }]}>
                  {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= req.rating! ? 'star' : 'star-outline'} size={13} color="#F39C12" />)}
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
              <Text style={[styles.reqCost, { fontFamily: font.bold }]}>{req.cost}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#C0C0D0" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  activeBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  activeBannerGradient: { padding: 16, alignItems: 'center', gap: 12 },
  activePulse: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  activeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  activeBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  reqIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  reqTopRow: { alignItems: 'center', gap: 8 },
  reqService: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  reqAddress: { fontSize: 13, color: '#6B7280' },
  reqDate: { fontSize: 12, color: '#9CA3AF' },
  reqCost: { fontSize: 14, fontWeight: '700', color: '#2D1B69' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
