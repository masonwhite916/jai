import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

// ─── Plan data (mirrors membership screen) ───────────────────────────────────
const PLAN_DATA = {
  basic: {
    nameEn: 'Basic Package',      nameAr: 'الباقة الأساسية',
    subtitleEn: 'Daily Use',      subtitleAr: 'للاستخدام اليومي',
    price: '199',
    gradient: ['#5B2C91', '#7B2A9E'] as const,
  },
  accidents: {
    nameEn: 'Accidents Package',  nameAr: 'باقة الحوادث',
    subtitleEn: 'Emergency',      subtitleAr: 'لحالات الطوارئ',
    price: '299',
    gradient: ['#2D1B69', '#5B2C91'] as const,
  },
  rental: {
    nameEn: 'Rental Package',     nameAr: 'باقة الإجرة',
    subtitleEn: 'Full Coverage',  subtitleAr: 'تغطية شاملة',
    price: '600',
    gradient: ['#8B35BB', '#C21875'] as const,
  },
};

type PlanId = keyof typeof PLAN_DATA;

// ─── Card number formatter ────────────────────────────────────────────────────
function formatCard(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { user, updateUser } = useApp();
  const { isRTL, font } = useLanguage();

  const plan = PLAN_DATA[planId as PlanId] ?? PLAN_DATA.basic;
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  // Form state
  const [cardHolder, setCardHolder] = useState(user?.name ?? '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry]         = useState('');
  const [cvv, setCvv]               = useState('');

  // Flow state
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  // Success animation
  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── Validation ──────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!cardHolder.trim())                  e.cardHolder = isRTL ? 'مطلوب'       : 'Required';
    if (cardNumber.replace(/\s/g,'').length < 16) e.cardNumber = isRTL ? 'رقم البطاقة غير مكتمل' : 'Incomplete card number';
    if (expiry.length < 5)                   e.expiry     = isRTL ? 'تاريخ غير صحيح' : 'Invalid date';
    if (cvv.length < 3)                      e.cvv        = isRTL ? 'رمز غير صحيح'  : 'Invalid CVV';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubscribe() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Simulate payment processing
    await new Promise(r => setTimeout(r, 1800));

    // Update user membership in AsyncStorage
    await updateUser({ membership: planId as any, points: (user?.points ?? 0) + 100 });
    setLoading(false);
    setSuccess(true);

    // Animate success
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      Animated.timing(opacityAnim, { toValue: 1, useNativeDriver: true, duration: 300 }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Navigate back after 2.5 s
    setTimeout(() => {
      router.replace('/(tabs)/membership');
    }, 2500);
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

  // ── Payment form ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={plan.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Plan summary card */}
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
          styles.formContainer,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section: Card Info ── */}
        <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align }]}>
          {isRTL ? 'معلومات البطاقة' : 'Card Information'}
        </Text>

        {/* Cardholder */}
        <Field
          label={isRTL ? 'اسم حامل البطاقة' : 'Cardholder Name'}
          error={errors.cardHolder}
          align={align}
          font={font.medium}
        >
          <TextInput
            style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
            value={cardHolder}
            onChangeText={setCardHolder}
            autoCapitalize="words"
            placeholder={isRTL ? 'الاسم على البطاقة' : 'Name on card'}
            placeholderTextColor="#C0C0D4"
          />
        </Field>

        {/* Card number */}
        <Field
          label={isRTL ? 'رقم البطاقة' : 'Card Number'}
          error={errors.cardNumber}
          align={align}
          font={font.medium}
        >
          <View style={[styles.inputRow, { flexDirection: rowDir }]}>
            <TextInput
              style={[styles.input, { flex: 1, fontFamily: font.medium, textAlign: align, letterSpacing: 2 }]}
              value={cardNumber}
              onChangeText={v => setCardNumber(formatCard(v))}
              keyboardType="number-pad"
              placeholder="0000 0000 0000 0000"
              placeholderTextColor="#C0C0D4"
              maxLength={19}
            />
            <View style={styles.cardBrandBadge}>
              <Ionicons name="card-outline" size={20} color="#5B2C91" />
            </View>
          </View>
        </Field>

        {/* Expiry + CVV row */}
        <View style={[styles.twoCol, { flexDirection: rowDir }]}>
          <View style={{ flex: 1 }}>
            <Field
              label={isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}
              error={errors.expiry}
              align={align}
              font={font.medium}
            >
              <TextInput
                style={[styles.input, { fontFamily: font.medium, textAlign: 'center', letterSpacing: 2 }]}
                value={expiry}
                onChangeText={v => setExpiry(formatExpiry(v))}
                keyboardType="number-pad"
                placeholder="MM/YY"
                placeholderTextColor="#C0C0D4"
                maxLength={5}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="CVV"
              error={errors.cvv}
              align={align}
              font={font.medium}
            >
              <TextInput
                style={[styles.input, { fontFamily: font.medium, textAlign: 'center', letterSpacing: 4 }]}
                value={cvv}
                onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="•••"
                placeholderTextColor="#C0C0D4"
                secureTextEntry
                maxLength={4}
              />
            </Field>
          </View>
        </View>

        {/* Security note */}
        <View style={[styles.secureNote, { flexDirection: rowDir }]}>
          <Ionicons name="lock-closed" size={13} color="#5B2C91" />
          <Text style={[styles.secureNoteText, { fontFamily: font.regular }]}>
            {isRTL
              ? 'بياناتك مشفرة وآمنة بالكامل'
              : 'Your payment details are fully encrypted'}
          </Text>
        </View>

        {/* ── Order summary ── */}
        <View style={styles.orderSummary}>
          <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 14 }]}>
            {isRTL ? 'ملخص الطلب' : 'Order Summary'}
          </Text>
          <Row
            label={isRTL ? (plan.nameAr) : (plan.nameEn)}
            value={`${plan.price} ${isRTL ? 'ريال' : 'SAR'}`}
            font={font}
            rowDir={rowDir}
            bold
          />
          <Row
            label={isRTL ? 'المدة' : 'Duration'}
            value={isRTL ? '12 شهراً' : '12 months'}
            font={font}
            rowDir={rowDir}
          />
          <Row
            label={isRTL ? 'الضريبة (15%)' : 'VAT (15%)'}
            value={`${Math.round(Number(plan.price) * 0.15)} ${isRTL ? 'ريال' : 'SAR'}`}
            font={font}
            rowDir={rowDir}
          />
          <View style={styles.orderDivider} />
          <Row
            label={isRTL ? 'الإجمالي' : 'Total'}
            value={`${Math.round(Number(plan.price) * 1.15)} ${isRTL ? 'ريال' : 'SAR'}`}
            font={font}
            rowDir={rowDir}
            bold
            accent
          />
        </View>

        {/* Subscribe button */}
        <TouchableOpacity
          onPress={handleSubscribe}
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
                <Ionicons name="hourglass-outline" size={20} color="#FFF" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {isRTL ? 'جاري المعالجة…' : 'Processing…'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#FFF" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {isRTL
                    ? `ادفع ${Math.round(Number(plan.price) * 1.15)} ريال واشترك`
                    : `Pay SAR ${Math.round(Number(plan.price) * 1.15)} & Subscribe`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.termsNote, { fontFamily: font.regular }]}>
          {isRTL
            ? 'بالاشتراك فأنت توافق على الشروط والأحكام. يتجدد الاشتراك تلقائياً سنوياً.'
            : 'By subscribing you agree to our Terms & Conditions. Auto-renews annually.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function Field({
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

function Row({
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

  // Form
  scroll: { flex: 1, backgroundColor: '#F4F2FA' },
  formContainer: { padding: 20 },
  sectionLabel: { fontSize: 16, color: '#120840', marginBottom: 16, marginTop: 8 },

  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  inputRow: { alignItems: 'center', gap: 10 },
  cardBrandBadge: {
    width: 44, height: 48, borderRadius: 12,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center',
  },
  twoCol: { gap: 12 },

  secureNote: {
    alignItems: 'center', gap: 6, marginTop: -4, marginBottom: 24,
    backgroundColor: '#EDE8F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  secureNoteText: { fontSize: 12, color: '#5B2C91' },

  // Order summary
  orderSummary: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 24,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  orderDivider: { height: 1, backgroundColor: '#E0DBEF', marginVertical: 10 },

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
