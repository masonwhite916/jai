import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Animated, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

// ─── Plan data ────────────────────────────────────────────────────────────────
const PLAN_DATA = {
  basic: {
    nameEn: 'Basic Package',      nameAr: 'الباقة الأساسية',
    subtitleEn: 'Daily Use',      subtitleAr: 'للاستخدام اليومي',
    price: '199',
    gradient: ['#5B2C91', '#7B2A9E'] as const,
    featuresEn: [
      '5 roadside assistance calls/year',
      'Unlimited towing within Riyadh',
      'Battery jump-start',
      'Flat tyre change',
      '24/7 phone support',
    ],
    featuresAr: [
      '5 طلبات مساعدة سنوياً',
      'بدون حد داخل منطقة الرياض',
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
type PayMethod = 'card' | 'tabby' | 'tamara' | 'applepay';

// ─── Card number formatter ────────────────────────────────────────────────────
function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export default function SubscribeScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { user, refreshUser, updateUser } = useApp();
  const { isRTL, font } = useLanguage();

  const plan     = PLAN_DATA[planId as PlanId] ?? PLAN_DATA.basic;
  const align    = isRTL ? 'right' : 'left';
  const rowDir   = isRTL ? 'row-reverse' : 'row';
  const features = isRTL ? plan.featuresAr : plan.featuresEn;

  // ── Payment method tab ──────────────────────────────────────────────────────
  const [payMethod, setPayMethod] = useState<PayMethod>('card');

  // ── Buyer info (shared across all methods) ──────────────────────────────────
  const [buyerName,  setBuyerName]  = useState(user?.name ?? '');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? '');

  // ── Card fields ─────────────────────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [expiry,     setExpiry]     = useState('');
  const [cvc,        setCvc]        = useState('');

  // ── Flow state ──────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [pending,  setPending]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Success animation ───────────────────────────────────────────────────────
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    const req = isRTL ? 'مطلوب' : 'Required';

    if (!buyerName.trim())  e.buyerName  = req;
    if (!buyerEmail.trim()) e.buyerEmail = isRTL ? 'البريد مطلوب' : 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim()))
      e.buyerEmail = isRTL ? 'بريد غير صحيح' : 'Invalid email';

    if (payMethod === 'card') {
      if (cardNumber.replace(/\D/g, '').length < 16)
        e.cardNumber = isRTL ? 'رقم البطاقة غير صحيح' : 'Invalid card number';
      if (expiry.length < 5)
        e.expiry = isRTL ? 'تاريخ انتهاء غير صحيح' : 'Invalid expiry';
      if (cvc.length < 3)
        e.cvc = isRTL ? 'رمز CVV غير صحيح' : 'Invalid CVV';
    }

    if (payMethod === 'tabby' || payMethod === 'tamara') {
      if (!buyerPhone.trim()) e.buyerPhone = req;
    }

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Animate success ─────────────────────────────────────────────────────────
  function animateSuccess() {
    setSuccess(true);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
      Animated.timing(opacityAnim, { toValue: 1, useNativeDriver: true, duration: 300 }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => router.replace('/(tabs)/membership'), 2600);
  }

  // ─── Poll Moyasar payment status ─────────────────────────────────────────────
  async function pollStatus(paymentId: string, attempts = 8): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      try {
        const data = await apiFetch<{ status: string }>(`/api/payment/status/${paymentId}`);
        if (data.status === 'paid')   return true;
        if (data.status === 'failed') return false;
      } catch { /* network blip — keep polling */ }
    }
    return false;
  }

  // ─── Card checkout via Moyasar ────────────────────────────────────────────────
  async function handleCardCheckout() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const [mm, yy] = expiry.split('/');
      const data = await apiFetch<{
        paymentId: string;
        status: string;
        transactionUrl: string | null;
      }>('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan:        planId ?? 'basic',
          cardName:    buyerName.trim(),
          cardNumber:  cardNumber.replace(/\D/g, ''),
          month:       mm?.trim(),
          year:        `20${yy?.trim()}`,
          cvc:         cvc.trim(),
        }),
      });

      // 3DS redirect required
      if (data.transactionUrl) {
        setLoading(false);
        await WebBrowser.openBrowserAsync(data.transactionUrl, {
          dismissButtonStyle: 'done',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      }

      // If already paid (no 3DS), or after 3DS close — confirm server-side
      const paymentPaid = data.status === 'paid' || await (async () => {
        setLoading(true);
        const result = await pollStatus(data.paymentId);
        setLoading(false);
        return result;
      })();

      if (paymentPaid) {
        // Ask the server to verify the payment independently and activate membership.
        // The server fetches the payment from Moyasar, checks amount + ownership,
        // then sets the membership tier — the client never self-grants a tier.
        setLoading(true);
        try {
          await apiFetch('/api/payment/subscription/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: data.paymentId, plan: planId ?? 'basic' }),
          });
          await refreshUser(); // sync fresh membership into app state
        } finally {
          setLoading(false);
        }
        animateSuccess();
      } else {
        setPending(true);
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : (isRTL ? 'حدث خطأ' : 'Something went wrong'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // ─── BNPL checkout (Tabby / Tamara) ──────────────────────────────────────────
  async function handleBnplCheckout(provider: 'tabby' | 'tamara') {
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ checkoutUrl: string }>(
        `/api/payment/checkout/${provider}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan:       planId ?? 'basic',
            buyerName:  buyerName.trim(),
            buyerEmail: buyerEmail.trim(),
            buyerPhone: buyerPhone.trim(),
          }),
        },
      );

      setLoading(false);
      await WebBrowser.openBrowserAsync(data.checkoutUrl, {
        dismissButtonStyle: 'done',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      // After the user closes the browser, show pending confirmation
      setPending(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : (isRTL ? 'حدث خطأ' : 'Something went wrong'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // ─── Apple Pay via Moyasar.js in Safari WebBrowser ───────────────────────────
  async function handleApplePayCheckout() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const base    = getApiBaseUrl();
      const formUrl = `${base}/api/payment/applepay-form`
        + `?plan=${encodeURIComponent(planId ?? 'basic')}`
        + `&name=${encodeURIComponent(buyerName.trim())}`
        + `&email=${encodeURIComponent(buyerEmail.trim())}`;

      setLoading(false);
      await WebBrowser.openBrowserAsync(formUrl, {
        dismissButtonStyle: 'done',
        presentationStyle:  WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      // Moyasar.js handles payment server-side; show pending until webhook fires
      setPending(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err instanceof Error ? err.message : (isRTL ? 'حدث خطأ' : 'Something went wrong'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  // ─── Main submit handler ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (payMethod === 'card')     return handleCardCheckout();
    if (payMethod === 'tabby')    return handleBnplCheckout('tabby');
    if (payMethod === 'tamara')   return handleBnplCheckout('tamara');
    if (payMethod === 'applepay') return handleApplePayCheckout();
  }

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: 'center' }}>
          <LinearGradient colors={plan.gradient} style={styles.successIcon}>
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.successTitle, { fontFamily: font.bold }]}>
            {isRTL ? 'تم الاشتراك بنجاح!' : 'Subscribed!'}
          </Text>
          <Text style={[styles.successSub, { fontFamily: font.regular }]}>
            {isRTL
              ? `مرحباً بك في ${plan.nameAr}`
              : `Welcome to ${plan.nameEn}`}
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ─── Pending screen ──────────────────────────────────────────────────────────
  if (pending) {
    return (
      <View style={[styles.container, { backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="time-outline" size={64} color="#7B2A9E" style={{ marginBottom: 24 }} />
        <Text style={[styles.successTitle, { fontFamily: font.bold, color: '#2D1B69' }]}>
          {isRTL ? 'جاري التحقق من الدفع' : 'Payment received'}
        </Text>
        <Text style={[styles.successSub, { fontFamily: font.regular, color: '#6B7280', textAlign: 'center', marginBottom: 32 }]}>
          {isRTL
            ? 'تم استلام طلبك وسيتم تفعيل الاشتراك خلال 24 ساعة وستصلك إشعار بذلك.'
            : 'Your payment was received. Membership activates within 24 hours — we will notify you.'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.pendingBtn}>
          <Text style={[styles.pendingBtnText, { fontFamily: font.semibold }]}>
            {isRTL ? 'العودة للرئيسية' : 'Back to home'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main checkout form ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={plan.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { fontFamily: font.bold, textAlign: align }]}>
            {isRTL ? plan.nameAr : plan.nameEn}
          </Text>
          <Text style={[styles.headerPrice, { fontFamily: font.regular, textAlign: align }]}>
            {plan.price} {isRTL ? 'ريال / سنة' : 'SAR / year'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F5F3FF' }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Payment method tabs ── */}
        <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 10 }]}>
          {isRTL ? 'طريقة الدفع' : 'Payment method'}
        </Text>
        <View style={[styles.methodTabs, { flexDirection: rowDir }]}>
          {([
            { id: 'card',     labelEn: 'Card',      labelAr: 'بطاقة',    icon: 'card-outline',     comingSoon: false },
            { id: 'tabby',    labelEn: 'Tabby',     labelAr: 'تابي',     icon: 'calendar-outline', comingSoon: true  },
            { id: 'tamara',   labelEn: 'Tamara',    labelAr: 'تمارا',    icon: 'layers-outline',   comingSoon: true  },
            ...(Platform.OS === 'ios'
              ? [{ id: 'applepay', labelEn: 'Apple Pay', labelAr: 'Apple Pay', icon: 'logo-apple', comingSoon: true }]
              : []),
          ] as { id: string; labelEn: string; labelAr: string; icon: string; comingSoon: boolean }[]).map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.methodTab, payMethod === m.id && !m.comingSoon && styles.methodTabActive, m.comingSoon && styles.methodTabDisabled]}
              onPress={() => { if (m.comingSoon) return; setPayMethod(m.id as PayMethod); setErrorMsg(null); }}
              activeOpacity={m.comingSoon ? 1 : 0.7}
            >
              <Ionicons name={m.icon as any} size={18} color={m.comingSoon ? '#C8C4DC' : payMethod === m.id ? '#5B2C91' : '#9CA3AF'} />
              <Text style={[styles.methodTabText, { fontFamily: font.semibold, color: m.comingSoon ? '#C8C4DC' : payMethod === m.id ? '#5B2C91' : '#6B7280' }]}>
                {isRTL ? m.labelAr : m.labelEn}
              </Text>
              {m.comingSoon && (
                <Text style={[styles.methodTabSoon, { fontFamily: font.semibold }]}>{isRTL ? 'قريباً' : 'Soon'}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Buyer info (always shown) ── */}
        <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginTop: 20, marginBottom: 10 }]}>
          {isRTL ? 'بيانات المشترك' : 'Your details'}
        </Text>
        <Field label={isRTL ? 'الاسم الكامل' : 'Full name'} error={fieldErrors.buyerName} align={align} font={font.medium}>
          <TextInput
            style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
            value={buyerName}
            onChangeText={v => { setBuyerName(v); setFieldErrors(p => ({ ...p, buyerName: '' })); }}
            autoCapitalize="words"
            placeholder={isRTL ? 'محمد العمري' : 'John Smith'}
            placeholderTextColor="#C0C0D4"
          />
        </Field>
        <Field label={isRTL ? 'البريد الإلكتروني' : 'Email'} error={fieldErrors.buyerEmail} align={align} font={font.medium}>
          <TextInput
            style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
            value={buyerEmail}
            onChangeText={v => { setBuyerEmail(v); setFieldErrors(p => ({ ...p, buyerEmail: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your@email.com"
            placeholderTextColor="#C0C0D4"
          />
        </Field>
        {(payMethod === 'tabby' || payMethod === 'tamara') && (
          <Field label={isRTL ? 'رقم الجوال' : 'Phone number'} error={fieldErrors.buyerPhone} align={align} font={font.medium}>
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
              value={buyerPhone}
              onChangeText={v => { setBuyerPhone(v); setFieldErrors(p => ({ ...p, buyerPhone: '' })); }}
              keyboardType="phone-pad"
              placeholder="+966 5X XXX XXXX"
              placeholderTextColor="#C0C0D4"
            />
          </Field>
        )}

        {/* ── Card fields ── */}
        {payMethod === 'card' && (
          <View style={styles.cardSection}>
            <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 10 }]}>
              {isRTL ? 'تفاصيل البطاقة' : 'Card details'}
            </Text>

            {/* Accepted card logos */}
            <View style={[styles.cardLogos, { flexDirection: rowDir }]}>
              {['mada', 'visa', 'mc'].map((b) => (
                <View key={b} style={styles.cardLogo}>
                  <Text style={styles.cardLogoText}>
                    {b === 'mada' ? 'مدى' : b === 'visa' ? 'VISA' : 'MC'}
                  </Text>
                </View>
              ))}
            </View>

            <Field label={isRTL ? 'رقم البطاقة' : 'Card number'} error={fieldErrors.cardNumber} align={align} font={font.medium}>
              <TextInput
                style={[styles.input, { fontFamily: font.medium, textAlign: isRTL ? 'right' : 'left', letterSpacing: 1.5 }]}
                value={cardNumber}
                onChangeText={v => { setCardNumber(formatCardNumber(v)); setFieldErrors(p => ({ ...p, cardNumber: '' })); }}
                keyboardType="numeric"
                maxLength={19}
                placeholder="XXXX XXXX XXXX XXXX"
                placeholderTextColor="#C0C0D4"
              />
            </Field>

            <View style={[{ flexDirection: rowDir, gap: 12 }]}>
              <View style={{ flex: 1 }}>
                <Field label={isRTL ? 'تاريخ الانتهاء' : 'Expiry (MM/YY)'} error={fieldErrors.expiry} align={align} font={font.medium}>
                  <TextInput
                    style={[styles.input, { fontFamily: font.medium, textAlign: 'center' }]}
                    value={expiry}
                    onChangeText={v => { setExpiry(formatExpiry(v)); setFieldErrors(p => ({ ...p, expiry: '' })); }}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholder="MM/YY"
                    placeholderTextColor="#C0C0D4"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="CVV" error={fieldErrors.cvc} align={align} font={font.medium}>
                  <TextInput
                    style={[styles.input, { fontFamily: font.medium, textAlign: 'center' }]}
                    value={cvc}
                    onChangeText={v => { setCvc(v.replace(/\D/g, '').slice(0, 4)); setFieldErrors(p => ({ ...p, cvc: '' })); }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="•••"
                    placeholderTextColor="#C0C0D4"
                  />
                </Field>
              </View>
            </View>
          </View>
        )}

        {/* ── BNPL info card ── */}
        {payMethod !== 'card' && (
          <View style={styles.bnplInfo}>
            <Ionicons name="information-circle-outline" size={20} color="#5B2C91" style={{ marginTop: 1 }} />
            <Text style={[styles.bnplInfoText, { fontFamily: font.regular, textAlign: align, flex: 1 }]}>
              {payMethod === 'tabby'
                ? (isRTL
                    ? 'سيتم فتح صفحة تابي لإتمام الدفع على أقساط بدون فوائد.'
                    : 'A Tabby checkout page will open to pay in interest-free instalments.')
                : (isRTL
                    ? 'سيتم فتح صفحة تمارا لإتمام الدفع على 4 أقساط بدون فوائد.'
                    : 'A Tamara checkout page will open to split into 4 interest-free payments.')}
            </Text>
          </View>
        )}

        {/* ── Order summary ── */}
        <View style={styles.orderSummary}>
          <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 14 }]}>
            {isRTL ? 'ملخص الطلب' : 'Order summary'}
          </Text>
          <SummaryRow label={isRTL ? plan.nameAr : plan.nameEn} value={`${plan.price} ${isRTL ? 'ريال' : 'SAR'}`} font={font} rowDir={rowDir} bold />
          <SummaryRow
            label={isRTL ? 'طريقة السداد' : 'Payment'}
            value={
              payMethod === 'tamara'
                ? (isRTL ? '4 أقساط بدون فوائد' : '4 interest-free instalments')
                : payMethod === 'tabby'
                  ? (isRTL ? 'أقساط بدون فوائد' : 'Interest-free instalments')
                  : (isRTL ? '12 شهراً' : '12 months')
            }
            font={font} rowDir={rowDir}
          />
          <View style={styles.divider} />
          <SummaryRow label={isRTL ? 'الإجمالي (شامل الضريبة)' : 'Total (VAT incl.)'} value={`${plan.price} ${isRTL ? 'ريال' : 'SAR'}`} font={font} rowDir={rowDir} bold accent />
        </View>

        {/* ── Features ── */}
        <View style={styles.featuresCard}>
          <Text style={[styles.sectionLabel, { fontFamily: font.bold, textAlign: align, marginBottom: 12 }]}>
            {isRTL ? 'ما يشمله الاشتراك' : "What's included"}
          </Text>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureRow, { flexDirection: rowDir }]}>
              <View style={styles.featureDot}><Ionicons name="checkmark" size={12} color="#5B2C91" /></View>
              <Text style={[styles.featureText, { fontFamily: font.regular, textAlign: align }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* ── Error ── */}
        {!!errorMsg && (
          <View style={[styles.errorBanner, { flexDirection: rowDir }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#E74C3C" />
            <Text style={[styles.errorText, { fontFamily: font.regular }]}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Submit button ── */}
        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.88} style={styles.submitWrap}>
          <LinearGradient
            colors={loading ? ['#9CA3AF', '#9CA3AF'] : plan.gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.submitBtn, { flexDirection: rowDir }]}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {isRTL ? 'جاري المعالجة…' : 'Processing…'}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#FFF" />
                <Text style={[styles.submitText, { fontFamily: font.bold }]}>
                  {payMethod === 'card'
                    ? (isRTL ? `ادفع ${plan.price} ريال` : `Pay SAR ${plan.price}`)
                    : payMethod === 'tabby'
                      ? (isRTL ? 'الدفع عبر تابي' : 'Continue with Tabby')
                      : payMethod === 'tamara'
                        ? (isRTL ? 'الدفع عبر تمارا' : 'Continue with Tamara')
                        : (isRTL ? 'الدفع عبر Apple Pay' : 'Pay with Apple Pay')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.termsNote, { fontFamily: font.regular, textAlign: 'center' }]}>
          {isRTL
            ? 'الدفع آمن ومشفر. يتجدد الاشتراك تلقائياً سنوياً.'
            : 'Your payment is encrypted and secure. Subscription auto-renews annually.'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function Field({ label, error, align, font, children }: {
  label: string; error?: string; align: 'left' | 'right'; font: string; children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[fStyles.label, { fontFamily: font, textAlign: align }]}>{label}</Text>
      {children}
      {!!error && <Text style={[fStyles.error, { textAlign: align }]}>{error}</Text>}
    </View>
  );
}

function SummaryRow({ label, value, font, rowDir, bold, accent }: {
  label: string; value: string; font: any; rowDir: 'row' | 'row-reverse'; bold?: boolean; accent?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, { flexDirection: rowDir }]}>
      <Text style={[styles.summaryLabel, { fontFamily: bold ? font.semibold : font.regular }]}>{label}</Text>
      <Text style={[styles.summaryValue, { fontFamily: bold ? font.bold : font.regular, color: accent ? '#5B2C91' : '#1A1A1A' }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const fStyles = StyleSheet.create({
  label: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  error: { fontSize: 12, color: '#E74C3C', marginTop: 4 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F3FF' },
  header:      { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#FFF' },
  headerPrice: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll:      { padding: 20 },
  sectionLabel:{ fontSize: 14, color: '#1A1A1A' },

  // Payment method tabs
  methodTabs:  { gap: 8, marginBottom: 4 },
  methodTab: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#FFF', alignItems: 'center', gap: 4,
  },
  methodTabActive:    { borderColor: '#5B2C91', backgroundColor: '#F3EEFF' },
  methodTabDisabled:  { backgroundColor: '#FAFAFA', borderColor: '#F0EEF0' },
  methodTabText:      { fontSize: 13 },
  methodTabSoon:      { fontSize: 9, color: '#B0AAC8', marginTop: -2 },

  // Buyer / card fields
  input: {
    backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1A1A1A',
  },

  // Card section
  cardSection: { marginTop: 4 },
  cardLogos:   { gap: 6, marginBottom: 12 },
  cardLogo: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  cardLogoText: { fontSize: 11, color: '#374151', fontWeight: '700' },

  // BNPL info
  bnplInfo: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EDE8F8', borderRadius: 12, padding: 14, marginTop: 8,
  },
  bnplInfoText: { fontSize: 13, color: '#4B5563' },

  // Order summary
  orderSummary: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: '#EBEBF5',
  },
  summaryRow:   { justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14 },
  divider:      { height: 1, backgroundColor: '#EBEBF5', marginVertical: 10 },

  // Features
  featuresCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginTop: 14, borderWidth: 1, borderColor: '#EBEBF5',
  },
  featureRow:  { gap: 10, marginBottom: 8, alignItems: 'center' },
  featureDot:  {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, color: '#374151' },

  // Error
  errorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    gap: 8, alignItems: 'center', marginTop: 12,
  },
  errorText:   { flex: 1, fontSize: 13, color: '#991B1B' },

  // Submit
  submitWrap:  { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  submitBtn:   { height: 58, alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText:  { color: '#FFF', fontSize: 17 },
  termsNote:   { fontSize: 12, color: '#9CA3AF', marginTop: 14, lineHeight: 18 },

  // Success / pending
  successIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle:{ fontSize: 24, color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  successSub:  { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  pendingBtn: {
    backgroundColor: '#2D1B69', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  pendingBtnText: { color: '#FFF', fontSize: 16 },
});
