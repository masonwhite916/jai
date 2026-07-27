import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type Job, type JobStatus } from '@/context/DriverContext';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/lib/api';

const statusLabels: Record<JobStatus, string> = {
  pending: 'driverStatusPending',
  accepted: 'driverStatusAccepted',
  en_route: 'driverStatusEnRoute',
  arrived: 'driverStatusArrived',
  working: 'driverStatusWorking',
  completed: 'driverStatusCompleted',
  cancelled: 'driverStatusCancelled',
};

const statusActionMap: Partial<Record<JobStatus, { label: string; next: JobStatus; color: 'primary' | 'success' }>> = {
  pending: { label: 'driverAccept', next: 'accepted', color: 'primary' },
  accepted: { label: 'driverNavigate', next: 'en_route', color: 'primary' },
  en_route: { label: 'driverArrived', next: 'arrived', color: 'primary' },
  arrived: { label: 'driverStartWork', next: 'working', color: 'primary' },
  working: { label: 'driverComplete', next: 'completed', color: 'success' },
};

function DetailRow({ label, value, colors, font, rowDir, align, valueColor }: {
  label: string; value: string; colors: any; font: any;
  rowDir: 'row' | 'row-reverse'; align: 'left' | 'right'; valueColor?: string;
}) {
  return (
    <View style={[styles.detailRow, { flexDirection: rowDir }]}>
      <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { fontFamily: font.regular, color: valueColor ?? colors.text, textAlign: align }]}>{value}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useDriverColors();
  const { jobs, isLoading, acceptJob, updateJobStatus, cancelJob } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  // Direct-fetch fallback: when the job arrives via notification tap before
  // DriverContext has finished loading, fetch it by ID straight from the API.
  const [fetchedJob, setFetchedJob] = useState<Job | null>(null);
  const [fetching, setFetching]     = useState(false);

  const localJob = jobs.find((j) => j.id === id);
  const job      = localJob ?? fetchedJob;

  useEffect(() => {
    // Only fetch directly if context is done loading and job still isn't there
    if (isLoading || localJob || fetching || !id) return;
    setFetching(true);
    apiFetch<Record<string, any>>(`/api/jobs/${id}`)
      .then((data) => {
        // Map the server shape to the local Job interface the same way DriverContext does
        const j = data.job ?? data;
        const req = j.request ?? {};
        const customer = j.customer ?? {};
        setFetchedJob({
          id:            String(j.id),
          service:       (req.service_type ?? j.service_type ?? 'battery') as Job['service'],
          urgency:       'standard',
          status:        j.status as JobStatus,
          customerName:  customer.name  ?? 'Customer',
          customerPhone: customer.phone ?? '',
          vehicle: {
            make:  req.vehicle_make  ?? j.vehicle_make  ?? '',
            model: req.vehicle_model ?? j.vehicle_model ?? '',
            year:  req.vehicle_year  ?? j.vehicle_year  ?? '',
            plate: req.vehicle_plate ?? j.vehicle_plate ?? '',
            color: req.vehicle_color ?? j.vehicle_color ?? '',
          },
          address: req.address ?? j.address ?? '',
          coords: {
            latitude:  req.location_lat ?? j.location_lat ?? 24.7136,
            longitude: req.location_lng ?? j.location_lng ?? 46.6753,
          },
          distanceKm: j.distance_km ?? 0,
          etaMin:     j.eta_min     ?? 0,
          payout:     j.payout      ?? 120,
          createdAt:  j.created_at  ?? new Date().toISOString(),
        });
      })
      .catch(() => { /* leave fetchedJob null → show not-found */ })
      .finally(() => setFetching(false));
  }, [isLoading, localJob, id]);

  // Still loading from context or direct fetch — show spinner
  if (isLoading || fetching) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2D1B69" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
        <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>
          {isRTL ? 'لم يتم العثور على المهمة' : 'Job not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#2D1B69', fontSize: 14 }}>
            {isRTL ? 'العودة' : 'Go back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentAction = statusActionMap[job.status];

  const openNavigation = () => {
    const dest = `${job.coords.latitude},${job.coords.longitude}`;
    const url = Platform.select({
      ios: `maps:?daddr=${dest}`,
      android: `google.navigation:q=${dest}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => {});
    });
  };

  const handlePrimary = () => {
    if (!currentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (job.status === 'pending') {
      acceptJob(job.id).then(() => router.push('/(driver)/active' as any));
    } else {
      if (job.status === 'accepted') openNavigation();
      updateJobStatus(job.id, currentAction.next).then(() => {
        if (currentAction.next === 'completed') router.push('/(driver)/earnings' as any);
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text }]}>{t('driverJobDetails')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.row, { flexDirection: rowDir }]}>
            <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.avatar}>
              <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
                {job.customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <Text style={[styles.name, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{job.customerName}</Text>
              <Text style={[styles.phone, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>{job.customerPhone}</Text>
            </View>
            <View style={{ flexDirection: rowDir, gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${job.customerPhone.replace(/\s/g, '')}`); }}
                style={[styles.callBtn, { backgroundColor: 'rgba(46,204,113,0.15)' }]}
              >
                <Ionicons name="call" size={18} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/chat/[jobId]' as any, params: { jobId: id, partnerName: job.customerName } }); }}
                style={[styles.callBtn, { backgroundColor: 'rgba(194,24,117,0.15)' }]}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#C21875" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Vehicle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('driverVehicle')}</Text>
          <Text style={[styles.text, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {job.vehicle.color} {job.vehicle.make} {job.vehicle.model} {job.vehicle.year}
          </Text>
          <Text style={[styles.text, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align, marginTop: 4 }]}>
            {job.vehicle.plate}
          </Text>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('driverJobDetails')}</Text>
          <DetailRow label={t('driverAddress')} value={job.address} colors={colors} font={font} rowDir={rowDir} align={align} />
          <DetailRow label={t('driverDistance')} value={`${job.distanceKm} ${t('driverKm')}`} colors={colors} font={font} rowDir={rowDir} align={align} />
          <DetailRow label={t('driverEta')} value={`${job.etaMin} ${t('driverMin')}`} colors={colors} font={font} rowDir={rowDir} align={align} />
          <DetailRow label={t('driverPayout')} value={`${job.payout} ${t('driverSar')}`} colors={colors} font={font} rowDir={rowDir} align={align} valueColor={colors.success} />
          <DetailRow label={t('driverStatus')} value={t(statusLabels[job.status])} colors={colors} font={font} rowDir={rowDir} align={align} />
        </View>

        {currentAction && (
          <TouchableOpacity activeOpacity={0.85} onPress={handlePrimary} style={styles.btnWrap}>
            <LinearGradient
              colors={currentAction.color === 'success' ? ['#2ECC71', '#27AE60'] : ['#C21875', '#7B2A9E']}
              start={[0, 0]} end={[1, 0]}
              style={styles.btn}
            >
              <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t(currentAction.label)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => cancelJob(job.id).then(() => router.back())}
          style={[styles.cancelBtn, { borderColor: 'rgba(231,76,60,0.4)' }]}
        >
          <Text style={[styles.cancelText, { fontFamily: font.semibold, color: colors.destructive }]}>{t('driverCancelJob')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EBEBF5' },
  row: { alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  name: { fontSize: 17 },
  phone: { fontSize: 13, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 20 },
  detailRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EBEBF5' },
  detailLabel: { fontSize: 13 },
  detailValue: { flex: 1, fontSize: 14, marginLeft: 12 },
  btnWrap: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  cancelBtn: { marginTop: 12, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  cancelText: { fontSize: 15 },
});
