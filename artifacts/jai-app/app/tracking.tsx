import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Dimensions, Share, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import { useApp } from '@/context/AppContext';
import { jaiSocket } from '@/lib/socket';
import { getAuthToken } from '@/lib/api';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ── Riyadh grid reference ──────────────────────────────────────────────────────
// Maps real GPS lat/lng to a [0,1] screen position on the fake grid
const CENTER_LAT = 24.7136;
const CENTER_LNG = 46.6753;
const SPREAD     = 0.15; // degrees visible in each direction

function gpsToScreen(lat: number, lng: number): { x: number; y: number } {
  const x = 0.5 + ((lng - CENTER_LNG) / SPREAD) * 0.4;
  const y = 0.5 - ((lat - CENTER_LAT) / SPREAD) * 0.4;
  return {
    x: Math.max(0.05, Math.min(0.9, x)),
    y: Math.max(0.05, Math.min(0.7, y)),
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MapBackground() {
  return (
    <View style={styles.mapBg}>
      <LinearGradient
        colors={['#EDE8F8', '#F0EDF8', '#E8E4F5']}
        style={StyleSheet.absoluteFill}
      />
      {[0.2, 0.4, 0.6, 0.8].map((v, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { top: height * 0.5 * v, width: '100%', height: 1 }]} />
      ))}
      {[0.15, 0.35, 0.55, 0.75, 0.9].map((v, i) => (
        <View key={`v${i}`} style={[styles.gridLine, { left: width * v, height: '100%', width: 1 }]} />
      ))}
      <View style={styles.routeLine} />
      <View style={styles.destPin}>
        <View style={styles.destPinDot} />
      </View>
    </View>
  );
}

function PulsingDot({ color = '#2D1B69' }: { color?: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value   = withRepeat(withSequence(withTiming(1.8, { duration: 1000 }), withTiming(1, { duration: 500 })), -1, true);
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 1000 }), withTiming(1, { duration: 500 })), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));
  return (
    <View style={styles.dotContainer}>
      <Animated.View style={[styles.pulseDot, { backgroundColor: `${color}40` }, pulseStyle]} />
      <View style={[styles.coreDot, { backgroundColor: color }]} />
    </View>
  );
}

function SearchingBadge({ font }: { font: any }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.topBadge, { flexDirection: 'row' }, fadeStyle]}>
      <View style={[styles.activeDot, { backgroundColor: '#F39C12' }]} />
      <Text style={[styles.topBadgeText, { fontFamily: font.semibold }]}>
        Finding technician…
      </Text>
    </Animated.View>
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

// ── Main screen ────────────────────────────────────────────────────────────────

interface TechInfo {
  id: number;
  name: string;
  phone: string;
  rating: number;
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { t, isRTL, font } = useLanguage();
  const { activeRequest, setActiveRequest } = useApp();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align  = isRTL ? 'right' : 'left';

  // Real-time state
  const [jobStatus, setJobStatus] = useState<string>(activeRequest?.status ?? 'pending');
  const [tech, setTech]           = useState<TechInfo | null>(activeRequest?.tech ?? null);
  const [techPos, setTechPos]     = useState<{ x: number; y: number }>({ x: 0.35, y: 0.42 });
  const [etaMin, setEtaMin]       = useState<number | null>(activeRequest?.etaMin ?? null);

  const jobId     = activeRequest?.jobId;
  const requestId = activeRequest?.requestId;

  // ── WebSocket subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !jobId) return;

    // Ensure socket is connected
    if (!jaiSocket.connected) jaiSocket.connect(token);

    // Join this job's room to receive technician updates.
    // Room key is the job ID (matches dispatch.ts and driver location relay).
    jaiSocket.joinRoom(`job:${jobId}`);

