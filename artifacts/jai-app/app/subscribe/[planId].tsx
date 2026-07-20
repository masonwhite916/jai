import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Animated, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

// ─── Plan data (mirrors membership screen) ───────────────────────────────────
const PLAN_DATA = {
  basic: {
    nameEn: 'Basic Package',      nameAr: 'الباقة الأساسية',
    subtitleEn: 'Daily Use',      subtitleAr: 'للاستخدام اليومي',
    price: '199',
    gradient: ['#5B2C91', '#7B2A9E'] as const,
    featuresEn: [
      '5 roadside assistance calls/year',
      'Towing up to 50 km',
      'Battery jump-start',
      'Flat tyre change',
      '24/7 phone support',
    ],
    featuresAr: [
      '5 طلبات مساعدة سنوياً',
      'سحب حتى 50 كم',
      'تشغيل البطارية',
      'تغيير الإطار المثقوب',
      'دعم هاتفي 24/7',
    ],
  },
  accidents: {
    nameEn: 'Accidents Package',  nameAr: 'باقة الحوادث',
    subtitleEn: 'Emergency',      subtitleAr: 'لحالات الطوارئ',
    price: '299',
    gradient: ['#2D1B69', '#5B2C91'] as const,
    featuresEn: [
      'Everything in Basic',
      'Accident scene assistance',
      'Police report coordination',
      'Towing up to 100 km',
    ],
    featuresAr: [
      'كل مزايا الباقة الأساسية',
      'مساعدة في موقع الحادث',
      'تنسيق التقارير الشرطية',
      'سحب حتى 100 كم',
    ],
  },
  rental: {
    nameEn: 'Rental Package',     nameAr: 'باقة الإجرة',
    subtitleEn: 'Full Coverage',  subtitleAr: 'تغطية شاملة',
    price: '600',
    gradient: ['#8B35BB', '#C21875'] as const,
    featuresEn: [
      'Everything in Accidents',
      'Rental car while yours is repaired',
      'Priority dispatch',
      'Unlimited towing distance',
    ],
    featuresAr: [
      'كل مزايا باقة الحوادث',
      'سيارة بديلة أثناء الإصلاح',
      'أولوية في الإرسال',
      'سحب بدون حد للمسافة',
    ],
  },
};

type PlanId = keyof typeof PLAN_DATA;

// API base derived from EXPO_PUBLIC_DOMAIN injected at dev start
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? '';
const API_BASE = DOMAIN ? `https://${DOMAIN}` : '';

