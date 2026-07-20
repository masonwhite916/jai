import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { apiFetch } from '@/lib/api';

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

// HTTPS redirect URL for Whop (required — custom schemes are rejected).
// Whop will redirect here after payment; the in-app browser shows the
// website success page, then the user closes it and the app verifies.
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? '';
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
  const features = isRTL ? plan.featuresAr : plan.featuresEn;

  // Pre-checkout form state
  const [name,        setName]        = useState(user?.name ?? '');
  const [email,       setEmail]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Flow state
  const [loading,        setLoading]        = useState(false);
  const [verifying,      setVerifying]      = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);

  // Success animation
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── Validation ───────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())  e.name  = isRTL ? 'مطلوب' : 'Required';
    if (!email.trim()) e.email = isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = isRTL ? 'بريد إلكتروني غير صحيح' : 'Invalid email address';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Verify membership with Whop (with retries) ───────────────────────────
  async function verifyMembership(userEmail: string) {
    setVerifying(true);
    try {
      // Retry up to 4 times — Whop may take a moment to activate the membership
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        const data = await apiFetch<{ active?: boolean; plan?: string | null }>(
          `/whop/membership-status?email=${encodeURIComponent(userEmail)}&plan=${encodeURIComponent(planId ?? 'basic')}`,
        );
        if (data.active) {
          await updateUser({
            membership: (data.plan ?? planId ?? 'basic') as any,
            points: (user?.points ?? 0) + 100,
          });
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
      // Membership not yet visible after retries — show pending state
      setVerifying(false);
      setPaymentPending(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      setVerifying(false);
      setPaymentPending(true); // still likely paid — show pending rather than error
    }
  }

  // ── Open Whop Checkout ────────────────────────────────────────────────────
  async function handleCheckout() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setErrorMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // 1. Create a Whop checkout session via the API server
      const data = await apiFetch<{ purchase_url: string; checkout_id: string }>(
        '/whop/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: planId ?? 'basic',
            redirect_url: REDIRECT_URL,
            subscriber_name: name.trim(),
            subscriber_email: email.trim(),
          }),
        },
      );

      setLoading(false);

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
      setVerifying(false);
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setErrorMsg(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // ── Verifying overlay ─────────────────────────────────────────────────────
  if (verifying) {
    return (
      <View style={styles.successRoot}>
        <LinearGradient
          colors={plan.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.successCard, { gap: 20 }]}>
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

  // ── Success overlay ───────────────────────────────────────────────────────
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

  // ── Payment pending screen ────────────────────────────────────────────────
  if (paymentPending) {
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

  // ── Main screen ───────────────────────────────────────────────────────────
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

        {/* ── Contact info ── */}
        <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align }]}>
          {isRTL ? 'معلومات التواصل' : 'Contact Information'}
        </Text>
        <Text style={[styles.sectionHint, { fontFamily: font.regular, textAlign: align }]}>
          {isRTL
            ? 'ستُستخدم هذه البيانات للتحقق من اشتراكك وإرسال الفواتير.'
            : 'These details are used to verify your subscription and send receipts.'}
        </Text>

        {/* Full name */}
        <FormField
          label={isRTL ? 'الاسم الكامل' : 'Full Name'}
          error={fieldErrors.name}
          align={align}
          font={font.medium}
        >
          <TextInput
            style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder={isRTL ? 'الاسم الكامل' : 'Your full name'}
            placeholderTextColor="#C0C0D4"
          />
        </FormField>

        {/* Email (also used to confirm payment after checkout) */}
        <FormField
          label={isRTL ? 'البريد الإلكتروني (للتحقق من الدفع)' : 'Email (used to confirm your payment)'}
          error={fieldErrors.email}
          align={align}
          font={font.medium}
        >
          <TextInput
            style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
            value={email}
            onChangeText={v => { setEmail(v); setFieldErrors(prev => ({ ...prev, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={isRTL ? 'example@email.com' : 'your@email.com'}
            placeholderTextColor="#C0C0D4"
          />
        </FormField>

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
function FormField({
  label, error, align, font, children,
}: {
  label: string; error?: string; align: 'left' | 'right'; font: string; children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[fieldStyles.label, { fontFamily: font, textAlign: align }]}>{label}</Text>
      {children}
      {!!error && <Text style={[fieldStyles.error, { textAlign: align }]}>{error}</Text>}
    </View>
  );
}

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

const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  error: { fontSize: 12, color: '#E74C3C', marginTop: 4 },
});
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
  sectionHint:  { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 20 },

  // Payment methods badge
  methodsBadge: {
    alignItems: 'center', gap: 8, marginBottom: 20,
    backgroundColor: '#EDE8F8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  methodsText: { fontSize: 13, color: '#5B2C91' },

  // Input
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

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

  // Success / Pending overlays
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

  // Pending
  pendingBtn: {
    marginTop: 8, backgroundColor: '#F4F2FA', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  pendingBtnText: { fontSize: 14, color: '#2D1B69' },
});
