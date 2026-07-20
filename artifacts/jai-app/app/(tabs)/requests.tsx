import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch, getAuthToken } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ReqStatus = 'active' | 'completed' | 'cancelled';

interface RequestRow {
  id: string;
  service: string;
  icon: string;
  date: string;
  address: string;
  status: ReqStatus;
  cost: string;
  technician: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReqStatus }) {
  const { t, font } = useLanguage();
  const map = {
    active:    { label: t('statusActive'),    color: '#2ECC71', bg: '#E8F8F0' },
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, { icon: string; lib: 'MC' | 'Ion' }> = {
  battery:  { icon: 'battery-charging',  lib: 'Ion' },
  fuel:     { icon: 'gas-station',       lib: 'MC'  },
  tire:     { icon: 'tire',              lib: 'MC'  },
  tow:      { icon: 'tow-truck',         lib: 'MC'  },
  lockout:  { icon: 'key',               lib: 'Ion' },
  mechanic: { icon: 'wrench',            lib: 'MC'  },
  electric: { icon: 'flash',             lib: 'Ion' },
};
const SERVICE_LABELS: Record<string, string> = {
  battery: 'Battery', fuel: 'Fuel', tire: 'Tire change',
  tow: 'Tow truck', lockout: 'Lockout', mechanic: 'Mechanic', electric: 'Electrical',
};
const PAYOUTS: Record<string, number> = {
  battery: 120, fuel: 80, tire: 350, tow: 500, lockout: 200, mechanic: 300, electric: 280,
};

function apiStatusToLocal(status: string): ReqStatus {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!getAuthToken()) {
      // Not logged in — show empty state
      setRequests([]);
      setLoadingData(false);
      return;
    }
    try {
      const data = await apiFetch<{ requests: Record<string, any>[] }>('/api/requests');
      const rows: RequestRow[] = data.requests.map((r) => {
        const svcInfo = SERVICE_ICONS[r.service_type] ?? SERVICE_ICONS.battery;
        return {
          id:         String(r.id),
          service:    SERVICE_LABELS[r.service_type] ?? r.service_type,
          icon:       svcInfo.icon,
          date:       formatDate(r.created_at),
          address:    r.address ?? '—',
          status:     apiStatusToLocal(r.status),
          cost:       r.job ? `${r.job.payout ?? PAYOUTS[r.service_type] ?? 120} SAR` : `${PAYOUTS[r.service_type] ?? 120} SAR`,
          technician: r.techName ?? '—',
        };
      });
      setRequests(rows);
    } catch {
      setRequests([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const activeRequest = requests.find(r => r.status === 'active');

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

        {loadingData ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <ActivityIndicator size="large" color="#2D1B69" />
            <Text style={[styles.emptyText, { fontFamily: font.regular, marginTop: 12 }]}>
              {isRTL ? 'جارٍ التحميل...' : 'Loading…'}
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="car-outline" size={52} color="#C0C0D0" />
            <Text style={[styles.emptyText, { fontFamily: font.semibold, marginTop: 16, color: '#1A1A1A' }]}>
              {isRTL ? 'لا توجد طلبات بعد' : 'No requests yet'}
            </Text>
            <Text style={[styles.emptyText, { fontFamily: font.regular, marginTop: 6 }]}>
              {isRTL ? 'ستظهر طلباتك هنا بعد تقديمها' : 'Your requests will appear here'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('requestHistory')}</Text>
            {requests.map((req) => (
              <TouchableOpacity
                key={req.id}
                style={[styles.requestCard, { flexDirection: rowDir }]}
                activeOpacity={0.85}
                onPress={req.status === 'active' ? () => router.push('/tracking' as any) : undefined}
              >
                <View style={[styles.reqIconBg, { backgroundColor: '#2D1B6915' }]}>
                  {SERVICE_ICONS[Object.keys(SERVICE_LABELS).find(k => SERVICE_LABELS[k] === req.service) ?? 'battery']?.lib === 'MC'
                    ? <MaterialCommunityIcons name={req.icon as any} size={24} color="#2D1B69" />
                    : <Ionicons name={req.icon as any} size={24} color="#2D1B69" />}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[styles.reqTopRow, { flexDirection: rowDir }]}>
                    <Text style={[styles.reqService, { fontFamily: font.semibold, textAlign: align }]} numberOfLines={1}>{req.service}</Text>
                    <StatusBadge status={req.status} />
                  </View>
                  <Text style={[styles.reqAddress, { fontFamily: font.regular, textAlign: align }]} numberOfLines={1}>{req.address}</Text>
                  <Text style={[styles.reqDate, { fontFamily: font.regular, textAlign: align }]}>{req.date}</Text>
                </View>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
                  <Text style={[styles.reqCost, { fontFamily: font.bold }]}>{req.cost}</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#C0C0D0" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
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
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
