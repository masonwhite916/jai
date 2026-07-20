import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions,
  TouchableOpacity, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const JAI_LOGO = require('../assets/images/jai-logo.png');
const { width, height } = Dimensions.get('window');
const CARD_H = height * 0.48;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markOnboardingDone } = useApp();
  const { t, isRTL, font } = useLanguage();
  const flatRef = useRef<FlatList>(null);
  const [idx, setIdx] = useState(0);

  const SLIDES = [
    {
      id: '1',
      title: t('slide1Title'),
      subtitle: t('slide1Sub'),
      image: require('../assets/images/onboard1.png'),
      gradients: ['#1A0845', '#4A1580'] as const,
      accentColor: '#C21875',
    },
    {
      id: '2',
      title: t('slide2Title'),
      subtitle: t('slide2Sub'),
      image: require('../assets/images/onboard2.png'),
      gradients: ['#2D0E72', '#6A24A0'] as const,
      accentColor: '#8B35BB',
    },
    {
      id: '3',
      title: t('slide3Title'),
      subtitle: t('slide3Sub'),
      image: require('../assets/images/onboard3.png'),
      gradients: ['#4A1070', '#C21875'] as const,
      accentColor: '#C21875',
    },
  ];

  const isLast = idx === SLIDES.length - 1;
  const slide = SLIDES[idx];

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      await markOnboardingDone();
      router.replace('/auth');
    } else {
      flatRef.current?.scrollToIndex({ index: idx + 1, animated: true });
    }
  }

  async function handleSkip() {
    await markOnboardingDone();
    router.replace('/auth');
  }

  return (
    <View style={styles.root}>
      {/* Slide carousel — sits ABOVE the card in normal flow so it never overlaps it */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.flatList}
        onMomentumScrollEnd={(e) => {
          setIdx(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradients} style={styles.slide}>
            {/* Logo top */}
            <View style={[styles.logoWrap, { paddingTop: insets.top + 20 + (Platform.OS === 'web' ? 67 : 0) }]}>
              <Image source={JAI_LOGO} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <Image source={item.image} style={styles.illustration} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', item.gradients[1]]}
                style={styles.illustrationFade}
              />
            </View>

            {/* Decorative ring */}
            <View style={[styles.decorRing, { borderColor: 'rgba(255,255,255,0.06)' }]} />
          </LinearGradient>
        )}
      />

      {/* Bottom content card — in normal flow, NOT overlapping the FlatList */}
      <View style={[styles.card, { paddingBottom: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }]}>

        {/* Drag indicator */}
        <View style={styles.handle} />

        {/* Accent line */}
        <LinearGradient
          colors={[slide.accentColor, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.accentLine, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
        />

        {/* Text */}
        <Text style={[styles.title, { fontFamily: font.bold, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {slide.title}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {slide.subtitle}
        </Text>

        {/* Dots + action row */}
        <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Next / Get Started button */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={styles.nextBtn}
          >
            <LinearGradient
              colors={[slide.accentColor, '#8B35BB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextGrad}
            >
              {isLast
                ? <Text style={[styles.nextLabel, { fontFamily: font.bold }]}>{t('getStarted')}</Text>
                : <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={22} color="#FFF" />
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { fontFamily: font.regular }]}>{t('skip')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column', backgroundColor: '#1A0845' },

  // FlatList takes all space above the card — no overlap
  flatList: { flex: 1 },
  slide: { width, height: height - CARD_H, position: 'relative', overflow: 'hidden' },
  logoWrap: { alignItems: 'center', zIndex: 2, paddingBottom: 8 },
  logo: { width: 140, height: 58 },
  illustrationWrap: { flex: 1, position: 'relative', marginTop: 8 },
  illustration: { width: '100%', height: '100%' },
  illustrationFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
  },
  decorRing: {
    position: 'absolute', bottom: 20, right: -40,
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 1,
  },

  // Card — normal flow, never overlaps FlatList so its touches always register
  card: {
    height: CARD_H,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 28, paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E0E0EA', marginBottom: 20,
  },
  accentLine: { width: 40, height: 3, borderRadius: 2, marginBottom: 14 },
  title: {
    fontSize: 30, lineHeight: 38, color: '#120840', marginBottom: 12,
  },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 24, marginBottom: 28 },

  actionRow: { justifyContent: 'flex-end', alignItems: 'center' },
  nextBtn: {
    borderRadius: 32, overflow: 'hidden',
    shadowColor: '#C21875', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  nextGrad: {
    width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16,
  },
  nextLabel: { color: '#FFFFFF', fontSize: 14 },

  skipBtn: { alignItems: 'center', marginTop: 18 },
  skipText: { color: '#9CA3AF', fontSize: 14 },
});