// HTTPS redirect URL for Whop (required — custom schemes are rejected).
// Whop will redirect here after payment; the in-app browser shows the
// website success page, then the user closes it and the app verifies.
const REDIRECT_URL = DOMAIN
  ? `https://${DOMAIN}/jai-web/payment-success`
  : 'https://example.com/payment-success';

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { user, updateUser } = useApp();
  const { isRTL, font } = useLanguage();

  const plan = PLAN_DATA[planId as PlanId] ?? PLAN_DATA.basic;
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const [email, setEmail]       = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [pending, setPending]   = useState(false);   // paid but not yet verified
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success animation
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  function validateEmail() {
    if (!email.trim()) {
      setEmailError(isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(isRTL ? 'بريد إلكتروني غير صحيح' : 'Invalid email address');
      return false;
    }
    setEmailError('');
    return true;
  }

  // ── Verify membership with Whop after successful redirect ────────────────
  async function verifyMembership(userEmail: string) {
    setVerifying(true);
    try {
      // Retry a few times — Whop may take a moment to activate the membership
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        const resp = await fetch(
          `${API_BASE}/api/whop/membership-status?email=${encodeURIComponent(userEmail)}`
        );
        const data = await resp.json() as { active?: boolean; plan?: string | null };
        if (data.active) {
          await updateUser({ membership: (data.plan ?? planId ?? 'basic') as any, points: (user?.points ?? 0) + 100 });
          setVerifying(false);
          setSuccess(true);
          Animated.parallel([
            Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
            Animated.timing(opacityAnim, { toValue: 1, useNativeDriver: true, duration: 300 }),
          ]).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => router.replace('/(tabs)/membership'), 2500);
          return;
        }
      }
      // Membership not yet visible — show pending state
      setVerifying(false);
      setPending(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      setVerifying(false);
      setPending(true); // still likely paid — show pending rather than error
    }
  }

  // ── Open Whop Checkout ────────────────────────────────────────────────────
  async function handleCheckout() {
    if (!validateEmail()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // 1. Create a Whop checkout session via the API server
      const resp = await fetch(`${API_BASE}/api/whop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId ?? 'basic', redirect_url: REDIRECT_URL }),
      });

      const data = await resp.json() as { purchase_url?: string; error?: string };
      if (!resp.ok || !data.purchase_url) {
        throw new Error(data.error ?? 'Could not create checkout. Please try again.');
      }

      // 2. Open Whop hosted checkout in a modal browser.
      //    openBrowserAsync shows a dismissible in-app browser; it resolves
      //    when the user closes it (after paying or cancelling).
      //    We always run verification after close — if they paid, the API
      //    confirms it; if not, they see the pending screen.
      await WebBrowser.openBrowserAsync(data.purchase_url, {
        dismissButtonStyle: 'done',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      setLoading(false);

      // Always verify — the user may have completed payment before closing
      await verifyMembership(email.trim());
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setErrorMsg(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // ── Success overlay ──────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.successRoot}>
        <LinearGradient
          colors={plan.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.successCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.successCheck}>
            <Ionicons name="checkmark-circle" size={72} color="#2ECC71" />
          </View>
          <Text style={[styles.successTitle, { fontFamily: font.bold }]}>
            {isRTL ? '🎉 تم الاشتراك بنجاح!' : '🎉 Subscribed!'}
          </Text>
          <Text style={[styles.successSub, { fontFamily: font.regular }]}>
            {isRTL
              ? `لقد اشتركت في ${plan.nameAr}. سيتم تفعيل العضوية خلال 48 ساعة.`
              : `You've subscribed to ${plan.nameEn}. Membership activates within 48 hours.`}
          </Text>
          <View style={styles.successPoints}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={[styles.successPointsText, { fontFamily: font.semibold }]}>
              {isRTL ? '+100 نقطة أضيفت لحسابك' : '+100 points added to your account'}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Verifying overlay ────────────────────────────────────────────────────
  if (verifying) {
    return (
      <View style={styles.successRoot}>
        <LinearGradient
          colors={plan.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successCard}>
          <ActivityIndicator size="large" color="#5B2C91" />
          <Text style={[styles.successTitle, { fontFamily: font.bold, marginTop: 16 }]}>
            {isRTL ? 'جاري التحقق من الدفع…' : 'Verifying payment…'}
          </Text>
          <Text style={[styles.successSub, { fontFamily: font.regular }]}>
            {isRTL ? 'يرجى الانتظار لحظة' : 'Please wait a moment'}
          </Text>
        </View>
      </View>
    );
  }

  // ── Payment pending screen ───────────────────────────────────────────────
  if (pending) {
    return (
      <View style={styles.successRoot}>
        <LinearGradient
          colors={plan.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successCard}>
          <View style={[styles.successCheck, { backgroundColor: '#FFF8E1', borderRadius: 50, padding: 12 }]}>
            <Ionicons name="time-outline" size={52} color="#F59E0B" />
          </View>
          <Text style={[styles.successTitle, { fontFamily: font.bold }]}>
            {isRTL ? '⏳ تأكيد الدفع قيد المعالجة' : '⏳ Payment Pending'}
          </Text>
          <Text style={[styles.successSub, { fontFamily: font.regular }]}>
            {isRTL
              ? 'تمت عملية الدفع ويتم التحقق منها. سيتم تفعيل عضويتك وإعلامك خلال 24 ساعة.'
              : "Your payment was received and is being verified. Your membership will be activated and you'll be notified within 24 hours."}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/membership')}
            activeOpacity={0.85}
            style={styles.pendingBtn}
          >
            <Text style={[styles.pendingBtnText, { fontFamily: font.semibold }]}>
              {isRTL ? 'العودة إلى الرئيسية' : 'Back to Home'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const features = isRTL ? plan.featuresAr : plan.featuresEn;

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2FA' }}>
      {/* Gradient header */}
      <LinearGradient
        colors={plan.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Plan summary */}
        <View style={styles.planSummary}>
          <Text style={[styles.planSummaryName, { fontFamily: font.bold, textAlign: 'center' }]}>
            {isRTL ? plan.nameAr : plan.nameEn}
          </Text>
          <Text style={[styles.planSummarySubtitle, { fontFamily: font.regular }]}>
            {isRTL ? plan.subtitleAr : plan.subtitleEn}
          </Text>
          <View style={styles.planSummaryPrice}>
            <Text style={[styles.planSummaryPriceNum, { fontFamily: font.bold }]}>{plan.price}</Text>
            <Text style={[styles.planSummaryPriceCur, { fontFamily: font.medium }]}>
              {isRTL ? ' ريال / سنة' : ' SAR / year'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Payment methods badge ── */}
        <View style={[styles.methodsBadge, { flexDirection: rowDir }]}>
          <Ionicons name="shield-checkmark" size={15} color="#5B2C91" />
          <Text style={[styles.methodsText, { fontFamily: font.medium }]}>
            {isRTL
              ? 'Apple Pay • Google Pay • بطاقة ائتمانية'
              : 'Apple Pay • Google Pay • Credit Card'}
          </Text>
        </View>

        {/* ── Order summary ── */}
        <View style={styles.orderSummary}>
          <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 14 }]}>
            {isRTL ? 'ملخص الطلب' : 'Order Summary'}
          </Text>

          <SummaryRow
            label={isRTL ? plan.nameAr : plan.nameEn}
            value={`${plan.price} ${isRTL ? 'ريال' : 'SAR'}`}
            font={font} rowDir={rowDir} bold
          />
          <SummaryRow
            label={isRTL ? 'المدة' : 'Duration'}
            value={isRTL ? '12 شهراً' : '12 months'}
            font={font} rowDir={rowDir}
          />
          <View style={styles.orderDivider} />
          <SummaryRow
            label={isRTL ? 'الإجمالي (شامل الضريبة)' : 'Total (VAT included)'}
            value={`${plan.price} ${isRTL ? 'ريال' : 'SAR'}`}
            font={font} rowDir={rowDir} bold accent
          />
        </View>

        {/* ── What's included ── */}
        <View style={styles.featuresCard}>
          <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 12 }]}>
            {isRTL ? 'ما يشمله الاشتراك' : "What's included"}
          </Text>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureRow, { flexDirection: rowDir }]}>
              <View style={styles.featureDot}>
                <Ionicons name="checkmark" size={12} color="#5B2C91" />
              </View>
              <Text style={[styles.featureText, { fontFamily: font.regular, textAlign: align }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* ── Email field for post-payment verification ── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
            {isRTL ? 'البريد الإلكتروني (للتحقق من الدفع)' : 'Email (used to confirm your payment)'}
          </Text>
          <TextInput
            style={[
              styles.emailInput,
              { fontFamily: font.medium, textAlign: align },
              emailError ? styles.emailInputError : null,
            ]}
            value={email}
            onChangeText={v => { setEmail(v); setEmailError(''); }}
            placeholder={isRTL ? 'example@email.com' : 'your@email.com'}
            placeholderTextColor="#C0C0D4"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!emailError && (
            <Text style={[styles.inlineError, { textAlign: align }]}>{emailError}</Text>
          )}
        </View>

        {/* ── Error message ── */}
        {errorMsg && (
          <View style={[styles.errorBanner, { flexDirection: rowDir }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#E74C3C" />
            <Text style={[styles.errorText, { fontFamily: font.regular }]}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Checkout button ── */}
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.88}
          style={styles.submitWrap}
        >
          <LinearGradient
            colors={loading ? ['#9CA3AF', '#9CA3AF'] : plan.gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.submitBtn, { flexDirection: rowDir }]}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {isRTL ? 'جاري التحضير…' : 'Preparing checkout…'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#FFF" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {isRTL
                    ? `ادفع ${plan.price} ريال واشترك`
                    : `Pay SAR ${plan.price} & Subscribe`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.termsNote, { fontFamily: font.regular }]}>
          {isRTL
            ? 'بالضغط على الزر أعلاه سيتم فتح صفحة دفع آمنة تدعم Apple Pay وGoogle Pay وبطاقات الائتمان. يتجدد الاشتراك تلقائياً سنوياً.'
            : 'Tapping above opens a secure checkout that supports Apple Pay, Google Pay, and credit cards. Auto-renews annually.'}
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function SummaryRow({
  label, value, font, rowDir, bold, accent,
}: {
  label: string; value: string;
  font: { regular: string; semibold: string; bold: string };
  rowDir: 'row' | 'row-reverse';
  bold?: boolean; accent?: boolean;
}) {
  return (
    <View style={[rowStyles.row, { flexDirection: rowDir }]}>
      <Text style={[rowStyles.label, { fontFamily: bold ? font.semibold : font.regular }]}>{label}</Text>
      <Text style={[rowStyles.value, { fontFamily: bold ? font.bold : font.semibold, color: accent ? '#C21875' : '#120840' }]}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14 },
});

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20, paddingBottom: 32,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  planSummary: { alignItems: 'center', gap: 4 },
  planSummaryName:     { fontSize: 22, color: '#FFFFFF' },
  planSummarySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  planSummaryPrice:    { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  planSummaryPriceNum: { fontSize: 40, color: '#FFFFFF' },
  planSummaryPriceCur: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },

  // Content
  scroll: { flex: 1 },
  content: { padding: 20 },
  sectionLabel: { fontSize: 16, color: '#120840', marginTop: 4 },

  // Payment methods badge
  methodsBadge: {
    alignItems: 'center', gap: 8, marginBottom: 20,
    backgroundColor: '#EDE8F8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  methodsText: { fontSize: 13, color: '#5B2C91' },

  // Order summary
  orderSummary: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  orderDivider: { height: 1, backgroundColor: '#E0DBEF', marginVertical: 10 },

  // Features card
  featuresCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 24,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  featureRow: { alignItems: 'center', gap: 10, marginBottom: 10 },
  featureDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  // Error
  errorBanner: {
    alignItems: 'center', gap: 8, marginBottom: 16,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#E74C3C' },

  // Submit
  submitWrap: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  submitBtn: {
    paddingVertical: 18,
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  submitText: { color: '#FFFFFF', fontSize: 16 },
  termsNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },

  // Email field
  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  emailInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emailInputError: { borderColor: '#E74C3C' },
  inlineError: { fontSize: 12, color: '#E74C3C', marginTop: 4 },

  // Pending
  pendingBtn: {
    marginTop: 8, backgroundColor: '#F4F2FA', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  pendingBtnText: { fontSize: 14, color: '#2D1B69' },

  // Success
  successRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successCard: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32,
    alignItems: 'center', gap: 14, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 16,
  },
  successCheck: { marginBottom: 4 },
  successTitle: { fontSize: 24, color: '#120840', textAlign: 'center' },
  successSub:   { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  successPoints: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF8E1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  successPointsText: { fontSize: 13, color: '#B8860B' },
});
