/**
 * Spin & Win — daily spin wheel for discounts and giveaways.
 * One free spin per calendar day, result persisted via AsyncStorage.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { useLanguage } from '@/context/LanguageContext';

const SPIN_DATE_KEY  = 'jai_spin_last_date_v1';
const SPIN_PRIZE_KEY = 'jai_spin_last_prize_v1';
const N = 8;  // segments
const R = 140; const CX = 150; const CY = 150; const IR = 36; const TR = 90;

type Seg = { labelEn: string; labelAr: string; emoji: string; color: string; prize: string };

const SEGMENTS: Seg[] = [
  { labelEn: '10% Off',      labelAr: 'خصم ١٠٪',     emoji: '🎉', color: '#2D1B69', prize: 'discount_10'  },
  { labelEn: 'Try Again',    labelAr: 'حاول مجدداً',  emoji: '🔄', color: '#6B7280', prize: 'none'          },
  { labelEn: 'Free Battery', labelAr: 'شحن مجاني',    emoji: '🔋', color: '#C21875', prize: 'free_battery'  },
  { labelEn: '15% Off',      labelAr: 'خصم ١٥٪',     emoji: '🎊', color: '#5B2C91', prize: 'discount_15'  },
  { labelEn: 'Try Again',    labelAr: 'حاول مجدداً',  emoji: '🔄', color: '#374151', prize: 'none'          },
  { labelEn: '20% Off',      labelAr: 'خصم ٢٠٪',     emoji: '✨', color: '#7B2A9E', prize: 'discount_20'  },
  { labelEn: 'Free Tire',    labelAr: 'تغيير مجاني',  emoji: '🛞', color: '#8B35BB', prize: 'free_tire'     },
  { labelEn: '25% Off',      labelAr: 'خصم ٢٥٪',     emoji: '🏆', color: '#F59E0B', prize: 'discount_25'  },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function genCode(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

function prizeCode(prize: string): string | null {
  switch (prize) {
    case 'discount_10':  return genCode('JAI10');
    case 'discount_15':  return genCode('JAI15');
    case 'discount_20':  return genCode('JAI20');
    case 'discount_25':  return genCode('JAI25');
    case 'free_battery': return genCode('JAIBAT');
    case 'free_tire':    return genCode('JATIRE');
    default: return null;
  }
}

// SVG path for pie slice i
function slicePath(i: number): string {
  const s  = (-90 + i       * (360 / N)) * Math.PI / 180;
  const e  = (-90 + (i + 1) * (360 / N)) * Math.PI / 180;
  const x1 = CX + R  * Math.cos(s), y1 = CY + R  * Math.sin(s);
  const x2 = CX + R  * Math.cos(e), y2 = CY + R  * Math.sin(e);
  const ix1 = CX + IR * Math.cos(s), iy1 = CY + IR * Math.sin(s);
  const ix2 = CX + IR * Math.cos(e), iy2 = CY + IR * Math.sin(e);
  return `M ${ix1} ${iy1} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${IR} ${IR} 0 0 0 ${ix1} ${iy1} Z`;
}

// Midpoint position + rotation for segment label
function segPos(i: number) {
  const mid = (-90 + (i + 0.5) * (360 / N)) * Math.PI / 180;
  return { x: CX + TR * Math.cos(mid), y: CY + TR * Math.sin(mid), rot: -90 + (i + 0.5) * (360 / N) + 90 };
}

export default function SpinWheelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRTL, font } = useLanguage();

  const [spinning,   setSpinning]   = useState(false);
  const [result,     setResult]     = useState<{ seg: Seg; code: string | null } | null>(null);
  const [spunToday,  setSpunToday]  = useState(false);
  const [ready,      setReady]      = useState(false);

  const rotAnim = useRef(new Animated.Value(0)).current;
  const align = isRTL ? 'right' : 'left';

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const lastDate = await AsyncStorage.getItem(SPIN_DATE_KEY);
        if (lastDate === todayStr()) {
          setSpunToday(true);
          const raw = await AsyncStorage.getItem(SPIN_PRIZE_KEY);
          if (raw) setResult(JSON.parse(raw));
        }
      } catch { /* ignore */ }
      setReady(true);
    })();
  }, []);

  const spin = useCallback(() => {
    if (spinning || spunToday) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const idx = Math.floor(Math.random() * N);
    // Rotation so segment idx midpoint lands at pointer (top = 270°):
    //   midAngle in wheel local = -90 + (idx + 0.5)*45 = -67.5 + idx*45
    //   need: -67.5 + idx*45 + R ≡ 270  →  R = 337.5 - idx*45  (mod 360)
    const base  = (337.5 - idx * (360 / N) + 360) % 360;
    const total = 5 * 360 + base;

    rotAnim.setValue(0);
    setSpinning(true);

    Animated.timing(rotAnim, {
      toValue: total,
      duration: 4500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const seg  = SEGMENTS[idx];
      const code = prizeCode(seg.prize);
      const payload = { seg, code };
      setResult(payload);
      setSpunToday(true);
      setSpinning(false);
      Haptics.notificationAsync(
        seg.prize === 'none'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
      AsyncStorage.setItem(SPIN_DATE_KEY,  todayStr());
      AsyncStorage.setItem(SPIN_PRIZE_KEY, JSON.stringify(payload));
    });
  }, [spinning, spunToday, rotAnim]);

  const spinDeg = rotAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#2D1B69', '#1a0f3f']}
        style={[styles.header, { paddingTop: insets.top + 12 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
            {isRTL ? 'عجلة الجوائز 🎰' : 'Spin & Win 🎰'}
          </Text>
          <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
            {isRTL ? 'دورة واحدة مجانية كل يوم' : 'One free spin every day'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wheel + pointer ── */}
        <View style={styles.wheelArea}>
          {/* Pointer triangle at top */}
          <View style={styles.pointerWrap}>
            <View style={styles.pointer} />
          </View>

          {/* Rotating wheel */}
          <Animated.View style={[styles.wheelWrap, { transform: [{ rotate: spinDeg }] }]}>
            <Svg width={300} height={300} viewBox="0 0 300 300">
              {SEGMENTS.map((seg, i) => {
                const { x, y, rot } = segPos(i);
                return (
                  <G key={i}>
                    <Path d={slicePath(i)} fill={seg.color} stroke="#120840" strokeWidth={1.5} />
                    <SvgText
                      x={x} y={y}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={22}
                      transform={`rotate(${rot}, ${x}, ${y})`}
                    >
                      {seg.emoji}
                    </SvgText>
                  </G>
                );
              })}
              {/* Centre hub */}
              <Circle cx={CX} cy={CY} r={IR} fill="#120840" stroke="#C21875" strokeWidth={3} />
              <SvgText x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={20}>
                🎰
              </SvgText>
            </Svg>
          </Animated.View>
        </View>

        {/* ── Spin button ── */}
        {!spunToday && (
          <TouchableOpacity
            style={[styles.spinBtn, spinning && styles.spinBtnOff]}
            onPress={spin}
            disabled={spinning}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={spinning ? ['#9CA3AF', '#6B7280'] : ['#C21875', '#8B35BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.spinBtnGrad}
            >
              <Ionicons name={spinning ? 'sync' : 'refresh-circle'} size={24} color="#fff" />
              <Text style={[styles.spinBtnText, { fontFamily: font.bold }]}>
                {spinning
                  ? (isRTL ? 'تدور…'       : 'Spinning…')
                  : (isRTL ? 'أدِّر العجلة!' : 'Spin the Wheel!')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Result card ── */}
        {result && (
          <View style={styles.resultCard}>
            {result.seg.prize === 'none' ? (
              <>
                <Text style={styles.resultEmoji}>😔</Text>
                <Text style={[styles.resultTitle, { fontFamily: font.bold }]}>
                  {isRTL ? 'حظ أوفر غداً!' : 'Better luck tomorrow!'}
                </Text>
                <Text style={[styles.resultSub, { fontFamily: font.regular }]}>
                  {isRTL ? 'عُد غداً لدورة جديدة' : 'Come back tomorrow for another spin'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultEmoji}>{result.seg.emoji}</Text>
                <Text style={[styles.resultTitle, { fontFamily: font.bold }]}>
                  {isRTL
                    ? `مبروك! فزت بـ ${result.seg.labelAr}`
                    : `You won ${result.seg.labelEn}! 🎉`}
                </Text>
                {result.code && (
                  <>
                    <Text style={[styles.codeLabel, { fontFamily: font.regular }]}>
                      {isRTL ? 'رمز الخصم الخاص بك' : 'Your promo code'}
                    </Text>
                    <View style={styles.codeBox}>
                      <Text style={[styles.codeText, { fontFamily: font.bold }]}>{result.code}</Text>
                    </View>
                    <Text style={[styles.codeHint, { fontFamily: font.regular }]}>
                      {isRTL ? 'استخدمه عند إتمام طلبك القادم' : 'Apply at checkout on your next order'}
                    </Text>
                  </>
                )}
                <Text style={[styles.todayNote, { fontFamily: font.regular }]}>
                  {isRTL ? 'عُد غداً لدورة جديدة' : 'Come back tomorrow for another spin'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── Already spun (no saved result) ── */}
        {spunToday && !result && (
          <View style={styles.alreadyBox}>
            <Ionicons name="time-outline" size={36} color="#9CA3AF" />
            <Text style={[styles.alreadyTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'لقد دُرت اليوم بالفعل' : 'Already spun today'}
            </Text>
            <Text style={[styles.alreadySub, { fontFamily: font.regular }]}>
              {isRTL ? 'عُد غداً لدورة جديدة' : 'Come back tomorrow for a new spin'}
            </Text>
          </View>
        )}

        {/* ── Prize guide ── */}
        <View style={styles.prizeCard}>
          <Text style={[styles.prizeCardTitle, { fontFamily: font.bold, textAlign: align }]}>
            {isRTL ? 'الجوائز المتاحة' : 'Available Prizes'}
          </Text>
          {SEGMENTS.filter(s => s.prize !== 'none').map((s, i) => (
            <View key={i} style={[styles.prizeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.prizeDot, { backgroundColor: s.color }]} />
              <Text style={styles.prizeEmoji}>{s.emoji}</Text>
              <Text style={[styles.prizeLabel, { fontFamily: font.regular, textAlign: align }]}>
                {isRTL ? s.labelAr : s.labelEn}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F2FA' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, color: '#FFFFFF' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  scroll: { alignItems: 'center', paddingTop: 12, gap: 24 },

  wheelArea: { alignItems: 'center' },

  pointerWrap: { alignItems: 'center', marginBottom: -14, zIndex: 10 },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 13, borderRightWidth: 13,
    borderTopWidth: 0,   borderBottomWidth: 26,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#C21875',
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6, shadowRadius: 6,
  },

  wheelWrap: {
    width: 300, height: 300, borderRadius: 150, overflow: 'hidden',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4, shadowRadius: 24, elevation: 16,
  },

  spinBtn: {
    width: 240, borderRadius: 32, overflow: 'hidden',
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  spinBtnOff: { shadowOpacity: 0.1 },
  spinBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  spinBtnText: { fontSize: 17, color: '#FFFFFF' },

  resultCard: {
    width: '90%', backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 28, alignItems: 'center', gap: 8,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 8,
  },
  resultEmoji: { fontSize: 52, marginBottom: 4 },
  resultTitle: { fontSize: 20, color: '#120840', textAlign: 'center' },
  resultSub:   { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  codeLabel:   { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  codeBox: {
    backgroundColor: '#F4F2FA', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 2, borderColor: '#C21875',
    marginTop: 4,
  },
  codeText:  { fontSize: 24, color: '#2D1B69', letterSpacing: 3 },
  codeHint:  { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  todayNote: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 },

  alreadyBox: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  alreadyTitle: { fontSize: 17, color: '#374151', textAlign: 'center' },
  alreadySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  prizeCard: {
    width: '90%', backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 20, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  prizeCardTitle: { fontSize: 15, color: '#120840', marginBottom: 4 },
  prizeRow:  { alignItems: 'center', gap: 10 },
  prizeDot:  { width: 10, height: 10, borderRadius: 5 },
  prizeEmoji: { fontSize: 18 },
  prizeLabel: { flex: 1, fontSize: 14, color: '#374151' },
});
