import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';
import { useDriverColors } from '@/hooks/useDriverColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function DriverEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL, font } = useLanguage();
  const colors = useDriverColors();
  const { driver } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  if (!driver) return null;

  const periods: Array<{ key: keyof typeof driver.earnings; labelKey: string }> = [
    { key: 'today', labelKey: 'driverToday' },
    { key: 'week', labelKey: 'driverThisWeek' },
    { key: 'month', labelKey: 'driverThisMonth' },
    { key: 'total', labelKey: 'driverTotalJobs' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('driverTabEarnings')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#2D1B69', '#C21875']} start={[0, 0]} end={[1, 1]} style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { fontFamily: font.regular, color: 'rgba(255,255,255,0.8)' }]}>{t('driverEarnings')}</Text>
          <Text style={[styles.balance, { fontFamily: font.bold, color: '#FFFFFF' }]}>
            {driver.earnings.today} {t('driverSar')}
          </Text>
          <Text style={[styles.balanceSub, { fontFamily: font.regular, color: 'rgba(255,255,255,0.7)' }]}>{t('driverToday')}</Text>
        </LinearGradient>

        <View style={styles.grid}>
          {periods.map(({ key, labelKey }) => (
            <View key={key} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>
                {driver.earnings[key]}{key !== 'total' ? ` ${t('driverSar')}` : ''}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
                {t(labelKey)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
          <View style={[styles.insightHeader, { flexDirection: rowDir }]}>
            <Ionicons name="trending-up" size={22} color={colors.success} />
            <Text style={[styles.insightTitle, { fontFamily: font.semibold, color: colors.text, textAlign: align }]}>
              {driver.jobsCompleted} {t('driverJobsDone')}
            </Text>
          </View>
          <Text style={[styles.insightBody, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>
            {isRTL
              ? 'أنت من أفضل الفنيين أداءً هذا الأسبوع. واصل العمل!'
              : 'You are in the top 15% of technicians this week. Keep it up!'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 22 },
  balanceCard: { borderRadius: 20, padding: 24, marginBottom: 16 },
  balanceLabel: { fontSize: 14 },
  balance: { fontSize: 40, marginTop: 8 },
  balanceSub: { fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statValue: { fontSize: 18, marginBottom: 4 },
  statLabel: { fontSize: 13 },
  insightCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  insightHeader: { alignItems: 'center', gap: 10, marginBottom: 8 },
  insightTitle: { fontSize: 16, flex: 1 },
  insightBody: { fontSize: 14, lineHeight: 20 },
});
