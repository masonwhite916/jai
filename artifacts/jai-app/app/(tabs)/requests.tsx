import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { useApp } from '@/context/AppContext';
import { apiFetch, getAuthToken } from '@/lib/api';
import { SERVICE_PAYOUTS } from '@/lib/serviceConstants';

// ── Types ─────────────────────────────────────────────────────────────────────

// 'active' = any non-terminal server status (pending/assigned/in_progress)
type ReqStatus = 'active' | 'completed' | 'cancelled';

interface RequestRow {
  id: string;
  serviceType: string;
  jobId: string;
  service: string;
  icon: string;
  iconLib: 'MC' | 'Ion';
  date: string;
  address: string;
  status: ReqStatus;
  rawStatus: string;   // exact server value — used to decide whether to show Track
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

// ── Service icon helper ───────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, { icon: string; lib: 'MC' | 'Ion' }> = {
  battery:  { icon: 'battery-charging', lib: 'Ion' },
  fuel:     { icon: 'gas-station',      lib: 'MC'  },
  tire:     { icon: 'tire',             lib: 'MC'  },
  tow:      { icon: 'tow-truck',        lib: 'MC'  },
  lockout:  { icon: 'key',              lib: 'Ion' },
  mechanic: { icon: 'wrench',           lib: 'MC'  },
  electric: { icon: 'flash',            lib: 'Ion' },
};
const SERVICE_LABELS: Record<string, string> = {
  battery: 'Battery', fuel: 'Fuel', tire: 'Tire change',
  tow: 'Tow truck', lockout: 'Lockout', mechanic: 'Mechanic', electric: 'Electrical',
};

function ServiceIcon({ icon, lib, size = 24, color = '#2D1B69' }: { icon: string; lib: 'MC' | 'Ion'; size?: number; color?: string }) {
  return lib === 'MC'
    ? <MaterialCommunityIcons name={icon as any} size={size} color={color} />
    : <Ionicons name={icon as any} size={size} color={color} />;
}

