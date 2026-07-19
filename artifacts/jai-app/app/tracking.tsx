import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

function MapBackground() {
  // Stylized map representation using colored route
  return (
    <View style={styles.mapBg}>
      <LinearGradient colors={['#EDE8F8', '#F0EDF8', '#E8E4F5']} style={StyleSheet.absoluteFill} />
      {/* Grid lines to suggest map */}
      {[0.2, 0.4, 0.6, 0.8].map((v, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: height * 0.5 * v, width: '100%', height: 1 }]} />
      ))}
      {[0.15, 0.35, 0.55, 0.75, 0.9].map((v, i) => (
        <View key={`v${i}`} style={[styles.gridLine, { left: width * v, height: '100%', width: 1 }]} />
      ))}
      {/* Route line */}
      <View style={styles.routeLine} />
      {/* Destination pin */}
      <View style={styles.destPin}>
        <View style={styles.destPinDot} />
      </View>
    </View>
  );
}

function PulsingDot() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.8, { duration: 1000 }), withTiming(1, { duration: 500 })), -1, true);
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 1000 }), withTiming(1, { duration: 500 })), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[styles.pulseDot, pulseStyle]} />
      <View style={styles.coreDot} />
    </View>
  );
}

function EtaProgress() {
  const progress = useSharedValue(0.2);
  useEffect(() => {
    progress.value = withTiming(0.75, { duration: 3000, easing: Easing.out(Easing.quad) });
  }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <MapBackground />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.topBadgeText}>Technician En Route</Text>
        </View>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="share-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Technician marker on map */}
      <View style={styles.technicianMarker}>
        <PulsingDot />
      </View>

      {/* Bottom Card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) }]}>
        {/* ETA */}
        <View style={styles.etaRow}>
          <View>
            <Text style={styles.etaTime}>8 min</Text>
            <Text style={styles.etaLabel}>Estimated arrival</Text>
          </View>
          <View style={styles.etaBadge}>
            <Ionicons name="location" size={14} color="#2ECC71" />
            <Text style={styles.etaBadgeText}>3.2 km away</Text>
          </View>
        </View>

        <EtaProgress />

        {/* Technician Info */}
        <View style={styles.techRow}>
          <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.techAvatar}>
            <Text style={styles.techAvatarText}>AG</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.techName}>Ahmed Al-Ghamdi</Text>
            <View style={styles.techRating}>
              {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= 4 ? 'star' : 'star-half'} size={13} color="#F39C12" />)}
              <Text style={styles.techRatingText}>4.8 · Battery Specialist</Text>
            </View>
          </View>
          <View style={styles.techActions}>
            <TouchableOpacity style={styles.techActionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="call" size={18} color="#2D1B69" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.techActionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="chatbubble" size={18} color="#2D1B69" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle & Service */}
        <View style={styles.serviceRow}>
          <View style={styles.serviceItem}>
            <Ionicons name="car-outline" size={16} color="#6B7280" />
            <Text style={styles.serviceItemText}>Toyota Camry 2022</Text>
          </View>
          <View style={styles.serviceItem}>
            <Ionicons name="battery-charging-outline" size={16} color="#6B7280" />
            <Text style={styles.serviceItemText}>Battery Jump Start</Text>
          </View>
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBg: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(91,44,145,0.08)' },
  routeLine: {
    position: 'absolute',
    left: '25%', top: '35%',
    width: 3, height: '30%',
    backgroundColor: '#2D1B69',
    borderRadius: 2,
    transform: [{ rotate: '20deg' }],
  },
  destPin: {
    position: 'absolute', left: '55%', top: '25%',
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C21875', justifyContent: 'center', alignItems: 'center',
  },
  destPinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  technicianMarker: { position: 'absolute', left: '35%', top: '42%' },
  dotContainer: { justifyContent: 'center', alignItems: 'center' },
  pulseDot: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D1B6940' },
  coreDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2D1B69', borderWidth: 2, borderColor: '#FFFFFF' },
  topBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  topBadge: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71' },
  topBadgeText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  etaTime: { fontSize: 32, fontWeight: '800', color: '#2D1B69', fontFamily: 'Inter_700Bold' },
  etaLabel: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F8F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  etaBadgeText: { fontSize: 13, color: '#2ECC71', fontFamily: 'Inter_600SemiBold' },
  progressTrack: { height: 6, backgroundColor: '#F0F0F8', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2D1B69', borderRadius: 3 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  techAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  techAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  techName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  techRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  techRatingText: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular', marginLeft: 4 },
  techActions: { flexDirection: 'row', gap: 8 },
  techActionBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  serviceRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  serviceItemText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA' },
  cancelText: { fontSize: 14, color: '#E74C3C', fontFamily: 'Inter_600SemiBold' },
});
