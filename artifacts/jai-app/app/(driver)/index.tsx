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
import { useDriverColors } from '@/hooks/useDriverColors';
import { Ionicons, Feather } from '@expo/vector-icons';

const serviceIcons: Record<Job['service'], keyof typeof Ionicons.glyphMap> = {
  tow: 'car-sport-outline',
  battery: 'battery-charging-outline',
  tire: 'disc-outline',
  fuel: 'flame-outline',
  lockout: 'key-outline',
};

const statusLabels: Record<JobStatus, string> = {
  pending: 'driverStatusPending',
  accepted: 'driverStatusAccepted',
  en_route: 'driverStatusEnRoute',
  arrived: 'driverStatusArrived',
  working: 'driverStatusWorking',
  completed: 'driverStatusCompleted',
  cancelled: 'driverStatusCancelled',
};

function JobCard({ job, onAccept }: { job: Job; onAccept?: (id: string) => void }) {
  const { t, isRTL, font } = useLanguage();
  const colors = useDriverColors();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const isPending = job.status === 'pending';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.cardHeader, { flexDirection: rowDir }]}>
        <View style={[styles.serviceBadge, { flexDirection: rowDir }]}>
          <Ionicons name={serviceIcons[job.service]} size={18} color={colors.primary} />
          <Text style={[styles.serviceText, { fontFamily: font.medium, color: colors.text }]}>
            {t(job.service === 'tow' ? 'tow' : job.service)}
          </Text>
        </View>
        <View style={[styles.urgencyBadge, {
          backgroundColor: job.urgency === 'urgent' ? 'rgba(231,76,60,0.15)' : 'rgba(46,204,113,0.15)',
        }]}>
          <Text style={[styles.urgencyText, {
            fontFamily: font.semibold,
            color: job.urgency === 'urgent' ? colors.destructive : colors.success,
          }]}>
            {t(job.urgency === 'urgent' ? 'driverUrgent' : 'driverStandard')}
          </Text>
        </View>
      </View>

      <Text style={[styles.address, { fontFamily: font.regular, color: colors.text, textAlign: align }]}>
        {job.address}
      </Text>

      <View style={[styles.metaRow, { flexDirection: rowDir }]}>
        {[
          { icon: 'location' as const, text: `${job.distanceKm} ${t('driverKm')}` },
          { icon: 'time' as const, text: `${job.etaMin} ${t('driverMin')}` },
          { icon: 'cash-outline' as const, text: `${job.payout} ${t('driverSar')}` },
        ].map(({ icon, text }) => (
          <View key={icon} style={[styles.meta, { flexDirection: rowDir }]}>
            <Ionicons name={icon} size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{text}</Text>
          </View>
        ))}
      </View>

      {isPending ? (
        <View style={[styles.actions, { flexDirection: rowDir }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onAccept?.(job.id)}
            style={[styles.acceptBtn, { backgroundColor: colors.success }]}
          >
            <Text style={[styles.actionText, { fontFamily: font.semibold }]}>{t('driverAccept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.declineBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.declineText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('driverDecline')}</Text>
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

function statusColor(status: JobStatus, colors: ReturnType<typeof useDriverColors>) {
  switch (status) {
    case 'completed': return colors.success;
    case 'cancelled': return colors.destructive;
    case 'en_route': return '#F39C12';
    case 'arrived': return colors.primary;
    case 'working': return '#7B2A9E';
    default: return colors.mutedForeground;
  }
}

export default function DriverRequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useDriverColors();
  const { driver, jobs, acceptJob, refreshJobs, activeJob } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshJobs();
    setRefreshing(false);
  }, [refreshJobs]);

  const handleAccept = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await acceptJob(id);
    router.push(`/job/${id}` as any);
  };

  const pendingJobs = jobs.filter((j) => j.status === 'pending');
  const otherJobs = jobs.filter((j) => j.status !== 'pending');

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <View>
          <Text style={[styles.greeting, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {driver ? driver.name.split(' ')[0] : ''}
          </Text>
          <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>
            {t('driverIncomingRequests')}
          </Text>
        </View>
        <View style={[styles.onlineBadge, {
          flexDirection: rowDir,
          backgroundColor: driver?.isOnline ? 'rgba(46,204,113,0.15)' : 'rgba(142,138,157,0.15)',
        }]}>
          <View style={[styles.onlineDot, { backgroundColor: driver?.isOnline ? colors.success : colors.mutedForeground }]} />
          <Text style={[styles.onlineText, { fontFamily: font.semibold, color: driver?.isOnline ? colors.success : colors.mutedForeground }]}>
            {driver?.isOnline ? t('driverOnline') : t('driverOffline')}
          </Text>
        </View>
      </View>

      {activeJob && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push(`/job/${activeJob.id}` as any)}
          style={[styles.activeBanner, { flexDirection: rowDir }]}
        >
          <LinearGradient colors={['#2D1B69', '#C21875']} start={[0, 0]} end={[1, 0]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Feather name="zap" size={18} color="#FFFFFF" />
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={[styles.bannerTitle, { fontFamily: font.semibold, color: '#FFFFFF' }]}>{t('driverActiveJob')}</Text>
            <Text style={[styles.bannerSub, { fontFamily: font.regular, color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
              {activeJob.customerName} · {activeJob.distanceKm} {t('driverKm')}
            </Text>
          </View>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <FlatList
        data={[...pendingJobs, ...otherJobs]}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="radio-button-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('driverNoRequests')}</Text>
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
  activeBanner: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16, overflow: 'hidden', alignItems: 'center' },
  bannerTitle: { fontSize: 15 },
  bannerSub: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceBadge: { alignItems: 'center', gap: 8 },
  serviceText: { fontSize: 14 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  urgencyText: { fontSize: 12 },
  address: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  metaRow: { gap: 16, marginBottom: 14 },
  meta: { alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  actions: { gap: 10 },
  acceptBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionText: { color: '#FFFFFF', fontSize: 14 },
  declineText: { fontSize: 14 },
  statusRow: { alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, marginTop: 16 },
});