function apiStatusToLocal(status: string): ReqStatus {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

// A request is truly trackable if its server status is still open
function isTrulyActive(rawStatus: string) {
  return rawStatus !== 'completed' && rawStatus !== 'cancelled';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function RequestDetailModal({
  req, visible, onClose, onTrack,
}: {
  req: RequestRow | null; visible: boolean; onClose: () => void; onTrack: () => void;
}) {
  const { isRTL, font } = useLanguage();
  if (!req) return null;

  const rows: { label: string; value: string; icon: string }[] = [
    { label: isRTL ? 'الخدمة'     : 'Service',    value: req.service,     icon: req.icon },
    { label: isRTL ? 'التاريخ'    : 'Date',       value: req.date,        icon: 'calendar-outline' },
    { label: isRTL ? 'الموقع'     : 'Location',   value: req.address,     icon: 'location-outline' },
    { label: isRTL ? 'التكلفة'    : 'Cost',       value: req.cost,        icon: 'cash-outline' },
    { label: isRTL ? 'الفني'      : 'Technician', value: req.technician,  icon: 'person-outline' },
  ];

  const canTrack = isTrulyActive(req.rawStatus);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dm.backdrop}>
        <View style={dm.sheet}>
          {/* Handle bar */}
          <View style={dm.handle} />

          {/* Icon + service name */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={dm.iconCircle}>
              <ServiceIcon icon={req.icon} lib={req.iconLib} size={32} color="#2D1B69" />
            </View>
            <Text style={[dm.title, { fontFamily: font.bold, textAlign: 'center' }]}>{req.service}</Text>
            <StatusBadge status={req.status} />
          </View>

          {/* Detail rows */}
          <View style={dm.table}>
            {rows.map((r) => (
              <View key={r.label} style={[dm.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name={r.icon as any} size={16} color="#6B7280" style={{ marginTop: 1 }} />
                <Text style={[dm.rowLabel, { fontFamily: font.medium }]}>{r.label}</Text>
                <Text style={[dm.rowValue, { fontFamily: font.regular, textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={2}>
                  {r.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          {canTrack && (
            <TouchableOpacity onPress={onTrack} activeOpacity={0.85} style={dm.trackBtn}>
              <LinearGradient colors={['#C21875', '#8B35BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={dm.trackBtnGradient}>
                <Ionicons name="navigate" size={18} color="#FFF" />
                <Text style={[dm.trackBtnText, { fontFamily: font.bold }]}>
                  {isRTL ? 'تتبع الطلب' : 'Track Request'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={dm.closeBtn} activeOpacity={0.7}>
            <Text style={[dm.closeBtnText, { fontFamily: font.medium }]}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const { setActiveRequest } = useApp();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selected, setSelected] = useState<RequestRow | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!getAuthToken()) {
      setRequests([]);
      setLoadingData(false);
      return;
    }
    try {
      const data = await apiFetch<{ requests: Record<string, any>[] }>('/api/requests');
      const rows: RequestRow[] = data.requests.map((r) => {
        const svcInfo = SERVICE_ICONS[r.service_type] ?? SERVICE_ICONS.battery;
        return {
          id:          String(r.id),
          serviceType: r.service_type ?? '',
          jobId:       r.job ? String(r.job.id) : '',
          service:     SERVICE_LABELS[r.service_type] ?? r.service_type,
          icon:        svcInfo.icon,
          iconLib:     svcInfo.lib,
          date:        formatDate(r.created_at),
          address:     r.address ?? '—',
          status:      apiStatusToLocal(r.status),
          rawStatus:   r.status ?? '',
          cost:        r.job
            ? `${r.job.payout ?? SERVICE_PAYOUTS[r.service_type] ?? 0} SAR`
            : `${SERVICE_PAYOUTS[r.service_type] ?? 0} SAR`,
          technician:  r.techName ?? '—',
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

  // Only the first truly-active request gets the live banner
  const liveRequest = requests.find(r => isTrulyActive(r.rawStatus));

  function handleTrack(req: RequestRow) {
    setSelected(null);
    setActiveRequest({
      requestId:   req.id,
      jobId:       req.jobId || req.id,
      serviceType: req.serviceType,
      status:      'assigned',
    });
    router.push('/tracking' as any);
  }

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
        {/* Live "in progress" banner — only shown for the single active request */}
        {liveRequest && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => handleTrack(liveRequest)} activeOpacity={0.9}>
            <LinearGradient colors={['#C21875', '#8B35BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.activeBannerGradient, { flexDirection: rowDir }]}>
              <View style={styles.activePulse} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeBannerTitle, { fontFamily: font.bold, textAlign: align }]}>{t('inProgress')}</Text>
                <Text style={[styles.activeBannerSub, { fontFamily: font.regular, textAlign: align }]}>{liveRequest.service} · {t('enRoute')}</Text>
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
                onPress={() => setSelected(req)}
              >
                <View style={[styles.reqIconBg, { backgroundColor: '#2D1B6915' }]}>
                  <ServiceIcon icon={req.icon} lib={req.iconLib} size={24} />
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

      {/* Request detail bottom sheet */}
      <RequestDetailModal
        req={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onTrack={() => selected && handleTrack(selected)}
      />
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

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  iconCircle: {
    width: 68, height: 68, borderRadius: 20, backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontSize: 18, color: '#1A1A1A', marginBottom: 8 },
  table: { backgroundColor: '#F8F9FC', borderRadius: 14, padding: 4, marginBottom: 20 },
  row: { alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  rowLabel: { fontSize: 13, color: '#6B7280', width: 90 },
  rowValue: { fontSize: 13, color: '#1A1A1A', flex: 1 },
  trackBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  trackBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  trackBtnText: { color: '#FFF', fontSize: 15 },
  closeBtn: { alignItems: 'center', paddingVertical: 12 },
  closeBtnText: { fontSize: 15, color: '#6B7280' },
});
