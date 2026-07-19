import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '99',
    period: 'year',
    color: '#5B2C91',
    gradient: ['#5B2C91', '#7B2A9E'] as const,
    benefits: [
      '2 free service calls/year',
      'Battery & Tire only',
      'Priority support',
      'Mobile app access',
    ],
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '249',
    period: 'year',
    color: '#2D1B69',
    gradient: ['#2D1B69', '#5B2C91'] as const,
    benefits: [
      '10 free service calls/year',
      'All 7 service types',
      '24/7 priority support',
      'Free towing up to 50km',
      'Roadside safety kit',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '999',
    period: 'year',
    color: '#C21875',
    gradient: ['#8B35BB', '#C21875'] as const,
    benefits: [
      'Up to 5 vehicles',
      'Unlimited service calls',
      'Fleet dashboard',
      'Monthly reports',
      'Dedicated account manager',
      'Corporate invoicing',
    ],
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: '#1A1A1A',
    gradient: ['#1A1A1A', '#3D3D3D'] as const,
    benefits: [
      'Unlimited vehicles',
      'Custom SLA agreements',
      'Real-time fleet tracking',
      'API integration',
      'White-label options',
      '24/7 dedicated team',
    ],
    popular: false,
  },
];

export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#C21875']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <Ionicons name="star" size={32} color="#FFD700" />
        <Text style={styles.headerTitle}>Membership Plans</Text>
        <Text style={styles.headerSub}>Choose the plan that fits your needs</Text>
        {user?.membership !== 'none' && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Your current plan: {user?.membership?.toUpperCase()}</Text>
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
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
            <LinearGradient colors={plan.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planGradient}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    {plan.period ? <Text style={styles.currency}>SAR </Text> : null}
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    {plan.period ? <Text style={styles.planPeriod}>/{plan.period}</Text> : null}
                  </View>
                </View>
                {user?.membership === plan.id && (
                  <View style={styles.activePlanBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
                    <Text style={styles.activePlanText}>Active</Text>
                  </View>
                )}
              </View>
              <View style={styles.divider} />
              {plan.benefits.map((benefit, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </LinearGradient>
            <TouchableOpacity
              style={[styles.planBtn, user?.membership === plan.id && styles.planBtnActive]}
              activeOpacity={0.85}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={[styles.planBtnText, { color: user?.membership === plan.id ? '#6B7280' : plan.color }]}>
                {user?.membership === plan.id ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', textAlign: 'center' },
  currentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
  },
  currentBadgeText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  planCardPopular: {
    borderWidth: 2, borderColor: '#C21875',
  },
  popularBadge: {
    backgroundColor: '#C21875',
    paddingVertical: 6,
    alignItems: 'center',
  },
  popularText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5, fontFamily: 'Inter_700Bold' },
  planGradient: { padding: 20 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  currency: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_500Medium' },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  planPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', marginLeft: 2 },
  activePlanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activePlanText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  benefitText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_400Regular', flex: 1 },
  planBtn: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EBEBF5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  planBtnActive: { backgroundColor: '#F8F9FC' },
  planBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
