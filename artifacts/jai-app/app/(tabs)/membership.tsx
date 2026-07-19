import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const { t, isRTL, font } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const PLANS = [
    {
      id: 'basic',
      nameKey: 'membershipBasic' as TranslationKeys,
      price: '99',
      gradient: ['#5B2C91', '#7B2A9E'] as const,
      benefits: ['basicB1','basicB2','basicB3','basicB4'] as TranslationKeys[],
      popular: false,
    },
    {
      id: 'premium',
      nameKey: 'membershipPremium' as TranslationKeys,
      price: '249',
      gradient: ['#2D1B69', '#5B2C91'] as const,
      benefits: ['premiumB1','premiumB2','premiumB3','premiumB4','premiumB5'] as TranslationKeys[],
      popular: true,
    },
    {
      id: 'business',
      nameKey: 'membershipBusiness' as TranslationKeys,
      price: '999',
      gradient: ['#8B35BB', '#C21875'] as const,
      benefits: ['businessB1','businessB2','businessB3','businessB4','businessB5','businessB6'] as TranslationKeys[],
      popular: false,
    },
    {
      id: 'enterprise',
      nameKey: 'membershipEnterprise' as TranslationKeys,
      price: t('membershipCustom'),
      gradient: ['#1A1A1A', '#3D3D3D'] as const,
      benefits: ['enterpriseB1','enterpriseB2','enterpriseB3','enterpriseB4','enterpriseB5','enterpriseB6'] as TranslationKeys[],
      popular: false,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#C21875']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <Ionicons name="star" size={32} color="#FFD700" />
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>{t('membershipPlans')}</Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>{t('choosePlan')}</Text>
        {user?.membership !== 'none' && (
          <View style={styles.currentBadge}>
            <Text style={[styles.currentBadgeText, { fontFamily: font.semibold }]}>
              {t('currentPlanLabel')} {t(`membership${user?.membership?.charAt(0).toUpperCase()}${user?.membership?.slice(1)}` as TranslationKeys).toUpperCase()}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {PLANS.map((plan) => (
          <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={[styles.popularText, { fontFamily: font.bold }]}>{t('mostPopular')}</Text>
              </View>
            )}
            <LinearGradient colors={plan.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planGradient}>
              <View style={[styles.planHeader, { flexDirection: rowDir }]}>
                <View>
                  <Text style={[styles.planName, { fontFamily: font.bold, textAlign: align }]}>{t(plan.nameKey)}</Text>
                  <View style={[styles.priceRow, { flexDirection: rowDir }]}>
                    {plan.id !== 'enterprise' && <Text style={[styles.currency, { fontFamily: font.medium }]}>SAR </Text>}
                    <Text style={[styles.planPrice, { fontFamily: font.bold }]}>{plan.price}</Text>
                    {plan.id !== 'enterprise' && <Text style={[styles.planPeriod, { fontFamily: font.regular }]}>/{t('perYear')}</Text>}
                  </View>
                </View>
                {user?.membership === plan.id && (
                  <View style={[styles.activePlanBadge, { flexDirection: rowDir }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                    <Text style={[styles.activePlanText, { fontFamily: font.semibold }]}>{t('membershipActive')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.divider} />
              {plan.benefits.map((bKey, i) => (
                <View key={i} style={[styles.benefitRow, { flexDirection: rowDir }]}>
                  <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.benefitText, { fontFamily: font.regular, textAlign: align }]}>{t(bKey)}</Text>
                </View>
              ))}
            </LinearGradient>
            <TouchableOpacity
              style={[styles.planBtn, user?.membership === plan.id && styles.planBtnActive]}
              activeOpacity={0.85}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={[styles.planBtnText, { fontFamily: font.bold, color: user?.membership === plan.id ? '#6B7280' : '#2D1B69' }]}>
                {user?.membership === plan.id ? t('currentPlan') : plan.id === 'enterprise' ? t('contactSales') : t('subscribe')}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  currentBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  currentBadgeText: { fontSize: 13, color: '#FFFFFF' },
  planCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  planCardPopular: { borderWidth: 2, borderColor: '#C21875' },
  popularBadge: { backgroundColor: '#C21875', paddingVertical: 6, alignItems: 'center' },
  popularText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },
  planGradient: { padding: 20 },
  planHeader: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  priceRow: { alignItems: 'baseline' },
  currency: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  planPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginLeft: 2 },
  activePlanBadge: {
    alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  activePlanText: { fontSize: 13, color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  benefitRow: { alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', flex: 1 },
  planBtn: {
    margin: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#EBEBF5',
    paddingVertical: 14, alignItems: 'center',
  },
  planBtnActive: { backgroundColor: '#F8F9FC' },
  planBtnText: { fontSize: 15, fontWeight: '700' },
});
