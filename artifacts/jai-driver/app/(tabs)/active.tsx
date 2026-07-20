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
import { useColors } from '@/hooks/useColors';
import { Ionicons, Feather } from '@expo/vector-icons';

const STATUS_FLOW: JobStatus[] = ['accepted', 'en_route', 'arrived', 'working', 'completed'];

const statusLabels: Record<JobStatus, string> = {
  pending: 'statusPending',
  accepted: 'statusAccepted',
  en_route: 'statusEnRoute',
  arrived: 'statusArrived',
  working: 'statusWorking',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};

const statusActionMap: Partial<Record<JobStatus, { label: string; next: JobStatus; color: 'primary' | 'success' }>> = {
  accepted: { label: 'navigate', next: 'en_route', color: 'primary' },
  en_route: { label: 'arrived', next: 'arrived', color: 'primary' },
  arrived: { label: 'startWork', next: 'working', color: 'primary' },
  working: { label: 'complete', next: 'completed', color: 'success' },
};

export default function ActiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors = useColors();
  const { activeJob, updateJobStatus, cancelJob } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  if (!activeJob) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={[styles.header, { flexDirection: rowDir }]}>
          <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('activeJob')}</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="flash-off" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('noActiveJob')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)' as any)}
            style={[styles.backToRequests, { borderColor: colors.border }]}
          >
            <Text style={[styles.backToRequestsText, { fontFamily: font.medium, color: colors.text }]}>{t('tabRequests')}</Text>
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('cancelJob'), t('confirmCancel'), [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'),
        style: 'destructive',
        onPress: () => cancelJob(activeJob.id),
      },
    ]);
  };

  const handleCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${activeJob.customerPhone.replace(/\s/g, '')}`);
  };

  const handleWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://wa.me/${activeJob.customerPhone.replace(/\D/g, '')}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)' as any)}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('activeJob')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusTrack, { flexDirection: rowDir }]}>
          {STATUS_FLOW.map((status, idx) => (
            <View key={status} style={[styles.step, idx <= currentIndex && styles.stepActive]}>
              <View style={[styles.stepDot, idx <= currentIndex && { backgroundColor: colors.primary }]} />
              {idx !== STATUS_FLOW.length - 1 && <View style={[styles.stepLine, idx < currentIndex && { backgroundColor: colors.primary }]} />}
            </View>
          ))}
        </View>
        <View style={[styles.statusRow, { flexDirection: rowDir }]}>
          {STATUS_FLOW.map((status) => (
            <Text key={status} style={[styles.stepLabel, { fontFamily: font.medium, color: colors.mutedForeground, textAlign: align }]}>
              {t(statusLabels[status])}
            </Text>
          ))}
        </View>

        <View style={[styles.customerCard, { backgroundColor: colors.card }]}>
          <View style={[styles.customerHeader, { flexDirection: rowDir }]}>
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
          <View style={[styles.contactActions, { flexDirection: rowDir }]}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleCall} style={[styles.contactBtn, { backgroundColor: 'rgba(46,204,113,0.15)' }]}>
              <Ionicons name="call" size={18} color={colors.success} />
              <Text style={[styles.contactText, { fontFamily: font.medium, color: colors.success }]}>{t('sosCall')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={handleWhatsApp} style={[styles.contactBtn, { backgroundColor: 'rgba(194,24,117,0.15)' }]}>
              <Ionicons name="logo-whatsapp" size={18} color={colors.primary} />
              <Text style={[styles.contactText, { fontFamily: font.medium, color: colors.primary }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('vehicle')}</Text>
          <Text style={[styles.infoText, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {activeJob.vehicle.color} {activeJob.vehicle.make} {activeJob.vehicle.model} {activeJob.vehicle.year}
          </Text>
          <Text style={[styles.infoText, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align, marginTop: 4 }]}>
            {activeJob.vehicle.plate}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>{t('jobDetails')}</Text>
          <View style={[styles.detailRow, { flexDirection: rowDir }]}>
            <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('address')}</Text>
            <Text style={[styles.detailValue, { fontFamily: font.regular, color: colors.text, textAlign: align }]}>{activeJob.address}</Text>
          </View>
          <View style={[styles.detailRow, { flexDirection: rowDir }]}>
            <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('distance')}</Text>
            <Text style={[styles.detailValue, { fontFamily: font.regular, color: colors.text, textAlign: align }]}>{activeJob.distanceKm} {t('km')}</Text>
          </View>
          <View style={[styles.detailRow, { flexDirection: rowDir }]}>
            <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('eta')}</Text>
            <Text style={[styles.detailValue, { fontFamily: font.regular, color: colors.text, textAlign: align }]}>{activeJob.etaMin} {t('min')}</Text>
          </View>
          <View style={[styles.detailRow, { flexDirection: rowDir }]}>
            <Text style={[styles.detailLabel, { fontFamily: font.medium, color: colors.mutedForeground }]}>{t('payout')}</Text>
            <Text style={[styles.detailValue, { fontFamily: font.bold, color: colors.success, textAlign: align }]}>{activeJob.payout} {t('sar')}</Text>
          </View>
        </View>

        {currentAction && (
          <TouchableOpacity activeOpacity={0.85} onPress={handleStatus} style={styles.btnWrap}>
            <LinearGradient
              colors={currentAction.color === 'success' ? ['#2ECC71', '#27AE60'] : ['#C21875', '#7B2A9E']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.btn}
            >
              <Text style={[styles.btnText, { fontFamily: font.semibold }]}>{t(currentAction.label)}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity activeOpacity={0.7} onPress={handleCancel} style={[styles.cancelBtn, { borderColor: 'rgba(231,76,60,0.4)' }]}>
          <Text style={[styles.cancelText, { fontFamily: font.semibold, color: colors.destructive }]}>{t('cancelJob')}</Text>
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
  stepActive: {},
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepLine: { position: 'absolute', left: '50%', top: 5, right: '-50%', height: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  statusRow: { marginBottom: 24 },
  stepLabel: { flex: 1, fontSize: 11 },
  customerCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  customerHeader: { alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18 },
  customerName: { fontSize: 17 },
  customerPhone: { fontSize: 13, marginTop: 2 },
  contactActions: { marginTop: 16, gap: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12 },
  contactText: { fontSize: 14 },
  infoCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoTitle: { fontSize: 16, marginBottom: 10 },
  infoText: { fontSize: 14, lineHeight: 20 },
  detailRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { fontSize: 13 },
  detailValue: { flex: 1, fontSize: 14, marginLeft: 12 },
  btnWrap: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  btn: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16 },
  cancelBtn: { marginTop: 12, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  cancelText: { fontSize: 15 },
});
