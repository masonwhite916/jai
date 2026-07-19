import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const SERVICES = [
  { id: 'battery', label: 'Battery', icon: 'battery-charging', lib: 'Ionicons', color: '#2D1B69' },
  { id: 'fuel', label: 'Fuel', icon: 'gas-station', lib: 'MCIcons', color: '#5B2C91' },
  { id: 'tire', label: 'Tire', icon: 'tire', lib: 'MCIcons', color: '#7B2A9E' },
  { id: 'tow', label: 'Tow Truck', icon: 'tow-truck', lib: 'MCIcons', color: '#C21875' },
  { id: 'lockout', label: 'Lockout', icon: 'key', lib: 'Ionicons', color: '#2D1B69' },
  { id: 'mechanic', label: 'Mechanic', icon: 'wrench', lib: 'MCIcons', color: '#5B2C91' },
  { id: 'electric', label: 'Electrical', icon: 'flash', lib: 'Ionicons', color: '#C21875' },
] as const;

const OFFERS = [
  { id: '1', title: '30% Off Battery Jump Start', subtitle: 'Valid until July 31, 2026', badge: 'HOT' },
  { id: '2', title: 'Free Tire Check with Any Service', subtitle: 'This month only', badge: 'NEW' },
];

function ServiceIcon({ icon, lib, color }: { icon: string; lib: string; color: string }) {
  if (lib === 'Ionicons') {
    return <Ionicons name={icon as any} size={26} color={color} />;
  }
  return <MaterialCommunityIcons name={icon as any} size={26} color={color} />;
}

function PulsingButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[animStyle]}>
      <TouchableOpacity
        style={styles.sosButton}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <LinearGradient colors={['#E74C3C', '#C0392B']} style={styles.sosGradient}>
          <Ionicons name="warning" size={28} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();

  const firstName = user?.name?.split(' ')[0] ?? 'Guest';

  function handleService(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/request/${id}` as any);
  }

  function handleSOS() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/request/tow' as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#2D1B69', '#5B2C91', '#7B2A9E']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.locationRow}>
          <Ionicons name="location-sharp" size={16} color="#C21875" />
          <Text style={styles.locationText}>Riyadh, Saudi Arabia</Text>
          <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar}>
          <Feather name="search" size={16} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Search for a service...</Text>
        </TouchableOpacity>

        {/* SOS Button */}
        <View style={styles.sosRow}>
          <PulsingButton onPress={handleSOS} />
          <View style={styles.sosLabel}>
            <Text style={styles.sosLabelTitle}>Emergency?</Text>
            <Text style={styles.sosLabelSub}>Tap SOS for immediate help</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {/* Membership badge */}
        {user?.membership !== 'none' && (
          <TouchableOpacity style={styles.memberBadge} onPress={() => router.push('/(tabs)/membership' as any)}>
            <LinearGradient colors={['#2D1B69', '#C21875']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.memberBadgeGradient}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.memberBadgeText}>{user.membership.charAt(0).toUpperCase() + user.membership.slice(1)} Member</Text>
              <Text style={styles.memberPoints}>{user.points} pts</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a Service</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
            {SERVICES.map((svc) => (
              <TouchableOpacity key={svc.id} style={styles.serviceCard} onPress={() => handleService(svc.id)} activeOpacity={0.8}>
                <View style={[styles.serviceIconBg, { backgroundColor: svc.color + '15' }]}>
                  <ServiceIcon icon={svc.icon} lib={svc.lib} color={svc.color} />
                </View>
                <Text style={styles.serviceLabel}>{svc.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: '#25D366' }]} activeOpacity={0.85}>
              <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              <Text style={styles.contactLabel}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactCard, { backgroundColor: '#2D1B69' }]} activeOpacity={0.85}>
              <Ionicons name="call" size={24} color="#FFFFFF" />
              <Text style={styles.contactLabel}>Call Center</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearby Technicians */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Technicians</Text>
          <View style={styles.nearbyCard}>
            <View style={styles.nearbyDot} />
            <View style={styles.nearbyInfo}>
              <Text style={styles.nearbyCount}>12 technicians nearby</Text>
              <Text style={styles.nearbyRadius}>within 5 km radius</Text>
            </View>
            <View style={styles.nearbyEta}>
              <Text style={styles.nearbyEtaText}>~8 min</Text>
              <Text style={styles.nearbyEtaLabel}>avg. ETA</Text>
            </View>
          </View>
        </View>

        {/* Latest Offers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Offers</Text>
          {OFFERS.map((offer) => (
            <TouchableOpacity key={offer.id} style={styles.offerCard} activeOpacity={0.85}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.offerGradient}>
                <View style={styles.offerBadge}>
                  <Text style={styles.offerBadgeText}>{offer.badge}</Text>
                </View>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  locationText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', flex: 1 },
  sosRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sosButton: { borderRadius: 28, overflow: 'hidden', shadowColor: '#E74C3C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  sosGradient: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', gap: 2 },
  sosText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  sosLabel: {},
  sosLabelTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  sosLabelSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', marginTop: 2 },
  memberBadge: { marginHorizontal: 20, marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  memberBadgeGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  memberBadgeText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  memberPoints: { fontSize: 14, color: '#FFD700', fontFamily: 'Inter_600SemiBold' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 14 },
  servicesScroll: { gap: 12, paddingRight: 20 },
  serviceCard: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  serviceIconBg: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  serviceLabel: { fontSize: 12, color: '#1A1A1A', fontFamily: 'Inter_500Medium', textAlign: 'center' },
  contactRow: { flexDirection: 'row', gap: 12 },
  contactCard: {
    flex: 1, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  contactLabel: { fontSize: 13, color: '#FFFFFF', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  nearbyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  nearbyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ECC71' },
  nearbyInfo: { flex: 1 },
  nearbyCount: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  nearbyRadius: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  nearbyEta: { alignItems: 'flex-end' },
  nearbyEtaText: { fontSize: 18, fontWeight: '700', color: '#2D1B69', fontFamily: 'Inter_700Bold' },
  nearbyEtaLabel: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  offerCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  offerGradient: { padding: 18 },
  offerBadge: { backgroundColor: '#C21875', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  offerBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  offerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  offerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
});
