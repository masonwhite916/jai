import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type JobStatus } from '@/context/DriverContext';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Ionicons } from '@expo/vector-icons';

const STATUS_FLOW: JobStatus[] = ['accepted', 'en_route', 'arrived', 'working', 'completed'];

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
  accepted: { label: 'driverNavigate', next: 'en_route', color: 'primary' },
  en_route: { label: 'driverArrived', next: 'arrived', color: 'primary' },
  arrived: { label: 'driverStartWork', next: 'working', color: 'primary' },
  working: { label: 'driverComplete', next: 'completed', color: 'success' },
};

export default function DriverActiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useDriverColors();
  const { activeJob, updateJobStatus, cancelJob } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  if (!activeJob) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={[styles.header, { flexDirection: rowDir }]}>
          <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('driverActiveJob')}</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="flash-off" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('driverNoActiveJob')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(driver)' as any)}
            style={[styles.backToRequests, { borderColor: colors.border }]}
          >
            <Text style={[styles.backToRequestsText, { fontFamily: font.medium, color: colors.text }]}>{t('driverTabRequests')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentAction = statusActionMap[activeJob.status];
  const currentIndex = STATUS_FLOW.indexOf(activeJob.status);

  const handleStatus = () => {
    if (!currentAction) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateJobStatus(activeJob.id, currentAction.next);
  };

  const handleCancel = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (Platform.OS === 'web') {
      if ((globalThis as any).confirm?.(t('driverConfirmCancel'))) cancelJob(activeJob.id);
      return;
    }
    Alert.alert(t('driverCancelJob'), t('driverConfirmCancel'), [
      { text: t('no'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => cancelJob(activeJob.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(driver)' as any)}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text }]}>{t('driverActiveJob')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* Progress track */}
        <View style={[styles.statusTrack, { flexDirection: rowDir }]}>
          {STATUS_FLOW.map((status, idx) => (
            <View key={status} style={styles.step}>
              <View style={[styles.stepDot, idx <= currentIndex && { backgroundColor: colors.primary }]} />
              {idx !== STATUS_FLOW.length - 1 && (
                <View style={[styles.stepLine, idx < currentIndex && { backgroundColor: colors.primary }]} />
              )}
            </View>
          ))}
        </View>
        <View style={[styles.statusRow, { flexDirection: rowDir }]}>
          {STATUS_FLOW.map((status) => (
            <Text key={status} style={[styles.stepLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>
              {t(statusLabels[status])}
            </Text>
          ))}
        </View>

        {/* Customer card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.customerRow, { flexDirection: rowDir }]}>
            <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.avatar}>
              <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
                {activeJob.customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1, marginHorizontal: 14 }}>
              <Text style={[styles.customerName, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{activeJob.customerName}</Text>
              <Text style={[styles.customerPhone, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>{activeJob.customerPhone}</Text>
            </View>
          </View>
          <View style={[styles.contactRow, { flexDirection: rowDir }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL(`tel:${activeJob.customerPhone.replace(/\s/g, '')}`)}
              style={[styles.contactBtn, { backgroundColor: 'rgba(46,204,113,0.15)' }]}
            >
              <Ionicons name="call" size={18} color={colors.success} />
              <Text style={[styles.contactText, { fontFamily: font.medium, color: colors.success }]}>{t('driverCall')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => Linking.openURL(`https://wa.me/${activeJob.customerPhone.replace(/\D/g, '')}`)}
              style={[styles.contactBtn, { backgroundColor: 'rgba(194,24,117,0.15)' }]}
            >
              <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
              <Text style={[styles.contactText, { fontFamily: font.medium, color: colors.primary }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('driverVehicle')}</Text>
          <Text style={[styles.cardBody, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {activeJob.vehicle.color} {activeJob.vehicle.make} {activeJob.vehicle.model} {activeJob.vehicle.year}
          </Text>
          <Text style={[styles.cardBody, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align, marginTop: 4 }]}>
            {activeJob.vehicle.plate}
          </Text>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('driverJobDetails')}</Text>
          {[
            { label: t('driverAddress'), value: activeJob.address },
            { label: t('driverDistance'), value: `${activeJob.distanceKm} ${t('driverKm')}` },
            { label: t('driverEta'), value: `${activeJob.etaMin} ${t('driverMin')}` },
            { label: t('driverPayout'), value: `${activeJob.payout} ${t('driverSar')}`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <View key={label} style={[styles.detailRow, { flexDirection: rowDir }]}>
              <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.detailValue, { fontFamily: highlight ? font.bold : font.regular, color: highlight ? colors.success : colors.text, textAlign: align }]}>{value}</Text>
            </View>
          ))}
        </View>

        {currentAction && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleStatus} style={styles.btnWrap}>
            <LinearGradient
              colors={currentAction.color === 'success' ? ['#2ECC71', '#27AE60'] : ['#C21875', '#7B2A9E']}
              start={[0, 0]} end={[1, 0]}
              style={styles.btn}
            >
              <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t(currentAction.label)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.7} onPress={handleCancel} style={[styles.cancelBtn, { borderColor: 'rgba(231,76,60,0.4)' }]}>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, marginTop: 16 },
  backToRequests: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1 },
  backToRequestsText: { fontSize: 15 },
  statusTrack: { marginTop: 8, marginBottom: 12, paddingHorizontal: 4 },
  step: { flex: 1, alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(45,27,105,0.15)' },
  stepLine: { position: 'absolute', left: '50%', top: 5, right: '-50%', height: 2, backgroundColor: 'rgba(45,27,105,0.1)' },
  statusRow: { marginBottom: 24 },
  stepLabel: { flex: 1, fontSize: 11 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EBEBF5' },
  customerRow: { alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  customerName: { fontSize: 17 },
  customerPhone: { fontSize: 13, marginTop: 2 },
  contactRow: { marginTop: 16, gap: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12 },
  contactText: { fontSize: 14 },
  cardTitle: { fontSize: 16, marginBottom: 10 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  detailRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EBEBF5' },
  detailLabel: { fontSize: 13 },
  detailValue: { flex: 1, fontSize: 14, marginLeft: 12 },
  btnWrap: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  cancelBtn: { marginTop: 12, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  cancelText: { fontSize: 15 },
});
