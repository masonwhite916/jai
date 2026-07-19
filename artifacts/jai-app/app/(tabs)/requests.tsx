import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Request {
  id: string;
  service: string;
  icon: string;
  date: string;
  address: string;
  status: 'completed' | 'active' | 'cancelled';
  cost: string;
  technician: string;
  rating?: number;
}

const REQUESTS: Request[] = [
  {
    id: 'r1', service: 'Battery Jump Start', icon: 'battery-charging',
    date: 'Today, 10:24 AM', address: 'King Fahd Road, Riyadh',
    status: 'active', cost: '120 SAR', technician: 'Ahmed Al-Ghamdi',
  },
  {
    id: 'r2', service: 'Tire Replacement', icon: 'tire',
    date: 'Jul 15, 2026', address: 'Olaya Street, Riyadh',
    status: 'completed', cost: '350 SAR', technician: 'Khalid Hassan', rating: 5,
  },
  {
    id: 'r3', service: 'Fuel Delivery', icon: 'gas-station',
    date: 'Jul 10, 2026', address: 'Prince Mohammed Bin Salman Road',
    status: 'completed', cost: '80 SAR', technician: 'Omar Al-Shehri', rating: 4,
  },
  {
    id: 'r4', service: 'Lockout Assistance', icon: 'key',
    date: 'Jun 28, 2026', address: 'Al Nakheel District, Riyadh',
    status: 'cancelled', cost: '-', technician: '-', 
  },
];

function StatusBadge({ status }: { status: Request['status'] }) {
  const map = {
    active: { label: 'Active', color: '#2ECC71', bg: '#E8F8F0' },
    completed: { label: 'Completed', color: '#2D1B69', bg: '#EDE8F8' },
    cancelled: { label: 'Cancelled', color: '#E74C3C', bg: '#FEE8E6' },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={13} color="#F39C12" />
      ))}
    </View>
  );
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeRequest = REQUESTS.find(r => r.status === 'active');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <Text style={styles.headerTitle}>My Requests</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {/* Active Request Banner */}
        {activeRequest && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push('/tracking' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#C21875', '#8B35BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeBannerGradient}>
              <View style={styles.activePulse} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>Request in Progress</Text>
                <Text style={styles.activeBannerSub}>{activeRequest.service} · Ahmed is on the way</Text>
              </View>
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Request List */}
        <Text style={styles.sectionTitle}>Request History</Text>
        {REQUESTS.map((req) => (
          <TouchableOpacity
            key={req.id}
            style={styles.requestCard}
            activeOpacity={0.85}
            onPress={req.status === 'active' ? () => router.push('/tracking' as any) : undefined}
          >
            <View style={[styles.reqIconBg, { backgroundColor: '#2D1B6915' }]}>
              <MaterialCommunityIcons name={req.icon as any} size={24} color="#2D1B69" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.reqTopRow}>
                <Text style={styles.reqService}>{req.service}</Text>
                <StatusBadge status={req.status} />
              </View>
              <Text style={styles.reqAddress} numberOfLines={1}>{req.address}</Text>
              <Text style={styles.reqDate}>{req.date}</Text>
              {req.rating ? <Stars rating={req.rating} /> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.reqCost}>{req.cost}</Text>
              <Ionicons name="chevron-forward" size={16} color="#C0C0D0" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  activeBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  activeBannerGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activePulse: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
  activeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  activeBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 14 },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  reqIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  reqTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqService: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', fontFamily: 'Inter_600SemiBold', flex: 1 },
  reqAddress: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  reqDate: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  reqCost: { fontSize: 14, fontWeight: '700', color: '#2D1B69', fontFamily: 'Inter_700Bold' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