    const offAccepted = jaiSocket.on('job_accepted', (payload) => {
      const { techName, techPhone, techId, techRating } = payload as {
        techName: string; techPhone: string; techId: number; techRating: number;
      };
      const techInfo: TechInfo = {
        id:     techId,
        name:   techName   ?? 'Technician',
        phone:  techPhone  ?? '',
        rating: techRating ?? 4.5,
      };
      setTech(techInfo);
      setJobStatus('accepted');
      setActiveRequest(activeRequest ? { ...activeRequest, status: 'assigned', tech: techInfo } : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });

    const offStatus = jaiSocket.on('job_status', (payload) => {
      const { status } = payload as { status: string };
      setJobStatus(status);
      setActiveRequest(activeRequest ? { ...activeRequest, status: status as any } : null);
    });

    const offLocation = jaiSocket.on('tech_location', (payload) => {
      const { lat, lng } = payload as { lat: number; lng: number };
      // Map GPS coords to fake-map screen position
      const pos = gpsToScreen(lat, lng);
      setTechPos(pos);

      // Very rough ETA estimate: ~1 min per 600m at city speeds (30 km/h)
      const dLat  = lat  - CENTER_LAT;
      const dLng  = lng  - CENTER_LNG;
      const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
      const distKm  = distDeg * 111; // 1° ≈ 111 km
      setEtaMin(Math.max(1, Math.round(distKm * 2)));
    });

    return () => {
      offAccepted();
      offStatus();
      offLocation();
      jaiSocket.leaveRoom(`job:${jobId}`);
    };
  }, [jobId, requestId]);

  const isSearching   = jobStatus === 'pending';
  const isEnRoute     = jobStatus === 'en_route';
  const isCompleted   = jobStatus === 'completed' || jobStatus === 'cancelled';

  const badgeLabel = isSearching
    ? null  // searching badge handles itself
    : isEnRoute
      ? t('technicianEnRoute')
      : jobStatus === 'arrived'
        ? (isRTL ? 'الفني وصل' : 'Technician arrived')
        : jobStatus === 'working'
          ? (isRTL ? 'جارٍ العمل' : 'Working')
          : jobStatus === 'completed'
            ? (isRTL ? 'اكتمل' : 'Completed')
            : t('technicianEnRoute');

  const initials = tech
    ? tech.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (isRTL ? 'ج' : 'T');

  return (
    <View style={{ flex: 1 }}>
      <MapBackground />

      {/* Technician marker — position driven by GPS or default */}
      <View style={[styles.technicianMarker, { left: `${techPos.x * 100}%`, top: `${techPos.y * 100}%` }]}>
        {isSearching
          ? <PulsingDot color="#F39C12" />
          : <PulsingDot color="#2D1B69" />
        }
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0), flexDirection: rowDir }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)' as any)}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#1A1A1A" />
        </TouchableOpacity>

        {isSearching ? (
          <SearchingBadge font={font} />
        ) : (
          <View style={[styles.topBadge, { flexDirection: rowDir }]}>
            <View style={styles.activeDot} />
            <Text style={[styles.topBadgeText, { fontFamily: font.semibold }]}>{badgeLabel}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try { await Share.share({ message: t('shareEtaMsg') }); } catch { /* dismissed */ }
          }}
        >
          <Ionicons name="share-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) }]}>

        {isSearching ? (
          // ── Searching state ────────────────────────────────────────────────
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#2D1B69" style={{ marginBottom: 16 }} />
            <Text style={[styles.searchingTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'جارٍ البحث عن فني قريب…' : 'Finding a nearby technician…'}
            </Text>
            <Text style={[styles.searchingSubtitle, { fontFamily: font.regular }]}>
              {isRTL ? 'سيصلك إشعار عند قبول طلبك' : 'You\'ll be notified when a technician accepts'}
            </Text>
          </View>
        ) : (
          // ── Technician en-route state ──────────────────────────────────────
          <>
            <View style={[styles.etaRow, { flexDirection: rowDir }]}>
              <View>
                <Text style={[styles.etaTime, { fontFamily: font.bold, textAlign: align }]}>
                  {etaMin != null ? `${etaMin}` : '--'} {isRTL ? 'دقيقة' : 'min'}
                </Text>
                <Text style={[styles.etaLabel, { fontFamily: font.regular, textAlign: align }]}>
                  {t('estimatedArrival')}
                </Text>
              </View>
              <View style={[styles.etaBadge, { flexDirection: rowDir }]}>
                <Ionicons name="location" size={14} color="#2ECC71" />
                <Text style={[styles.etaBadgeText, { fontFamily: font.semibold }]}>
                  {isRTL ? 'في الطريق' : 'En route'}
                </Text>
              </View>
            </View>

            <EtaProgress />

            {/* Technician info */}
            <View style={[styles.techRow, { flexDirection: rowDir }]}>
              <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.techAvatar}>
                <Text style={[styles.techAvatarText, { fontFamily: font.bold }]}>{initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.techName, { fontFamily: font.bold, textAlign: align }]}>
                  {tech?.name ?? t('techName')}
                </Text>
                <View style={[{ flexDirection: rowDir, alignItems: 'center' }]}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= Math.floor(tech?.rating ?? 4.8) ? 'star' : 'star-half'}
                      size={13}
                      color="#F39C12"
                    />
                  ))}
                  <Text style={[styles.techRatingText, { fontFamily: font.regular }]}>
                    {(tech?.rating ?? 4.8).toFixed(1)} · {t('batterySpecialist')}
                  </Text>
                </View>
              </View>
              {tech && (
                <View style={[styles.techActions, { flexDirection: rowDir }]}>
                  <TouchableOpacity
                    style={styles.techActionBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openURL(`tel:${tech.phone}`);
                    }}
                  >
                    <Ionicons name="call" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.techActionBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openURL(`https://wa.me/${tech.phone.replace(/\D/g, '')}`);
                    }}
                  >
                    <Ionicons name="chatbubble" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Service/vehicle row */}
            <View style={[styles.serviceRow, { flexDirection: rowDir }]}>
              {activeRequest?.serviceType && (
                <View style={[styles.serviceItem, { flexDirection: rowDir }]}>
                  <Ionicons name="construct-outline" size={16} color="#6B7280" />
                  <Text style={[styles.serviceItemText, { fontFamily: font.regular }]}>
                    {activeRequest.serviceType}
                  </Text>
                </View>
              )}
              {activeRequest?.payout && (
                <View style={[styles.serviceItem, { flexDirection: rowDir }]}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={[styles.serviceItemText, { fontFamily: font.regular }]}>
                    {activeRequest.payout} {isRTL ? 'ر.س' : 'SAR'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setActiveRequest(null);
            router.replace('/(tabs)' as any);
          }}
        >
          <Text style={[styles.cancelText, { fontFamily: font.semibold }]}>
            {isCompleted ? (isRTL ? 'إغلاق' : 'Close') : t('cancelRequest')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBg: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(91,44,145,0.08)' },
  routeLine: {
    position: 'absolute', left: '25%', top: '35%',
    width: 3, height: '30%', backgroundColor: '#2D1B69',
    borderRadius: 2, transform: [{ rotate: '20deg' }],
  },
  destPin: {
    position: 'absolute', left: '55%', top: '25%',
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C21875', justifyContent: 'center', alignItems: 'center',
  },
  destPinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  technicianMarker: { position: 'absolute' },
  dotContainer: { justifyContent: 'center', alignItems: 'center' },
  pulseDot: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  coreDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#FFFFFF' },
  topBar: {
    position: 'absolute', left: 16, right: 16,
    alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  topBadge: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71' },
  topBadgeText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  searchingContainer: { alignItems: 'center', paddingVertical: 16 },
  searchingTitle:    { fontSize: 18, color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  searchingSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  etaRow: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  etaTime: { fontSize: 32, fontWeight: '800', color: '#2D1B69' },
  etaLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  etaBadge: {
    alignItems: 'center', gap: 5,
    backgroundColor: '#E8F8F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
  },
  etaBadgeText: { fontSize: 13, color: '#2ECC71' },
  progressTrack: {
    height: 6, backgroundColor: '#F0F0F8', borderRadius: 3,
    marginBottom: 20, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#2D1B69', borderRadius: 3 },
  techRow: {
    alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  techAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  techAvatarText:  { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  techName:        { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  techRatingText:  { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  techActions:     { gap: 8 },
  techActionBtn:   {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center',
  },
  serviceRow:     { gap: 16, marginBottom: 20 },
  serviceItem:    { alignItems: 'center', gap: 6, flex: 1 },
  serviceItemText: { fontSize: 13, color: '#6B7280' },
  cancelBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA',
  },
  cancelText: { fontSize: 14, color: '#E74C3C' },
});
