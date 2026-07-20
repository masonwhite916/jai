import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Share, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import { useJaiLocation } from '@/context/LocationContext';

const TITLES: Record<string, TranslationKeys> = {
  'saved-locations': 'savedLocations',
  invoices: 'invoices',
  rewards: 'rewards',
  referral: 'referral',
  faq: 'faq',
  safety: 'safetyTips',
};

const FAQS: { q: TranslationKeys; a: TranslationKeys }[] = [
  { q: 'faqQ1', a: 'faqA1' },
  { q: 'faqQ2', a: 'faqA2' },
  { q: 'faqQ3', a: 'faqA3' },
  { q: 'faqQ4', a: 'faqA4' },
];

const SAFETY: { icon: string; title: TranslationKeys; body: TranslationKeys }[] = [
  { icon: 'car-outline', title: 'safety1Title', body: 'safety1Body' },
  { icon: 'warning-outline', title: 'safety2Title', body: 'safety2Body' },
  { icon: 'shield-checkmark-outline', title: 'safety3Title', body: 'safety3Body' },
  { icon: 'person-circle-outline', title: 'safety4Title', body: 'safety4Body' },
  { icon: 'bag-check-outline', title: 'safety5Title', body: 'safety5Body' },
];

export default function MenuTopicScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const { t, isRTL, font } = useLanguage();
  const gps = useJaiLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const rowDir: 'row' | 'row-reverse' = isRTL ? 'row-reverse' : 'row';
  const align: 'left' | 'right' = isRTL ? 'right' : 'left';

  const key = topic ?? 'faq';
  const titleKey = TITLES[key] ?? 'faq';

  const digits = (user?.phone ?? '').replace(/\D/g, '');
  const referralCode = `JAI-${digits.slice(-4) || '2026'}`;

  async function shareReferral() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: `${t('referralShareMsg')} ${referralCode}` });
    } catch {
      // share sheet dismissed or unsupported on this platform
    }
  }

  function EmptyState({ icon, title, hint }: { icon: string; title: string; hint: string }) {
    return (
      <View style={styles.emptyBox}>
        <View style={styles.emptyIcon}>
          <Ionicons name={icon as any} size={30} color="#5B2C91" />
        </View>
        <Text style={[styles.emptyTitle, { fontFamily: font.semibold }]}>{title}</Text>
        <Text style={[styles.emptyHint, { fontFamily: font.regular }]}>{hint}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>{t(titleKey)}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {key === 'saved-locations' && (
          <View>
            <View style={[styles.card, { flexDirection: rowDir, alignItems: 'center', gap: 12 }]}>
              <View style={styles.cardIcon}>
                <Ionicons name="navigate" size={20} color="#C21875" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { fontFamily: font.regular, textAlign: align }]}>{t('currentLocation')}</Text>
                <Text style={[styles.cardValue, { fontFamily: font.medium, textAlign: align }]}>
                  {gps.status === 'loading' ? t('locating') : gps.fullAddress ?? t('tapToLocate')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => gps.refresh()} disabled={gps.status === 'loading'} style={styles.refreshBtn}>
                {gps.status === 'loading'
                  ? <ActivityIndicator size="small" color="#2D1B69" />
                  : <Ionicons name="refresh" size={18} color="#2D1B69" />}
              </TouchableOpacity>
            </View>
            <EmptyState icon="bookmark-outline" title={t('savedLocationsEmpty')} hint={t('savedLocationsHint')} />
          </View>
        )}

        {key === 'invoices' && (
          <EmptyState icon="receipt-outline" title={t('invoicesEmpty')} hint={t('invoicesHint')} />
        )}

        {key === 'rewards' && (
          <View>
            <LinearGradient colors={['#2D1B69', '#C21875']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pointsCard}>
              <Text style={[styles.pointsLabel, { fontFamily: font.regular }]}>{t('pointsBalance')}</Text>
              <Text style={[styles.pointsValue, { fontFamily: font.bold }]}>{user?.points ?? 0}</Text>
              <Text style={[styles.pointsWorth, { fontFamily: font.regular }]}>{t('pointsWorth')}</Text>
            </LinearGradient>
            <Text style={[styles.sectionTitle, { fontFamily: font.bold, textAlign: align }]}>{t('howToEarn')}</Text>
            {([
              { icon: 'construct-outline', label: 'earn1' },
              { icon: 'star-outline', label: 'earn2' },
              { icon: 'people-outline', label: 'earn3' },
            ] as { icon: string; label: TranslationKeys }[]).map((row) => (
              <View key={row.label} style={[styles.card, { flexDirection: rowDir, alignItems: 'center', gap: 12 }]}>
                <View style={styles.cardIcon}>
                  <Ionicons name={row.icon as any} size={20} color="#2D1B69" />
                </View>
                <Text style={[styles.cardValue, { flex: 1, fontFamily: font.medium, textAlign: align }]}>{t(row.label)}</Text>
              </View>
            ))}
          </View>
        )}

        {key === 'referral' && (
          <View>
            <View style={styles.codeCard}>
              <Text style={[styles.cardLabel, { fontFamily: font.regular, textAlign: 'center' }]}>{t('yourReferralCode')}</Text>
              <Text style={[styles.codeText, { fontFamily: font.bold }]}>{referralCode}</Text>
            </View>
            <Text style={[styles.emptyHint, { fontFamily: font.regular, marginBottom: 20 }]}>{t('referralHint')}</Text>
            <TouchableOpacity onPress={shareReferral} activeOpacity={0.85} style={styles.shareBtn}>
              <LinearGradient colors={['#2D1B69', '#5B2C91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.shareBtnGrad, { flexDirection: rowDir }]}>
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.shareBtnText, { fontFamily: font.bold }]}>{t('shareCode')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {key === 'faq' && (
          <View>
            {FAQS.map((item, i) => (
              <TouchableOpacity
                key={item.q}
                style={styles.faqCard}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOpenFaq(openFaq === i ? null : i);
                }}
              >
                <View style={[{ flexDirection: rowDir, alignItems: 'center', gap: 10 }]}>
                  <Text style={[styles.faqQ, { flex: 1, fontFamily: font.semibold, textAlign: align }]}>{t(item.q)}</Text>
                  <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
                </View>
                {openFaq === i && (
                  <Text style={[styles.faqA, { fontFamily: font.regular, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t(item.a)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {key === 'safety' && (
          <View>
            {SAFETY.map((tip) => (
              <View key={tip.title} style={[styles.card, { flexDirection: rowDir, gap: 12 }]}>
                <View style={styles.cardIcon}>
                  <Ionicons name={tip.icon as any} size={20} color="#2D1B69" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardValue, { fontFamily: font.semibold, textAlign: align }]}>{t(tip.title)}</Text>
                  <Text style={[styles.faqA, { marginTop: 4, fontFamily: font.regular, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t(tip.body)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE8F8', justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#6B7280' },
  cardValue: { fontSize: 14, color: '#1A1A1A', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F0F8', justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 22, backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, color: '#1A1A1A', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  pointsCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  pointsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  pointsValue: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', marginVertical: 4 },
  pointsWorth: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  codeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 28, paddingHorizontal: 20,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: '#D0C8F0', borderStyle: 'dashed',
  },
  codeText: { fontSize: 30, fontWeight: '800', color: '#2D1B69', letterSpacing: 2, marginTop: 8 },
  shareBtn: { borderRadius: 16, overflow: 'hidden' },
  shareBtnGrad: { paddingVertical: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  faqCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  faqQ: { fontSize: 14, color: '#1A1A1A' },
  faqA: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: 10 },
});
