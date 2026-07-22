import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';
import { confirmAsync } from '@/lib/ui';
import { useColors } from '@/hooks/useColors';
import { Ionicons, Feather } from '@expo/vector-icons';

type Lang = 'en' | 'ar';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, isRTL, font, setLang } = useLanguage();
  const colors = useColors();
  const { driver, logout, toggleOnline } = useDriver();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  if (!driver) return null;

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const ok = await confirmAsync(
      t('logout'),
      isRTL ? 'هل تريد تسجيل الخروج؟' : 'Do you want to log out?',
      t('yes'),
      t('no'),
    );
    if (!ok) return;
    await logout();
    router.replace('/auth');
  };

  const toggleLanguage = () => {
    const next: Lang = lang === 'en' ? 'ar' : 'en';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLang(next);
  };

  const menuItems = [
    { icon: 'globe-outline' as const, label: t('language'), value: lang === 'en' ? t('english') : t('arabic'), action: toggleLanguage },
    { icon: 'document-text-outline' as const, label: t('totalJobs'), value: `${driver.jobsCompleted}`, action: () => {} },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={[styles.header, { flexDirection: rowDir }]}>
        <Text style={[styles.title, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{t('tabProfile')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
              {driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={[styles.name, { fontFamily: font.bold, color: colors.text, textAlign: align }]}>{driver.name}</Text>
          <Text style={[styles.phone, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}>{driver.phone}</Text>

          <View style={[styles.ratingRow, { flexDirection: rowDir }]}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name={i <= Math.round(driver.rating) ? 'star' : 'star-outline'} size={16} color="#F39C12" />
            ))}
            <Text style={[styles.ratingText, { fontFamily: font.medium, color: colors.text }]}>{driver.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={[styles.onlineRow, { backgroundColor: colors.card, flexDirection: rowDir }]}>
          <View style={[styles.onlineLeft, { flexDirection: rowDir }]}>
            <View style={[styles.onlineDot, { backgroundColor: driver.isOnline ? colors.success : colors.mutedForeground }]} />
            <Text style={[styles.onlineLabel, { fontFamily: font.semibold, color: colors.text }]}>{t('availability')}</Text>
          </View>
          <Switch
            value={driver.isOnline}
            onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleOnline(); }}
            trackColor={{ false: colors.muted, true: 'rgba(46,204,113,0.4)' }}
            thumbColor={driver.isOnline ? colors.success : '#8E8A9D'}
          />
        </View>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.7}
            onPress={item.action}
            style={[styles.menuItem, { flexDirection: rowDir, backgroundColor: colors.card }]}
          >
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={[styles.menuLabel, { fontFamily: font.medium, color: colors.text, textAlign: align }]}>{item.label}</Text>
            <Text style={[styles.menuValue, { fontFamily: font.regular, color: colors.mutedForeground }]}>{item.value}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: 'rgba(231,76,60,0.4)' }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { fontFamily: font.semibold, color: colors.destructive }]}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 22 },
  profileCard: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 24 },
  name: { fontSize: 20, marginTop: 4 },
  phone: { fontSize: 14, marginTop: 4 },
  ratingRow: { marginTop: 12, alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, marginLeft: 6 },
  onlineRow: { marginTop: 16, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  onlineLeft: { alignItems: 'center', gap: 10 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineLabel: { fontSize: 15 },
  menuItem: { marginTop: 12, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  menuLabel: { flex: 1, fontSize: 15, marginHorizontal: 12 },
  menuValue: { fontSize: 14, marginRight: 8 },
  logoutBtn: { marginTop: 24, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'row' },
  logoutText: { fontSize: 15 },
});
