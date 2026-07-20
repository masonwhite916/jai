import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';
import { useApp } from '@/context/AppContext';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function DriverProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, isRTL, font, setLang } = useLanguage();
  const colors = useDriverColors();
  const { driver, logout: driverLogout, toggleOnline } = useDriver();
  const { setRole } = useApp();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  if (!driver) return null;

  const doSignOut = async () => {
    await driverLogout();
    await setRole(null);
    router.replace('/role');
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (Platform.OS === 'web') {
      const msg = isRTL ? 'هل تريد تسجيل الخروج؟' : 'Sign out?';
      if ((globalThis as any).confirm?.(msg)) doSignOut();
      return;
    }
    Alert.alert(
      t('driverLogout'),
      isRTL ? 'هل تريد تسجيل الخروج؟' : 'Do you want to sign out?',
      [
        { text: t('no'), style: 'cancel' },
        { text: t('yes'), style: 'destructive', onPress: doSignOut },
      ]
    );
  };

  const switchRole = () => {
    if (Platform.OS === 'web') {
      const msg = isRTL ? 'العودة لصفحة اختيار الدور؟' : 'Switch to the role selection screen?';
      if ((globalThis as any).confirm?.(msg)) doSignOut();
      return;
    }
    Alert.alert(
      isRTL ? 'تبديل الدور' : 'Switch role',
      isRTL ? 'العودة لصفحة اختيار الدور؟' : 'Go back to the role selection screen?',
      [
        { text: t('no'), style: 'cancel' },
        { text: t('yes'), onPress: doSignOut },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('driverTabProfile')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
              {driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={[styles.name, { fontFamily: font.bold, color: colors.text }]}>{driver.name}</Text>
          <Text style={[styles.phone, { fontFamily: font.regular, color: colors.mutedForeground }]}>{driver.phone}</Text>
          <View style={[styles.ratingRow, { flexDirection: rowDir }]}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name={i <= Math.round(driver.rating) ? 'star' : 'star-outline'} size={16} color="#F39C12" />
            ))}
            <Text style={[styles.ratingText, { fontFamily: font.medium, color: colors.text }]}>{driver.rating}</Text>
          </View>
        </View>

        {/* Online toggle */}
        <View style={[styles.onlineRow, { backgroundColor: colors.card, flexDirection: rowDir }]}>
          <View style={[styles.onlineLeft, { flexDirection: rowDir }]}>
            <View style={[styles.onlineDot, { backgroundColor: driver.isOnline ? colors.success : colors.mutedForeground }]} />
            <Text style={[styles.onlineLabel, { fontFamily: font.semibold, color: colors.text }]}>{t('driverAvailability')}</Text>
          </View>
          <Switch
            value={driver.isOnline}
            onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleOnline(); }}
            trackColor={{ false: colors.muted, true: 'rgba(46,204,113,0.4)' }}
            thumbColor={driver.isOnline ? colors.success : '#9CA3AF'}
          />
        </View>

        {/* Language */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLang(lang === 'en' ? 'ar' : 'en'); }}
          style={[styles.menuItem, { flexDirection: rowDir, backgroundColor: colors.card }]}
        >
          <Ionicons name="globe-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuLabel, { fontFamily: font.medium, color: colors.text }]}>{t('driverLanguage')}</Text>
          <Text style={[styles.menuValue, { fontFamily: font.regular, color: colors.mutedForeground }]}>
            {lang === 'en' ? 'English' : 'العربية'}
          </Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Total jobs */}
        <View style={[styles.menuItem, { flexDirection: rowDir, backgroundColor: colors.card }]}>
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          <Text style={[styles.menuLabel, { fontFamily: font.medium, color: colors.text }]}>{t('driverTotalJobs')}</Text>
          <Text style={[styles.menuValue, { fontFamily: font.regular, color: colors.mutedForeground }]}>{driver.jobsCompleted}</Text>
        </View>

        {/* Switch role */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={switchRole}
          style={[styles.switchBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.mutedForeground} />
          <Text style={[styles.switchText, { fontFamily: font.medium, color: colors.mutedForeground }]}>
            {isRTL ? 'تبديل الدور (عميل / فني)' : 'Switch role (Customer / Technician)'}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: 'rgba(231,76,60,0.4)' }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { fontFamily: font.semibold, color: colors.destructive }]}>{t('driverLogout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 22 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBF5', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 24 },
  name: { fontSize: 20, marginTop: 4 },
  phone: { fontSize: 14, marginTop: 4 },
  ratingRow: { marginTop: 12, alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, marginLeft: 6 },
  onlineRow: { borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EBEBF5', marginBottom: 12 },
  onlineLeft: { alignItems: 'center', gap: 10 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineLabel: { fontSize: 15 },
  menuItem: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBF5', marginBottom: 12 },
  menuLabel: { flex: 1, fontSize: 15, marginHorizontal: 12 },
  menuValue: { fontSize: 14, marginRight: 8 },
  switchBtn: { height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', marginBottom: 12 },
  switchText: { fontSize: 14 },
  logoutBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row', marginTop: 4 },
  logoutText: { fontSize: 15 },
});
