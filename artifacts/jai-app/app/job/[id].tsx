import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type JobStatus } from '@/context/DriverContext';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Ionicons } from '@expo/vector-icons';

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
  const { jobs, acceptJob, updateJobStatus, cancelJob } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const job = jobs.find((j) => j.id === id);
  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.text, padding: 24 }}>Job not found</Text>
      </View>
    );
  }

  const currentAction = statusActionMap[job.status];

  const handlePrimary = () => {
    if (!currentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (job.status === 'pending') {
      acceptJob(job.id).then(() => router.push('/(driver)/active' as any));
    } else {
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${job.customerPhone.replace(/\s/g, '')}`); }}
              style={[styles.callBtn, { backgroundColor: 'rgba(46,204,113,0.15)' }]}
            >
              <Ionicons name="call" size={18} color={colors.success} />
            </TouchableOpacity>
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
  header: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  row: { alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  name: { fontSize: 17 },
  phone: { fontSize: 13, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 20 },
  detailRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { fontSize: 13 },
  detailValue: { flex: 1, fontSize: 14, marginLeft: 12 },
  btnWrap: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  cancelBtn: { marginTop: 12, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  cancelText: { fontSize: 15 },
});
