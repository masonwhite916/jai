import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Share, Linking, ActivityIndicator, Dimensions, ScrollView, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, Easing, withSpring, runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
import { useLanguage } from '@/context/LanguageContext';
import { useApp } from '@/context/AppContext';
import { jaiSocket } from '@/lib/socket';
import { getAuthToken, apiFetch } from '@/lib/api';
import * as Haptics from 'expo-haptics';
import TrackingMap from '@/components/TrackingMap';

// ── Haversine distance (km) between two GPS points ────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── ETA: 30 km/h city speed → 2 min/km ───────────────────────────────────────
function calcEta(customerLat: number, customerLng: number, techLat: number, techLng: number): number {
  const km = haversineKm(customerLat, customerLng, techLat, techLng);
  return Math.max(1, Math.round(km * 2));
}

// ── Shared font-set type (avoids `any` on font props) ─────────────────────────
interface FontSet { regular: string; medium: string; semibold: string; bold: string }

// ── Spinning wrench animation for "working" state ─────────────────────────────
const SpinningWrench = React.memo(function SpinningWrench() {
  const rotate = useSharedValue(0);
  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
    );
  }, []);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  return (
    <Animated.View style={spinStyle}>
      <Ionicons name="build" size={36} color="#FFFFFF" />
    </Animated.View>
  );
});

// ── Indeterminate progress bar (no fixed end-point) ──────────────────────────
const IndeterminateBar = React.memo(function IndeterminateBar() {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, []);
  // translateX must be a number on Android — percentage strings crash the native thread
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * SCREEN_W }],
  }));
  return (
    <View style={{ height: 4, backgroundColor: '#F0F0F8', borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: '100%', backgroundColor: '#2D1B69', borderRadius: 2, width: '55%' }, barStyle]} />
    </View>
  );
});

// ── Sub-components ─────────────────────────────────────────────────────────────

const PulsingDot = React.memo(function PulsingDot({ color = '#2D1B69' }: { color?: string }) {
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
});

const SearchingBadge = React.memo(function SearchingBadge({ font }: { font: FontSet }) {
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
});

