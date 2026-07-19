import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

function MapBackground() {
  return (
    <View style={styles.mapBg}>
      <LinearGradient colors={['#EDE8F8', '#F0EDF8', '#E8E4F5']} style={StyleSheet.absoluteFill} />
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
  const { t, isRTL, font } = useLanguage();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  return (
    <View style={{ flex: 1 }}>
      <MapBackground />

      <View style={[styles.topBar, { top: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0), flexDirection: rowDir }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={[styles.topBadge, { flexDirection: rowDir }]}>
          <View style={styles.activeDot} />
          <Text style={[styles.topBadgeText, { fontFamily: font.semibold }]}>{t('technicianEnRoute')}</Text>
        </View>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="share-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <View style={styles.technicianMarker}>
        <PulsingDot />
      </View>

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) }]}>
        <View style={[styles.etaRow, { flexDirection: rowDir }]}>
          <View>
            <Text style={[styles.etaTime, { fontFamily: font.bold, textAlign: align }]}>8 {isRTL ? 'دقيقة' : 'min'}</Text>
            <Text style={[styles.etaLabel, { fontFamily: font.regular, textAlign: align }]}>{t('estimatedArrival')}</Text>
          </View>
          <View style={[styles.etaBadge, { flexDirection: rowDir }]}>
            <Ionicons name="location" size={14} color="#2ECC71" />
            <Text style={[styles.etaBadgeText, { fontFamily: font.semibold }]}>3.2 {t('kmAway')}</Text>
          </View>
        </View>

        <EtaProgress />

        <View style={[styles.techRow, { flexDirection: rowDir }]}>
          <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.techAvatar}>
            <Text style={[styles.techAvatarText, { fontFamily: font.bold }]}>{isRTL ? 'أغ' : 'AG'}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.techName, { fontFamily: font.bold, textAlign: align }]}>{t('techName')}</Text>
            <View style={[{ flexDirection: rowDir, alignItems: 'center' }]}>
              {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= 4 ? 'star' : 'star-half'} size={13} color="#F39C12" />)}
              <Text style={[styles.techRatingText, { fontFamily: font.regular }]}>4.8 · {t('batterySpecialist')}</Text>
            </View>
          </View>
          <View style={[styles.techActions, { flexDirection: rowDir }]}>
            <TouchableOpacity style={styles.techActionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="call" size={18} color="#2D1B69" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.techActionBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Ionicons name="chatbubble" size={18} color="#2D1B69" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.serviceRow, { flexDirection: rowDir }]}>
          <View style={[styles.serviceItem, { flexDirection: rowDir }]}>
            <Ionicons name="car-outline" size={16} color="#6B7280" />
            <Text style={[styles.serviceItemText, { fontFamily: font.regular }]}>
              {isRTL ? 'تويوتا كامري ٢٠٢٢' : 'Toyota Camry 2022'}
            </Text>
          </View>
          <View style={[styles.serviceItem, { flexDirection: rowDir }]}>
            <Ionicons name="battery-charging-outline" size={16} color="#6B7280" />
            <Text style={[styles.serviceItemText, { fontFamily: font.regular }]}>{t('serviceBattery')}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={[styles.cancelText, { fontFamily: font.semibold }]}>{t('cancelRequest')}</Text>
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
  technicianMarker: { position: 'absolute', left: '35%', top: '42%' },
  dotContainer: { justifyContent: 'center', alignItems: 'center' },
  pulseDot: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: '#2D1B6940' },
  coreDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2D1B69', borderWidth: 2, borderColor: '#FFFFFF' },
  topBar: { position: 'absolute', left: 16, right: 16, alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  topBadge: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECC71' },
  topBadgeText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  etaRow: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  etaTime: { fontSize: 32, fontWeight: '800', color: '#2D1B69' },
  etaLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  etaBadge: { alignItems: 'center', gap: 5, backgroundColor: '#E8F8F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  etaBadgeText: { fontSize: 13, color: '#2ECC71' },
  progressTrack: { height: 6, backgroundColor: '#F0F0F8', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2D1B69', borderRadius: 3 },
  techRow: {
    alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
  },
  techAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  techAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  techName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  techRatingText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  techActions: { gap: 8 },
  techActionBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  serviceRow: { gap: 16, marginBottom: 20 },
  serviceItem: { alignItems: 'center', gap: 6, flex: 1 },
  serviceItemText: { fontSize: 13, color: '#6B7280' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA' },
  cancelText: { fontSize: 14, color: '#E74C3C' },
});
