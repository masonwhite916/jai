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
import * as Haptics from 'expo-haptics';

const JAI_LOGO = require('../assets/images/jai-logo.png');
const { width, height } = Dimensions.get('window');

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { markOnboardingDone } = useApp();
  const { t, isRTL, font } = useLanguage();
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const SLIDES = [
    {
      id: '1',
      title: t('slide1Title'),
      subtitle: t('slide1Sub'),
      image: require('../assets/images/onboard1.png'),
      gradient: ['#2D1B69', '#5B2C91'] as const,
    },
    {
      id: '2',
      title: t('slide2Title'),
      subtitle: t('slide2Sub'),
      image: require('../assets/images/onboard2.png'),
      gradient: ['#5B2C91', '#8B35BB'] as const,
    },
    {
      id: '3',
      title: t('slide3Title'),
      subtitle: t('slide3Sub'),
      image: require('../assets/images/onboard3.png'),
      gradient: ['#7B2A9E', '#C21875'] as const,
    },
  ];

  const isLast = activeIndex === SLIDES.length - 1;

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      await markOnboardingDone();
      router.replace('/auth');
    } else {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  }

  async function handleSkip() {
    await markOnboardingDone();
    router.replace('/auth');
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={JAI_LOGO} style={styles.logoImg} resizeMode="contain" />
              <Image source={item.image} style={styles.illustration} resizeMode="contain" />
            </View>
          </LinearGradient>
        )}
      />

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 24 + (Platform.OS === 'web' ? 34 : 0) }]}>
        <View style={styles.textContent}>
          <Text style={[styles.title, { fontFamily: font.bold, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {SLIDES[activeIndex].title}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {SLIDES[activeIndex].subtitle}
          </Text>
        </View>

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={['#C21875', '#8B35BB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={[styles.nextText, { fontFamily: font.bold }]}>
              {isLast ? t('getStarted') : t('next')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

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
  root: { flex: 1, backgroundColor: '#2D1B69' },
  slide: { width, height },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 260,
    gap: 16,
  },
  logoImg: { width: 160, height: 70 },
  illustration: { width: width * 0.75, height: height * 0.32 },
  bottomContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  textContent: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', lineHeight: 38, marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 24 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EBEBF5' },
  dotActive: { width: 24, backgroundColor: '#C21875' },
  nextButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  nextGradient: { paddingVertical: 18, alignItems: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { color: '#6B7280', fontSize: 15 },
});
