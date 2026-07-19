import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

function MenuItem({ icon, label, sublabel, onPress, accent, rightLabel }: {
  icon: string; label: string; sublabel?: string;
  onPress?: () => void; accent?: boolean; rightLabel?: string;
}) {
  const { isRTL, font } = useLanguage();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  return (
    <TouchableOpacity style={[styles.menuItem, { flexDirection: rowDir }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, accent && styles.menuIconAccent]}>
        <Ionicons name={icon as any} size={20} color={accent ? '#E74C3C' : '#2D1B69'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, accent && styles.menuLabelAccent, { fontFamily: font.medium, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
        {sublabel ? <Text style={[styles.menuSublabel, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}>{sublabel}</Text> : null}
      </View>
      {rightLabel ? <Text style={[styles.menuRightLabel, { fontFamily: font.regular }]}>{rightLabel}</Text> : null}
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#C0C0D0" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useApp();
  const { t, isRTL, font, toggleLanguage, lang } = useLanguage();

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/auth');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient colors={['#C21875', '#8B35BB']} style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'G'}
            </Text>
          </LinearGradient>
        </View>
        <Text style={[styles.userName, { fontFamily: font.bold }]}>{user?.name ?? 'Guest User'}</Text>
        <Text style={[styles.userPhone, { fontFamily: font.regular }]}>{user?.phone ?? ''}</Text>
        <View style={[styles.statsRow, { flexDirection: rowDir }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: font.bold }]}>{user?.vehicles?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { fontFamily: font.regular }]}>{t('vehiclesLabel')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: font.bold }]}>4</Text>
            <Text style={[styles.statLabel, { fontFamily: font.regular }]}>{t('requestsLabel')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: font.bold }]}>{user?.points ?? 0}</Text>
            <Text style={[styles.statLabel, { fontFamily: font.regular }]}>{t('pointsLabel')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {user?.membership !== 'none' && (
          <TouchableOpacity style={styles.memberCard} onPress={() => router.push('/(tabs)/membership' as any)}>
            <LinearGradient colors={['#2D1B69', '#C21875']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.memberCardGradient, { flexDirection: rowDir }]}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberCardTitle, { fontFamily: font.bold, textAlign: align }]}>{t('premiumMembership')}</Text>
                <Text style={[styles.memberCardSub, { fontFamily: font.regular, textAlign: align }]}>{t('validUntil')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('myVehicles')}</Text>
          {user?.vehicles?.map((v) => (
            <TouchableOpacity key={v.id} style={[styles.vehicleCard, { flexDirection: rowDir }]} activeOpacity={0.8}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={22} color="#2D1B69" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vehicleName, { fontFamily: font.semibold, textAlign: align }]}>{v.year} {v.make} {v.model}</Text>
                <Text style={[styles.vehiclePlate, { fontFamily: font.regular, textAlign: align }]}>{v.plate} · {v.color}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#C0C0D0" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.addBtn, { flexDirection: rowDir }]}>
            <Ionicons name="add-circle-outline" size={20} color="#2D1B69" />
            <Text style={[styles.addBtnText, { fontFamily: font.semibold }]}>{t('addVehicle')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('account')}</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="location-outline" label={t('savedLocations')} sublabel={t('locationsSaved')} />
            <MenuItem icon="receipt-outline" label={t('invoices')} />
            <MenuItem icon="gift-outline" label={t('rewards')} sublabel={`${user?.points ?? 0} ${t('pointsLabel')}`} />
            <MenuItem icon="people-outline" label={t('referral')} sublabel={t('referralSub')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('support')}</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="help-circle-outline" label={t('faq')} />
            <MenuItem icon="shield-outline" label={t('safetyTips')} />
            <MenuItem icon="chatbubble-outline" label={t('aiAssistant')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('general')}</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="notifications-outline" label={t('darkMode')} />
            <MenuItem
              icon="language-outline"
              label={t('languageLabel')}
              rightLabel={lang === 'en' ? 'English' : 'العربية'}
              onPress={toggleLanguage}
            />
            <MenuItem icon="log-out-outline" label={t('signOut')} onPress={handleLogout} accent />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  avatarContainer: { marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  userPhone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  statsRow: {
    gap: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  memberCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  memberCardGradient: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  memberCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  memberCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  menuGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  menuItem: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8', gap: 12,
  },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  menuIconAccent: { backgroundColor: '#FEE8E6' },
  menuLabel: { fontSize: 15, color: '#1A1A1A' },
  menuLabelAccent: { color: '#E74C3C' },
  menuSublabel: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  menuRightLabel: { fontSize: 13, color: '#6B7280', marginRight: 4 },
  vehicleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  vehicleIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  vehiclePlate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  addBtnText: { fontSize: 14, color: '#2D1B69' },
});
