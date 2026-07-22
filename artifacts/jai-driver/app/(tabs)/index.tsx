import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type Job, type JobStatus } from '@/context/DriverContext';
import { useColors } from '@/hooks/useColors';
import { notify } from '@/lib/ui';
import { Ionicons, Feather } from '@expo/vector-icons';

const serviceIcons: Record<Job['service'], keyof typeof Ionicons.glyphMap> = {
  tow: 'car-sport-outline',
  battery: 'battery-charging-outline',
  tire: 'disc-outline',
  fuel: 'flame-outline',
  lockout: 'key-outline',
  mechanic: 'construct-outline',
  electric: 'flash-outline',
};

const statusLabels: Record<JobStatus, string> = {
  pending: 'statusPending',
  accepted: 'statusAccepted',
  en_route: 'statusEnRoute',
  arrived: 'statusArrived',
  working: 'statusWorking',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function JobCard({ job, onAccept }: { job: Job; onAccept?: (id: string) => void }) {
  const { t, isRTL, font } = useLanguage();
  const colors = useColors();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const isPending = job.status === 'pending';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
        <View style={[styles.serviceBadge, { flexDirection: rowDir }]}>
          <Ionicons name={serviceIcons[job.service] ?? 'construct-outline'} size={18} color={colors.primary} />
          <Text style={[styles.serviceText, { fontFamily: font.medium, color: colors.text }]}>
            {t(job.service === 'tow' ? 'towTruck' : job.service)}
          </Text>
        </View>
        <View style={[styles.timeBadge, { flexDirection: rowDir }]}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.timeText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {timeLabel(job.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={[styles.address, { fontFamily: font.regular, color: colors.text, textAlign: align }]}>
        {job.address || '—'}
      </Text>

      <View style={[styles.metaRow, { flexDirection: rowDir }]}>
        <View style={[styles.meta, { flexDirection: rowDir }]}>
          <Ionicons name="location" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {job.distanceKm != null ? `${job.distanceKm} ${t('km')}` : '—'}
          </Text>
        </View>
        <View style={[styles.meta, { flexDirection: rowDir }]}>
          <Ionicons name="time" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {job.etaMin != null ? `${job.etaMin} ${t('min')}` : '—'}
          </Text>
        </View>
        <View style={[styles.meta, { flexDirection: rowDir }]}>
          <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {job.payout} {t('sar')}
          </Text>
        </View>
      </View>

      {isPending ? (
        <View style={[styles.actions, { flexDirection: rowDir }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onAccept && onAccept(job.id)}
            style={[styles.acceptBtn, { backgroundColor: colors.success }]}
          >
            <Text style={[styles.actionText, { fontFamily: font.semibold }]}>{t('accept')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.statusRow, { flexDirection: rowDir }]}>
          <View style={[styles.dot, { backgroundColor: statusColor(job.status, colors) }]} />
          <Text style={[styles.statusText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {t(statusLabels[job.status])}
          </Text>
        </View>
      )}
    </View>
  );
}

function statusColor(status: JobStatus, colors: any) {
  switch (status) {
    case 'completed': return colors.success;
    case 'cancelled': return colors.destructive;
    case 'en_route': return '#F39C12';
    case 'arrived': return colors.primary;
    case 'working': return '#7B2A9E';
    default: return colors.mutedForeground;
  }
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useColors();
  const { driver, jobs, acceptJob, refreshJobs, activeJob, loadError } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  }, [refreshJobs]);

  const handleAccept = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await acceptJob(id);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/job/${id}` as any);
    } else if (res.status === 409 || res.status === 422) {
      // 409 = race lost; 422 = job already moved past pending
      notify(t('jobTaken'));
    } else {
      notify(t('errGeneric'), res.error);
    }
  };

  const pendingJobs = jobs.filter((j) => j.status === 'pending');
  const otherJobs = jobs.filter((j) => j.status !== 'pending');
  const allJobs = [...pendingJobs, ...otherJobs];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <View>
          <Text style={[styles.greeting, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {driver ? `${driver.name.split(' ')[0]}` : ''}
          </Text>
          <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>
            {t('incomingRequests')}
          </Text>
        </View>
        <View style={[styles.onlineBadge, { flexDirection: rowDir, backgroundColor: driver?.isOnline ? 'rgba(46,204,113,0.15)' : 'rgba(142,138,157,0.15)' }]}>
          <View style={[styles.onlineDot, { backgroundColor: driver?.isOnline ? colors.success : colors.mutedForeground }]} />
          <Text style={[styles.onlineText, { fontFamily: font.semibold, color: driver?.isOnline ? colors.success : colors.mutedForeground }]}>
            {driver?.isOnline ? t('online') : t('offline')}
          </Text>
        </View>
      </View>

      {loadError && (
        <View style={[styles.errorBanner, { flexDirection: rowDir, backgroundColor: 'rgba(231,76,60,0.12)' }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { fontFamily: font.medium, color: colors.destructive, textAlign: align }]}>
            {t('loadJobsError')}
          </Text>
        </View>
      )}

      {activeJob && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/job/${activeJob.id}` as any)}
          style={[styles.activeBanner, { flexDirection: rowDir }]}
        >
          <LinearGradient colors={['#2D1B69', '#C21875']} start={[0, 0]} end={[1, 0]} style={StyleSheet.absoluteFill} />
          <Feather name="zap" size={18} color="#FFFFFF" />
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.bannerTitle, { fontFamily: font.semibold, color: '#FFFFFF' }]}>{t('activeJob')}</Text>
            <Text style={[styles.bannerSub, { fontFamily: font.regular, color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
              {activeJob.customerName}
              {activeJob.distanceKm != null ? ` · ${activeJob.distanceKm} ${t('km')}` : ''}
            </Text>
          </View>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <FlatList
        data={allJobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="radio-button-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('noRequests')}</Text>
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} onAccept={handleAccept} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14 },
  title: { fontSize: 22, marginTop: 4 },
  onlineBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 13 },
  errorBanner: { marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignItems: 'center', gap: 8 },
  errorText: { flex: 1, fontSize: 13 },
  activeBanner: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, overflow: 'hidden', alignItems: 'center' },
  bannerTitle: { fontSize: 15 },
  bannerSub: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceBadge: { alignItems: 'center', gap: 8 },
  serviceText: { fontSize: 14 },
  timeBadge: { alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12 },
  address: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  metaRow: { gap: 16, marginBottom: 14 },
  meta: { alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  actions: { gap: 10 },
  acceptBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFFFFF', fontSize: 14 },
  statusRow: { alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