const EtaProgress = React.memo(function EtaProgress() {
  const progress = useSharedValue(0.2);
  useEffect(() => {
    progress.value = withTiming(0.75, { duration: 3000, easing: Easing.out(Easing.quad) });
  }, []);
  // width must be a number on Android — percentage strings crash the native thread
  const barStyle = useAnimatedStyle(() => ({ width: progress.value * SCREEN_W }));
  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
});

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

  // ── Null-guard: redirect home if there is no active request ──────────────────
  useEffect(() => {
    if (!activeRequest?.jobId && !activeRequest?.requestId) {
      router.replace('/(tabs)');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time state
  const [jobStatus, setJobStatus] = useState<string>(activeRequest?.status ?? 'pending');
  const [tech, setTech]           = useState<TechInfo | null>(activeRequest?.tech ?? null);
  const [techGps, setTechGps]     = useState<{ lat: number; lng: number } | null>(null);
  const [etaMin, setEtaMin]       = useState<number | null>(activeRequest?.etaMin ?? null);

  const customerLat = activeRequest?.customerLat;
  const customerLng = activeRequest?.customerLng;

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
      setTechGps({ lat, lng });
      // ETA from the customer's actual position to the tech
      if (customerLat != null && customerLng != null) {
        setEtaMin(calcEta(customerLat, customerLng, lat, lng));
      }
    });

    return () => {
      offAccepted();
      offStatus();
      offLocation();
      jaiSocket.leaveRoom(`job:${jobId}`);
    };
  }, [jobId, requestId]);

  const isSearching = jobStatus === 'pending';
  const isEnRoute   = jobStatus === 'en_route' || jobStatus === 'accepted';
  const isArrived   = jobStatus === 'arrived';
  const isWorking   = jobStatus === 'working';
  const isCompleted = jobStatus === 'completed';
  const isCancelled = jobStatus === 'cancelled';

  // ── Rating state (customer rates technician) ─────────────────────────────
  const [ratingStars,     setRatingStars]     = useState(0);
  const [ratingComment,   setRatingComment]   = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingBusy,      setRatingBusy]      = useState(false);

  async function submitRating() {
    if (!ratingStars || !jobId) return;
    setRatingBusy(true);
    try {
      await apiFetch(`/api/jobs/${jobId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ stars: ratingStars, comment: ratingComment.trim() || undefined }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch { /* already rated or server error — still mark done */ }
    finally {
      setRatingSubmitted(true);
      setRatingBusy(false);
    }
  }

  // ── Draggable bottom sheet ───────────────────────────────────────────────────
  // Sheet occupies top: 0..SHEET_H. translateY slides it down so only 240px peeks.
  const SHEET_H       = SCREEN_H * 0.84;
  const SNAP_PEEK     = SCREEN_H - 240;               // collapsed: 240 px visible
  const SNAP_EXPANDED = SCREEN_H - SHEET_H + 8;       // expanded: almost full sheet

  const sheetY  = useSharedValue(SNAP_PEEK);
  const startY  = useSharedValue(SNAP_PEEK);

  // Auto-expand sheet when job completes so the rating card is immediately visible
  useEffect(() => {
    if (isCompleted) {
      sheetY.value = withSpring(SNAP_EXPANDED, { damping: 22, stiffness: 200 });
    }
  }, [isCompleted]);

  const panGesture = Gesture.Pan()
    .onBegin(() => { startY.value = sheetY.value; })
    .onUpdate((e) => {
      sheetY.value = Math.max(SNAP_EXPANDED, Math.min(SNAP_PEEK, startY.value + e.translationY));
    })
    .onEnd((e) => {
      const mid = (SNAP_PEEK + SNAP_EXPANDED) / 2;
      if (e.velocityY < -600 || sheetY.value < mid) {
        sheetY.value = withSpring(SNAP_EXPANDED, { damping: 22, stiffness: 200 });
      } else {
        sheetY.value = withSpring(SNAP_PEEK, { damping: 22, stiffness: 200 });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const badgeDotColor = isWorking ? '#F39C12' : isArrived ? '#2ECC71' : isCompleted ? '#2ECC71' : '#2ECC71';

  const badgeLabel = isSearching ? null
    : isEnRoute   ? t('technicianEnRoute')
    : isArrived   ? (isRTL ? 'الفني وصل' : 'Technician arrived')
    : isWorking   ? (isRTL ? 'جارٍ العمل' : 'Working on it…')
    : isCompleted ? (isRTL ? 'اكتمل ✓' : 'Completed ✓')
    : isCancelled ? (isRTL ? 'ملغي' : 'Cancelled')
    : t('technicianEnRoute');

  const initials = tech
    ? tech.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (isRTL ? 'ج' : 'T');

  return (
    <View style={{ flex: 1 }}>
      {/* Interactive map — always visible; falls back to Riyadh centre if GPS still loading */}
      <View style={styles.mapArea}>
        <TrackingMap
          customerLat={customerLat ?? 24.7136}
          customerLng={customerLng ?? 46.6753}
          techLat={techGps?.lat}
          techLng={techGps?.lng}
        />
        {/* Searching pulse overlay on top of map */}
        {isSearching && (
          <View style={styles.searchingOverlay}>
            <PulsingDot color="#F39C12" />
          </View>
        )}
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

      {/* Draggable bottom sheet */}
      <Animated.View style={[styles.bottomCard, { height: SHEET_H }, sheetAnimStyle]}>
          {/* Drag handle — only this area drives the pan gesture */}
          <GestureDetector gesture={panGesture}>
            <View style={styles.dragHandleWrap} hitSlop={16}>
              <View style={styles.dragHandle} />
            </View>
          </GestureDetector>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }}
          >

        {/* ── Searching ──────────────────────────────────────────────────── */}
        {isSearching && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#2D1B69" style={{ marginBottom: 16 }} />
            <Text style={[styles.searchingTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'جارٍ البحث عن فني قريب…' : 'Finding a nearby technician…'}
            </Text>
            <Text style={[styles.searchingSubtitle, { fontFamily: font.regular }]}>
              {isRTL ? 'سيصلك إشعار عند قبول طلبك' : "You'll be notified when a technician accepts"}
            </Text>
          </View>
        )}

        {/* ── En-route / arrived ─────────────────────────────────────────── */}
        {(isEnRoute || isArrived) && (
          <>
            {isEnRoute && (
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
                  <Ionicons name="navigate" size={14} color="#2ECC71" />
                  <Text style={[styles.etaBadgeText, { fontFamily: font.semibold }]}>
                    {isRTL ? 'في الطريق' : 'En route'}
                  </Text>
                </View>
              </View>
            )}
            {isArrived && (
              <View style={styles.arrivedBanner}>
                <Ionicons name="checkmark-circle" size={22} color="#2ECC71" />
                <Text style={[styles.arrivedText, { fontFamily: font.bold }]}>
                  {isRTL ? 'وصل الفني إلى موقعك' : 'Technician has arrived!'}
                </Text>
              </View>
            )}
            {isEnRoute && <EtaProgress />}
            {/* Tech info row */}
            <View style={[styles.techRow, { flexDirection: rowDir }]}>
              <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.techAvatar}>
                <Text style={[styles.techAvatarText, { fontFamily: font.bold }]}>{initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.techName, { fontFamily: font.bold, textAlign: align }]}>
                  {tech?.name ?? t('techName')}
                </Text>
                <View style={{ flexDirection: rowDir, alignItems: 'center' }}>
                  {[1,2,3,4,5].map((i) => (
                    <Ionicons key={i} name={i <= Math.floor(tech?.rating ?? 4.8) ? 'star' : 'star-half'} size={13} color="#F39C12" />
                  ))}
                  <Text style={[styles.techRatingText, { fontFamily: font.regular }]}>
                    {(tech?.rating ?? 4.8).toFixed(1)}
                  </Text>
                </View>
              </View>
              {tech && (
                <View style={[styles.techActions, { flexDirection: rowDir }]}>
                  <TouchableOpacity style={styles.techActionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${tech.phone}`); }}>
                    <Ionicons name="call" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.techActionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/chat/[jobId]' as any, params: { jobId: String(jobId), partnerName: tech.name } }); }}>
                    <Ionicons name="chatbubble" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Working ────────────────────────────────────────────────────── */}
        {isWorking && (
          <>
            {/* Animated header */}
            <View style={styles.workingHeader}>
              <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.workingIconWrap}>
                <SpinningWrench />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workingTitle, { fontFamily: font.bold, textAlign: align }]}>
                  {isRTL ? 'الفني يعمل الآن على سيارتك' : 'Technician is working on your car'}
                </Text>
                <Text style={[styles.workingSubtitle, { fontFamily: font.regular, textAlign: align }]}>
                  {isRTL ? 'يُرجى الانتظار بالقرب من مركبتك' : 'Please stay near your vehicle'}
                </Text>
              </View>
            </View>

            {/* Indeterminate progress bar */}
            <View style={styles.workingTrack}>
              <IndeterminateBar />
            </View>

            {/* Service + price chips */}
            <View style={[styles.workingChips, { flexDirection: rowDir }]}>
              {activeRequest?.serviceType && (
                <View style={styles.chip}>
                  <Ionicons name="build-outline" size={14} color="#2D1B69" />
                  <Text style={[styles.chipText, { fontFamily: font.semibold }]}>
                    {activeRequest.serviceType}
                  </Text>
                </View>
              )}
              {activeRequest?.payout != null && (
                <View style={[styles.chip, styles.chipGreen]}>
                  <Ionicons name="cash-outline" size={14} color="#16a34a" />
                  <Text style={[styles.chipText, { fontFamily: font.semibold, color: '#16a34a' }]}>
                    {activeRequest.payout} {isRTL ? 'ر.س' : 'SAR'}
                  </Text>
                </View>
              )}
            </View>

            {/* Tech info compact row */}
            {tech && (
              <View style={[styles.techRowCompact, { flexDirection: rowDir }]}>
                <LinearGradient colors={['#2D1B69','#C21875']} style={styles.techAvatarSm}>
                  <Text style={[styles.techAvatarText, { fontFamily: font.bold, fontSize: 14 }]}>{initials}</Text>
                </LinearGradient>
                <Text style={[styles.techNameSm, { fontFamily: font.semibold, textAlign: align }]}>
                  {tech.name}
                </Text>
                <View style={[styles.techActions, { flexDirection: rowDir }]}>
                  <TouchableOpacity style={styles.techActionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${tech.phone}`); }}>
                    <Ionicons name="call" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.techActionBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/chat/[jobId]' as any, params: { jobId: String(jobId), partnerName: tech.name } }); }}>
                    <Ionicons name="chatbubble" size={18} color="#2D1B69" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Completed ──────────────────────────────────────────────────── */}
        {isCompleted && (
          <View style={styles.completedContainer}>
            <View style={styles.completedIconWrap}>
              <Ionicons name="checkmark-circle" size={52} color="#2ECC71" />
            </View>
            <Text style={[styles.completedTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'تم إنجاز الخدمة بنجاح!' : 'Service completed!'}
            </Text>
            <Text style={[styles.completedSubtitle, { fontFamily: font.regular }]}>
              {isRTL ? 'شكراً لاختيارك جاي' : 'Thank you for using JAI'}
            </Text>
            {activeRequest?.payout != null && (
              <View style={styles.completedPrice}>
                <Text style={[styles.completedPriceLabel, { fontFamily: font.regular }]}>
                  {isRTL ? 'المبلغ المدفوع' : 'Amount charged'}
                </Text>
                <Text style={[styles.completedPriceValue, { fontFamily: font.bold }]}>
                  {activeRequest.payout} {isRTL ? 'ر.س' : 'SAR'}
                </Text>
              </View>
            )}

            {/* ── Rate the technician ─────────────────────────────────── */}
            <View style={styles.ratingCard}>
              {ratingSubmitted ? (
                <View style={styles.ratingThanks}>
                  <Ionicons name="star" size={24} color="#F39C12" />
                  <Text style={[styles.ratingThanksText, { fontFamily: font.semibold }]}>
                    {isRTL ? 'شكراً على تقييمك!' : 'Thanks for your rating!'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.ratingTitle, { fontFamily: font.semibold }]}>
                    {tech
                      ? (isRTL ? `كيف كانت خدمة ${tech.name}؟` : `How was ${tech.name}'s service?`)
                      : (isRTL ? 'كيف كانت الخدمة؟' : 'How was the service?')}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1,2,3,4,5].map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { setRatingStars(s); Haptics.selectionAsync(); }}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={s <= ratingStars ? 'star' : 'star-outline'}
                          size={36}
                          color="#F39C12"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {ratingStars > 0 && (
                    <TextInput
                      style={[styles.ratingInput, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={isRTL ? 'أضف تعليقاً (اختياري)' : 'Add a comment (optional)'}
                      placeholderTextColor="#9CA3AF"
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      multiline
                      maxLength={200}
                    />
                  )}
                  <TouchableOpacity
                    style={[styles.ratingSubmitBtn, { opacity: ratingStars === 0 || ratingBusy ? 0.45 : 1 }]}
                    onPress={submitRating}
                    disabled={ratingStars === 0 || ratingBusy}
                  >
                    <Text style={[styles.ratingSubmitText, { fontFamily: font.semibold }]}>
                      {ratingBusy
                        ? (isRTL ? 'جارٍ الإرسال…' : 'Submitting…')
                        : (isRTL ? 'إرسال التقييم' : 'Submit Rating')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Cancelled ──────────────────────────────────────────────────── */}
        {isCancelled && (
          <View style={styles.searchingContainer}>
            <Ionicons name="close-circle-outline" size={40} color="#E74C3C" style={{ marginBottom: 12 }} />
            <Text style={[styles.searchingTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'تم إلغاء الطلب' : 'Request cancelled'}
            </Text>
          </View>
        )}

        {/* ── Action button ──────────────────────────────────────────────── */}
        {!isWorking && (
          <TouchableOpacity
            style={isCompleted || isCancelled ? styles.closeBtn : styles.cancelBtn}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setActiveRequest(null);
              router.replace('/(tabs)' as any);
            }}
          >
            <Text style={[
              isCompleted || isCancelled ? styles.closeBtnText : styles.cancelText,
              { fontFamily: font.semibold },
            ]}>
              {isCompleted
                ? (isRTL ? 'العودة للرئيسية' : 'Back to home')
                : isCancelled
                  ? (isRTL ? 'إغلاق' : 'Close')
                  : t('cancelRequest')}
            </Text>
          </TouchableOpacity>
        )}
          </ScrollView>
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapArea: { flex: 1, overflow: 'hidden' },
  searchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(237,232,248,0.55)',
  },
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
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center', paddingTop: 12, paddingBottom: 6,
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB',
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
    borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA', marginTop: 16,
  },
  cancelText: { fontSize: 14, color: '#E74C3C' },
  closeBtn: {
    paddingVertical: 14, alignItems: 'center', borderRadius: 16,
    backgroundColor: '#2D1B69', marginTop: 16,
  },
  closeBtnText: { fontSize: 15, color: '#FFFFFF' },

  // ── Arrived banner ─────────────────────────────────────────────────────────
  arrivedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E8F8F0', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  arrivedText: { fontSize: 15, color: '#15803d', flex: 1 },

  // ── Working state ─────────────────────────────────────────────────────────
  workingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16,
  },
  workingIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  workingTitle: { fontSize: 16, color: '#1A1A1A', marginBottom: 4 },
  workingSubtitle: { fontSize: 13, color: '#6B7280' },
  workingTrack: { marginBottom: 20 },
  workingChips: { gap: 10, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EDE8F8', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
  },
  chipGreen: { backgroundColor: '#dcfce7' },
  chipText: { fontSize: 13, color: '#2D1B69' },
  techRowCompact: {
    alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: '#F0F0F8', paddingTop: 16,
  },
  techAvatarSm: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  techNameSm: { fontSize: 14, color: '#1A1A1A', flex: 1 },

  // ── Completed state ───────────────────────────────────────────────────────
  completedContainer: { alignItems: 'center', paddingVertical: 8 },
  completedIconWrap:  { marginBottom: 12 },
  completedTitle:     { fontSize: 20, color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
  completedSubtitle:  { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  completedPrice: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
  },
  completedPriceLabel: { fontSize: 13, color: '#6B7280' },
  completedPriceValue: { fontSize: 22, color: '#15803d' },

  // ── Rating ────────────────────────────────────────────────────────────────
  ratingCard: {
    width: '100%', marginTop: 20,
    backgroundColor: '#F9F7FF', borderRadius: 16,
    padding: 18, alignItems: 'center',
    borderWidth: 1, borderColor: '#E8E4F5',
  },
  ratingTitle:      { fontSize: 15, color: '#1A1A1A', marginBottom: 14, textAlign: 'center' },
  starsRow:         { flexDirection: 'row', gap: 10, marginBottom: 14 },
  ratingInput: {
    width: '100%', minHeight: 72, borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#1A1A1A',
    backgroundColor: '#FFFFFF', marginBottom: 12,
  },
  ratingSubmitBtn: {
    width: '100%', height: 46, borderRadius: 12,
    backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center',
  },
  ratingSubmitText: { color: '#FFFFFF', fontSize: 15 },
  ratingThanks:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  ratingThanksText: { fontSize: 15, color: '#1A1A1A' },
});
