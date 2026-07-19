import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

function MenuItem({ icon, label, sublabel, onPress, accent }: {
  icon: string; label: string; sublabel?: string; onPress?: () => void; accent?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, accent && styles.menuIconAccent]}>
        <Ionicons name={icon as any} size={20} color={accent ? '#E74C3C' : '#2D1B69'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, accent && styles.menuLabelAccent]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C0C0D0" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useApp();

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/auth');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient colors={['#C21875', '#8B35BB']} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'G'}
            </Text>
          </LinearGradient>
        </View>
        <Text style={styles.userName}>{user?.name ?? 'Guest User'}</Text>
        <Text style={styles.userPhone}>{user?.phone ?? ''}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.vehicles?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {/* Membership Card */}
        {user?.membership !== 'none' && (
          <TouchableOpacity style={styles.memberCard} onPress={() => router.push('/(tabs)/membership' as any)}>
            <LinearGradient colors={['#2D1B69', '#C21875']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.memberCardGradient}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberCardTitle}>{user.membership.charAt(0).toUpperCase() + user.membership.slice(1)} Membership</Text>
                <Text style={styles.memberCardSub}>Valid until Dec 31, 2026</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Vehicles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Vehicles</Text>
          {user?.vehicles?.map((v) => (
            <TouchableOpacity key={v.id} style={styles.vehicleCard} activeOpacity={0.8}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={22} color="#2D1B69" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{v.year} {v.make} {v.model}</Text>
                <Text style={styles.vehiclePlate}>{v.plate} · {v.color}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C0C0D0" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={20} color="#2D1B69" />
            <Text style={styles.addBtnText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="location-outline" label="Saved Locations" sublabel="2 locations saved" />
            <MenuItem icon="receipt-outline" label="Invoices & Billing" />
            <MenuItem icon="gift-outline" label="Rewards & Promo Codes" sublabel={`${user?.points ?? 0} points`} />
            <MenuItem icon="people-outline" label="Referral Program" sublabel="Earn 50 SAR per referral" />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="help-circle-outline" label="FAQ" />
            <MenuItem icon="shield-outline" label="Safety Tips" />
            <MenuItem icon="chatbubble-outline" label="AI Assistant" />
          </View>
        </View>

        {/* General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="notifications-outline" label="Notifications" />
            <MenuItem icon="moon-outline" label="Dark Mode" />
            <MenuItem icon="language-outline" label="Language" sublabel="English" />
            <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} accent />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  userPhone: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 24, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  memberCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  memberCardGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  memberCardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  memberCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 12 },
  menuGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F8', gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  menuIconAccent: { backgroundColor: '#FEE8E6' },
  menuLabel: { fontSize: 15, color: '#1A1A1A', fontFamily: 'Inter_500Medium' },
  menuLabelAccent: { color: '#E74C3C' },
  menuSublabel: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginTop: 1 },
  vehicleCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  vehicleIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  vehiclePlate: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  addBtnText: { fontSize: 14, color: '#2D1B69', fontFamily: 'Inter_600SemiBold' },
});
