import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Platform, Image, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import { useJaiLocation } from '@/context/LocationContext';
import { apiFetch, getAuthToken, getApiBaseUrl } from '@/lib/api';
import * as Haptics from 'expo-haptics';

// ── Card helpers ──────────────────────────────────────────────────────────────
function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Simple UUID v4-like token for Apple Pay refs. */
function genRef(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type ServiceDef = { labelKey: TranslationKeys; icon: string; lib: string; basePrice: number };

// NOTE: basePrice values MUST stay in sync with SERVICE_PAYOUTS in artifacts/jai-app/lib/serviceConstants.ts
// (which mirrors PAYOUTS in artifacts/api-server/src/routes/requests.ts
//  and SERVICE_AMOUNTS in artifacts/api-server/src/routes/moyasar.ts)
const SERVICE_INFO: Record<string, ServiceDef> = {
  battery: { labelKey: 'serviceBattery', icon: 'battery-charging', lib: 'Ionicons', basePrice: 120 },
  fuel:    { labelKey: 'serviceFuel',    icon: 'gas-station',       lib: 'MCIcons',  basePrice: 80  },
  tire:    { labelKey: 'serviceTire',    icon: 'tire',              lib: 'MCIcons',  basePrice: 350 },
  tow:     { labelKey: 'serviceTow',     icon: 'tow-truck',         lib: 'MCIcons',  basePrice: 500 },
  lockout: { labelKey: 'serviceLockout', icon: 'key',               lib: 'Ionicons', basePrice: 200 },
  mechanic:{ labelKey: 'serviceMechanic',icon: 'wrench',            lib: 'MCIcons',  basePrice: 300 },
  electric:{ labelKey: 'serviceElectric',icon: 'flash',             lib: 'Ionicons', basePrice: 280 },
};

/** Services covered (free) under each subscription plan. */
const PLAN_COVERED: Record<string, string[]> = {
  basic:     ['battery', 'fuel', 'tire', 'tow', 'mechanic', 'electric'],
  accidents: ['battery', 'fuel', 'tire', 'tow', 'mechanic', 'electric'],
  rental:    ['battery', 'fuel', 'tire', 'tow', 'mechanic', 'electric'],
  premium:   ['battery', 'fuel', 'tire', 'tow', 'mechanic', 'electric', 'lockout'],
};

function ServiceIcon({ icon, lib }: { icon: string; lib: string }) {
  if (lib === 'Ionicons') return <Ionicons name={icon as any} size={28} color="#FFFFFF" />;
  return <MaterialCommunityIcons name={icon as any} size={28} color="#FFFFFF" />;
}

export default function ServiceRequest() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setActiveRequest } = useApp();
  const { t, isRTL, font } = useLanguage();
  const gps = useJaiLocation();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const info = SERVICE_INFO[service ?? 'battery'] ?? SERVICE_INFO.battery;
  const membership = user?.membership ?? 'none';
  const isCovered = membership !== 'none' && (PLAN_COVERED[membership] ?? []).includes(service ?? '');
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoAssets, setPhotoAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [paymentIdx, setPaymentIdx] = useState(3); // default to cash
  const [submitting, setSubmitting] = useState(false);
  const TOTAL_STEPS = 4;

  // ── Payment confirmation interstitial ─────────────────────────────────────
  const [payConfirm, setPayConfirm] = useState<{
    paymentId: string;
    method: string;
    amount: number;
  } | null>(null);

  // ── Durable idempotency key — persisted in AsyncStorage across app restarts ───
  //
  // Lifecycle:
  //   created  → on first mount for this user+service (no existing key in storage)
  //   reused   → on every subsequent mount until a TERMINAL outcome is reached
  //   cleared  → after payment confirmed paid (success) OR confirmed failed
  //              (definitive decline); NOT cleared on network errors (unknown
  //              outcome — key must survive so a retry sends the same key and
  //              Moyasar returns the original result, preventing a second charge)
  //
  // A crash between charge and response leaves the key in storage; the next
  // launch reuses it and Moyasar returns the already-charged payment rather than
  // creating a new one.
  const idempotencyKeyRef  = useRef<string>(genRef()); // may be overwritten by effect
  const idemStorageKey     = `jai_idem_${user?.id ?? 'anon'}_${service ?? 'battery'}`;
  // Gate card submission until AsyncStorage hydration completes so we never
  // send an un-persisted in-memory key that won't survive a crash.
  const [idemKeyReady, setIdemKeyReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(idemStorageKey)
      .then(saved => {
        if (saved) {
          idempotencyKeyRef.current = saved;
        } else {
          AsyncStorage.setItem(idemStorageKey, idempotencyKeyRef.current).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIdemKeyReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Call ONLY on TRUE terminal outcomes (confirmed paid or confirmed declined). */
  function clearIdempotencyKey() {
    AsyncStorage.removeItem(idemStorageKey).catch(() => {});
  }

  // ── Card payment fields (shown inline for non-members choosing card) ──────
  const [cardName,   setCardName]   = useState(user?.name ?? '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry,     setExpiry]     = useState('');
  const [cvc,        setCvc]        = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  // ── Poll Moyasar payment status (card checkout with possible 3DS) ──────────
  // Returns a tri-state:
  //   'paid'    — Moyasar confirmed the charge succeeded
  //   'failed'  — Moyasar explicitly declined the charge (terminal, clear key)
  //   'unknown' — network errors / timeout (outcome uncertain, preserve key)
  async function pollPaymentStatus(paymentId: string, attempts = 8): Promise<'paid' | 'failed' | 'unknown'> {
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      try {
        const data = await apiFetch<{ status: string }>(`/api/payment/status/${paymentId}`);
        if (data.status === 'paid')   return 'paid';
        if (data.status === 'failed') return 'failed';
        // status === 'initiated' / 'authorized' — still in flight, keep polling
      } catch { /* network blip — keep polling */ }
    }
    // All attempts exhausted without a terminal status — outcome is uncertain
    return 'unknown';
  }

  // ── Poll Apple Pay service-ref-lookup ────────────────────────────────────
  async function pollApplePayRef(ref: string, attempts = 10): Promise<string | null> {
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 2000));
      try {
        const data = await apiFetch<{ paymentId?: string; pending?: boolean }>(
          `/api/payment/service-ref-lookup?ref=${encodeURIComponent(ref)}`,
        );
        if (data.paymentId) return data.paymentId;
      } catch { /* keep polling */ }
    }
    return null;
  }

  // ── Resolve payment_id based on selected method ──────────────────────────
  /** Returns { payment_id, cash_intent } or throws on error. */
  async function resolvePayment(): Promise<{ payment_id?: string; cash_intent?: boolean }> {
    const isCardMethod = paymentIdx === 0 || paymentIdx === 1 || paymentIdx === 2;
    const isCashMethod = paymentIdx === 3;

    if (isCashMethod) {
      // Confirm cash on delivery
      return new Promise((resolve, reject) => {
        Alert.alert(
          isRTL ? 'الدفع عند الوصول' : 'Cash on Delivery',
          isRTL
            ? `المبلغ المستحق: ${info.basePrice} ريال\nسيتم تحصيل المبلغ عند وصول الفني.`
            : `Amount due: ${info.basePrice} SAR\nPayment will be collected when the technician arrives.`,
          [
            { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel', onPress: () => reject(new Error('cancelled')) },
            { text: isRTL ? 'تأكيد' : 'Confirm', onPress: () => resolve({ cash_intent: true }) },
          ],
          { cancelable: true, onDismiss: () => reject(new Error('cancelled')) },
        );
      });
    }

    if (isCardMethod) {
      // Validate card fields
      const errs: Record<string, string> = {};
      if (!cardName.trim())
        errs.cardName = isRTL ? 'مطلوب' : 'Required';
      if (cardNumber.replace(/\D/g, '').length < 16)
        errs.cardNumber = isRTL ? 'رقم البطاقة غير صحيح' : 'Invalid card number';
      if (expiry.length < 5)
        errs.expiry = isRTL ? 'تاريخ انتهاء غير صحيح' : 'Invalid expiry';
      if (cvc.length < 3)
        errs.cvc = isRTL ? 'رمز CVV غير صحيح' : 'Invalid CVV';

      // Apple Pay: obtain a server-issued session token (binds user_id server-side),
      // then open the form in a browser using that token.
      if (paymentIdx === 0) {
        const base = getApiBaseUrl();
        const ref  = genRef();

        // Auth-protected: server stamps user_id into the session from the JWT
        const sessionData = await apiFetch<{ token: string }>(
          '/api/payment/service-applepay-session',
          {
            method: 'POST',
            body:   JSON.stringify({ service_type: service ?? 'battery', ref }),
          },
        );
        if (!sessionData.token) {
          throw new Error(isRTL ? 'فشل إنشاء جلسة الدفع.' : 'Failed to create payment session.');
        }

        const formUrl = `${base}/api/payment/service-applepay-form`
          + `?token=${encodeURIComponent(sessionData.token)}`
          + `&name=${encodeURIComponent(user?.name ?? '')}`;

        await WebBrowser.openBrowserAsync(formUrl, {
          dismissButtonStyle: 'done',
          presentationStyle:  WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });

        // Poll for payment confirmation
        const paymentId = await pollApplePayRef(ref);
        if (!paymentId) {
          throw new Error(isRTL
            ? 'لم يتم التحقق من الدفع. يرجى المحاولة مجدداً.'
            : 'Payment not confirmed. Please try again.');
        }
        return { payment_id: paymentId };
      }

      // Mada / Visa/MC card form
      if (Object.keys(errs).length > 0) {
        setCardErrors(errs);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        throw new Error('validation');
      }

      const [mm, yy] = expiry.split('/');
      const data = await apiFetch<{
        paymentId: string;
        status: string;
        transactionUrl: string | null;
      }>('/api/payment/service-checkout', {
        method: 'POST',
        body: JSON.stringify({
          service_type:    service ?? 'battery',
          cardName:        cardName.trim(),
          cardNumber:      cardNumber.replace(/\D/g, ''),
          month:           mm?.trim(),
          year:            `20${yy?.trim()}`,
          cvc:             cvc.trim(),
          idempotencyKey:  idempotencyKeyRef.current,
        }),
      });

      // 3DS redirect
      if (data.transactionUrl) {
        await WebBrowser.openBrowserAsync(data.transactionUrl, {
          dismissButtonStyle: 'done',
          presentationStyle:  WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        });
      }

      if (data.status === 'paid') return { payment_id: data.paymentId };

      const pollResult = await pollPaymentStatus(data.paymentId);
      if (pollResult === 'paid') {
        return { payment_id: data.paymentId };
      }
      if (pollResult === 'failed') {
        // Moyasar explicitly declined — rotate key immediately so a corrected
        // retry on the same screen uses a fresh payment intent, not the cached
        // failed result that Moyasar would return for the same idempotency key.
        const freshKey = genRef();
        idempotencyKeyRef.current = freshKey;
        AsyncStorage.setItem(idemStorageKey, freshKey).catch(() => {});
        throw new Error(isRTL
          ? 'فشل الدفع. يرجى التحقق من بيانات البطاقة والمحاولة مجدداً.'
          : 'Payment failed. Please check your card details and try again.');
      }
      // pollResult === 'unknown': network errors exhausted polling — outcome uncertain.
      // Do NOT clear the key; the charge may have gone through. The same key will be
      // sent on the next attempt so Moyasar returns the original result instead of
      // creating a second charge.
      throw new Error(isRTL
        ? 'تعذّر التحقق من حالة الدفع. يرجى المحاولة مجدداً.'
        : 'Could not confirm payment status. Please try again.');
    }

    return {};
  }

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    // Final step — resolve payment then submit
    setSubmitting(true);
    try {
      let paymentPayload: { payment_id?: string; cash_intent?: boolean } = {};

      if (getAuthToken() && !isCovered) {
        try {
          paymentPayload = await resolvePayment();
        } catch (err) {
          setSubmitting(false);
          const msg = err instanceof Error ? err.message : '';
          if (msg === 'cancelled' || msg === 'validation') return;
          Alert.alert(
            isRTL ? 'خطأ في الدفع' : 'Payment Error',
            msg || (isRTL ? 'حدث خطأ أثناء معالجة الدفع.' : 'Payment could not be processed.'),
            [{ text: isRTL ? 'حسناً' : 'OK' }],
          );
          return;
        }
      }

      if (getAuthToken()) {
        const uploadedUrls = await uploadPhotos();
        const body: Record<string, unknown> = {
          service_type: service ?? 'battery',
          notes:        notes.trim() || null,
          location_lat: gps.coords?.latitude  ?? null,
          location_lng: gps.coords?.longitude ?? null,
          address:      gps.fullAddress       ?? null,
          photo_urls:   uploadedUrls.length ? JSON.stringify(uploadedUrls) : null,
          ...paymentPayload,
        };
        if (selectedVehicleData) {
          body.vehicle_make  = selectedVehicleData.make;
          body.vehicle_model = selectedVehicleData.model;
          body.vehicle_year  = selectedVehicleData.year;
          body.vehicle_plate = selectedVehicleData.plate;
          body.vehicle_color = selectedVehicleData.color;
        }
        const result = await apiFetch<{ request: any; job: any }>('/api/requests', {
          method: 'POST',
          body:   JSON.stringify(body),
        });
        setActiveRequest({
          requestId:   String(result.request?.id ?? ''),
          jobId:       String(result.job?.id ?? ''),
          serviceType: service ?? 'battery',
          status:      'pending',
          payout:      result.job?.payout ?? undefined,
          customerLat: gps.coords?.latitude,
          customerLng: gps.coords?.longitude,
        });
      } else {
        // Guest / offline — simulate delay
        await new Promise(r => setTimeout(r, 800));
        setActiveRequest({
          requestId:   'guest',
          jobId:       'guest',
          serviceType: service ?? 'battery',
          status:      'pending',
        });
      }
      setSubmitting(false);
      clearIdempotencyKey(); // terminal success — next request gets a fresh key

      // Show payment confirmation interstitial for card / Apple Pay payments.
      // Cash and covered-membership flows skip straight to tracking.
      if (paymentPayload.payment_id) {
        const methodLabels: Record<number, string> = {
          0: t('applePay'),
          1: t('madaCard'),
          2: t('visaMaster'),
        };
        setPayConfirm({
          paymentId: paymentPayload.payment_id,
          method:    methodLabels[paymentIdx] ?? 'Card',
          amount:    info.basePrice,
        });
      } else {
        router.replace('/tracking');
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : '';
      Alert.alert(
        isRTL ? 'تعذّر إنشاء الطلب' : 'Could not create request',
        msg || (isRTL ? 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.'),
        [{ text: isRTL ? 'حسناً' : 'OK' }],
      );
    }
  }

  async function pickPhotos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled) {
      // Store assets (uri + base64) so we can upload them on submit
      setPhotos(prev =>
        [...prev, ...res.assets.map(a => a.uri)].slice(0, 4),
      );
      setPhotoAssets(prev =>
        [...prev, ...res.assets].slice(0, 4),
      );
    }
  }

  /** Upload all pending photo assets to the API; returns an array of server URLs. */
  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const asset of photoAssets) {
      if (!asset.base64) continue;
      try {
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const result = await apiFetch<{ url: string }>('/api/uploads', {
          method: 'POST',
          body: JSON.stringify({ base64: asset.base64, mimeType }),
        });
        const base = getApiBaseUrl();
        urls.push(result.url.startsWith('/') ? `${base}${result.url}` : result.url);
      } catch {
        // Non-fatal — skip failed upload
      }
    }
    return urls;
  }

  function refreshLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    gps.refresh();
  }

  // On the final step, block card submission until the idempotency key has been
  // loaded (or freshly persisted) to AsyncStorage — prevents sending an in-memory
  // key that won't survive a crash mid-payment.
  const isCardPayment = !isCovered && (paymentIdx === 1 || paymentIdx === 2);
  const canProceed =
    step === 1 ? !!selectedVehicle
    : step === TOTAL_STEPS && isCardPayment ? idemKeyReady
    : true;

  const PAYMENT_OPTIONS: { label: TranslationKeys; iconName: string; comingSoon?: boolean }[] = [
    { label: 'applePay',   iconName: 'logo-apple',  comingSoon: true },
    { label: 'madaCard',   iconName: 'card-outline', comingSoon: true },
    { label: 'visaMaster', iconName: 'card-outline', comingSoon: true },
    { label: 'cash',       iconName: 'cash-outline' },
  ];

  const selectedVehicleData = user?.vehicles?.find(v => v.id === selectedVehicle);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient colors={['#2D1B69', '#5B2C91']} style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}>
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.serviceIconBg}><ServiceIcon icon={info.icon} lib={info.lib} /></View>
            <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>{t(info.labelKey)}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.stepIndicator}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[styles.stepDot, i < step && styles.stepDotDone, i === step - 1 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { fontFamily: font.regular }]}>
          {t('stepWord')} {step} {t('ofWord')} {TOTAL_STEPS}
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {step === 1 && (
          <View>
            <Text style={[styles.stepTitle, { fontFamily: font.bold, textAlign: align }]}>{t('selectVehicle')}</Text>
            {user?.vehicles?.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleOption, selectedVehicle === v.id && styles.vehicleOptionSelected, { flexDirection: rowDir }]}
                onPress={() => setSelectedVehicle(v.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.vehicleOptionIcon, selectedVehicle === v.id && { backgroundColor: '#EDE8F8' }]}>
                  <Ionicons name="car" size={22} color={selectedVehicle === v.id ? '#2D1B69' : '#6B7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleName, selectedVehicle === v.id && { color: '#2D1B69' }, { fontFamily: font.semibold, textAlign: align }]}>
                    {v.year} {v.make} {v.model}
                  </Text>
                  <Text style={[styles.vehiclePlate, { fontFamily: font.regular, textAlign: align }]}>{v.plate} · {v.color}</Text>
                </View>
                {selectedVehicle === v.id && <Ionicons name="checkmark-circle" size={22} color="#2D1B69" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.addVehicleBtn, { flexDirection: rowDir }]} onPress={() => router.push('/add-vehicle')} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={20} color="#2D1B69" />
              <Text style={[styles.addVehicleText, { fontFamily: font.semibold }]}>{t('addNewVehicle')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.stepTitle, { fontFamily: font.bold, textAlign: align }]}>{t('describeProblem')}</Text>
            <Text style={[styles.stepSubtitle, { fontFamily: font.regular, textAlign: align }]}>{t('describeProblemHint')}</Text>
            <TextInput
              style={[styles.notesInput, { fontFamily: font.regular, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              placeholder={t('problemPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={[styles.optionalLabel, { fontFamily: font.regular, textAlign: align }]}>{t('optionalPhotos')}</Text>
            {photos.length > 0 && (
              <View style={[styles.photoRow, { flexDirection: rowDir }]}>
                {photos.map((uri) => (
                  <View key={uri} style={styles.photoThumbWrap}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => {
                        setPhotos(p => p.filter(u => u !== uri));
                        setPhotoAssets(p => p.filter(a => a.uri !== uri));
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {photos.length < 4 && (
              <TouchableOpacity style={[styles.uploadBtn, { flexDirection: rowDir }]} onPress={pickPhotos} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={22} color="#2D1B69" />
                <Text style={[styles.uploadText, { fontFamily: font.semibold }]}>{t('uploadPhotos')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.stepTitle, { fontFamily: font.bold, textAlign: align }]}>{t('confirmLocation')}</Text>
            <View style={styles.mapPlaceholder}>
              <LinearGradient colors={['#EDE8F8', '#F8F9FC']} style={styles.mapInner}>
                <Ionicons name="map" size={48} color="#5B2C91" />
                <Text style={[styles.mapPlaceholderText, { fontFamily: font.semibold }]}>
                  {gps.status === 'loading' ? t('locating') : t('locationDetected')}
                </Text>
                <Text style={[styles.mapAddress, { fontFamily: font.regular }]}>
                  {gps.shortAddress ?? t('addressKingFahd')}
                </Text>
              </LinearGradient>
            </View>
            <View style={[styles.locationCard, { flexDirection: rowDir }]}>
              <Ionicons name="location-sharp" size={18} color="#C21875" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationLabel, { fontFamily: font.regular, textAlign: align }]}>{t('currentLocation')}</Text>
                <Text style={[styles.locationAddress, { fontFamily: font.medium, textAlign: align }]}>
                  {gps.status === 'loading' ? t('locating') : gps.fullAddress ?? t('addressKingFahdFull')}
                </Text>
              </View>
              <TouchableOpacity onPress={refreshLocation} disabled={gps.status === 'loading'} hitSlop={8}>
                {gps.status === 'loading'
                  ? <ActivityIndicator size="small" color="#C21875" />
                  : <Text style={[styles.changeText, { fontFamily: font.semibold }]}>{t('change')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={[styles.stepTitle, { fontFamily: font.bold, textAlign: align }]}>{t('orderSummary')}</Text>
            <View style={styles.summaryCard}>
              {[
                { key: t('serviceLabel'), val: t(info.labelKey) },
                { key: t('vehicleLabel'), val: selectedVehicleData ? `${selectedVehicleData.make} ${selectedVehicleData.model}` : 'N/A' },
                { key: t('locationLabel'), val: gps.shortAddress ?? t('addressKingFahd') },
                { key: t('estArrivalLabel'), val: `~8 ${isRTL ? 'دقائق' : 'minutes'}`, green: true },
              ].map(({ key, val, green }) => (
                <View key={key} style={[styles.summaryRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.summaryKey, { fontFamily: font.regular }]}>{key}</Text>
                  <Text style={[styles.summaryValue, { fontFamily: font.medium, color: green ? '#2ECC71' : '#1A1A1A' }]} numberOfLines={1}>{val}</Text>
                </View>
              ))}
              <View style={[styles.summaryRow, styles.summaryTotal, { flexDirection: rowDir }]}>
                <Text style={[styles.totalLabel, { fontFamily: font.bold }]}>{t('estimatedCost')}</Text>
                {isCovered ? (
                  <View style={styles.coveredPriceWrap}>
                    <Text style={[styles.totalValueStrike, { fontFamily: font.regular }]}>{info.basePrice} SAR</Text>
                    <Text style={[styles.totalValueFree, { fontFamily: font.bold }]}>
                      {isRTL ? 'مجاناً' : 'Free'}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.totalValue, { fontFamily: font.bold }]}>{info.basePrice} SAR</Text>
                )}
              </View>
            </View>

            {isCovered ? (
              <View style={[styles.planCoverageCard, { flexDirection: rowDir }]}>
                <View style={styles.planCoverageIcon}>
                  <Ionicons name="shield-checkmark" size={22} color="#2ECC71" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planCoverageTitle, { fontFamily: font.bold, textAlign: align }]}>
                    {isRTL ? 'مشمولة بباقتك' : 'Covered by your plan'}
                  </Text>
                  <Text style={[styles.planCoverageSub, { fontFamily: font.regular, textAlign: align }]}>
                    {isRTL ? 'هذه الخدمة مجانية ضمن اشتراكك الحالي' : 'This service is free under your current subscription'}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.paymentTitle, { fontFamily: font.bold, textAlign: align }]}>{t('paymentMethod')}</Text>
                {PAYMENT_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.paymentOption,
                      i === paymentIdx && !opt.comingSoon && styles.paymentOptionSelected,
                      opt.comingSoon && styles.paymentOptionDisabled,
                      { flexDirection: rowDir },
                    ]}
                    onPress={() => {
                      if (opt.comingSoon) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPaymentIdx(i);
                      setCardErrors({});
                    }}
                    activeOpacity={opt.comingSoon ? 1 : 0.85}
                  >
                    <Ionicons name={opt.iconName as any} size={20} color={opt.comingSoon ? '#C8C4DC' : i === paymentIdx ? '#2D1B69' : '#6B7280'} />
                    <Text style={[
                      styles.paymentLabel,
                      { flex: 1, fontFamily: font.medium, textAlign: align },
                      i === paymentIdx && !opt.comingSoon && { color: '#2D1B69', fontFamily: font.semibold },
                      opt.comingSoon && { color: '#C8C4DC' },
                    ]}>{t(opt.label)}</Text>
                    {opt.comingSoon ? (
                      <View style={styles.comingSoonPill}>
                        <Text style={[styles.comingSoonText, { fontFamily: font.semibold }]}>{isRTL ? 'قريباً' : 'Soon'}</Text>
                      </View>
                    ) : (
                      i === paymentIdx && <Ionicons name="checkmark-circle" size={18} color="#2D1B69" />
                    )}
                  </TouchableOpacity>
                ))}

                {/* ── Inline card form (Mada / Visa) ── */}
                {(paymentIdx === 1 || paymentIdx === 2) && (
                  <View style={styles.cardFormBox}>
                    <Text style={[styles.cardFormTitle, { fontFamily: font.bold, textAlign: align }]}>
                      {isRTL ? 'تفاصيل البطاقة' : 'Card details'}
                    </Text>

                    {/* Cardholder name */}
                    <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
                      {isRTL ? 'اسم حامل البطاقة' : 'Cardholder name'}
                    </Text>
                    <TextInput
                      style={[styles.cardInput, { fontFamily: font.regular, textAlign: align }, cardErrors.cardName ? styles.cardInputError : null]}
                      value={cardName}
                      onChangeText={v => { setCardName(v); setCardErrors(p => ({ ...p, cardName: '' })); }}
                      autoCapitalize="words"
                      placeholder={isRTL ? 'محمد العمري' : 'John Smith'}
                      placeholderTextColor="#C0C0D4"
                    />
                    {!!cardErrors.cardName && (
                      <Text style={[styles.fieldError, { fontFamily: font.regular }]}>{cardErrors.cardName}</Text>
                    )}

                    {/* Card number */}
                    <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
                      {isRTL ? 'رقم البطاقة' : 'Card number'}
                    </Text>
                    <TextInput
                      style={[styles.cardInput, { fontFamily: font.regular, letterSpacing: 1.5 }, cardErrors.cardNumber ? styles.cardInputError : null]}
                      value={cardNumber}
                      onChangeText={v => { setCardNumber(formatCardNumber(v)); setCardErrors(p => ({ ...p, cardNumber: '' })); }}
                      keyboardType="numeric"
                      maxLength={19}
                      placeholder="XXXX XXXX XXXX XXXX"
                      placeholderTextColor="#C0C0D4"
                    />
                    {!!cardErrors.cardNumber && (
                      <Text style={[styles.fieldError, { fontFamily: font.regular }]}>{cardErrors.cardNumber}</Text>
                    )}

                    <View style={[{ flexDirection: rowDir, gap: 12 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
                          {isRTL ? 'تاريخ الانتهاء' : 'Expiry (MM/YY)'}
                        </Text>
                        <TextInput
                          style={[styles.cardInput, { fontFamily: font.regular, textAlign: 'center' }, cardErrors.expiry ? styles.cardInputError : null]}
                          value={expiry}
                          onChangeText={v => { setExpiry(formatExpiry(v)); setCardErrors(p => ({ ...p, expiry: '' })); }}
                          keyboardType="numeric"
                          maxLength={5}
                          placeholder="MM/YY"
                          placeholderTextColor="#C0C0D4"
                        />
                        {!!cardErrors.expiry && (
                          <Text style={[styles.fieldError, { fontFamily: font.regular }]}>{cardErrors.expiry}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>CVV</Text>
                        <TextInput
                          style={[styles.cardInput, { fontFamily: font.regular, textAlign: 'center' }, cardErrors.cvc ? styles.cardInputError : null]}
                          value={cvc}
                          onChangeText={v => { setCvc(v.replace(/\D/g, '').slice(0, 4)); setCardErrors(p => ({ ...p, cvc: '' })); }}
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry
                          placeholder="•••"
                          placeholderTextColor="#C0C0D4"
                        />
                        {!!cardErrors.cvc && (
                          <Text style={[styles.fieldError, { fontFamily: font.regular }]}>{cardErrors.cvc}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* ── Apple Pay note ── */}
                {paymentIdx === 0 && (
                  <View style={[styles.applePayNote, { flexDirection: rowDir }]}>
                    <Ionicons name="logo-apple" size={18} color="#1A1A1A" />
                    <Text style={[styles.applePayNoteText, { fontFamily: font.regular, textAlign: align }]}>
                      {isRTL
                        ? 'ستُفتح صفحة Apple Pay عند التأكيد'
                        : 'Apple Pay sheet will open on confirm'}
                    </Text>
                  </View>
                )}

                {/* ── Cash note ── */}
                {paymentIdx === 3 && (
                  <View style={[styles.cashNote, { flexDirection: rowDir }]}>
                    <Ionicons name="cash-outline" size={18} color="#2ECC71" />
                    <Text style={[styles.cashNoteText, { fontFamily: font.regular, textAlign: align }]}>
                      {isRTL
                        ? `المبلغ المستحق عند الوصول: ${info.basePrice} ريال`
                        : `Amount due on arrival: ${info.basePrice} SAR`}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) }]}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed || submitting) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed || submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canProceed ? ['#2D1B69', '#5B2C91'] : ['#C0C0D0', '#C0C0D0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.nextBtnGradient, { flexDirection: rowDir }]}
          >
            <Text style={[styles.nextBtnText, { fontFamily: font.bold }]}>
              {submitting ? t('confirming') : step === TOTAL_STEPS ? t('confirmRequest') : t('continueBtn')}
            </Text>
            {!submitting && <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Payment confirmation interstitial ──────────────────────────────── */}
      <Modal
        visible={!!payConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {/* prevent back-dismiss — user must tap the button */}}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmSheet, { paddingBottom: insets.bottom + 24 }]}>
            {/* Success icon */}
            <LinearGradient
              colors={['#2D1B69', '#5B2C91']}
              style={styles.confirmIconWrap}
            >
              <Ionicons name="checkmark" size={38} color="#FFFFFF" />
            </LinearGradient>

            <Text style={[styles.confirmTitle, { fontFamily: font.bold }]}>
              {isRTL ? 'تم الدفع بنجاح' : 'Payment confirmed'}
            </Text>
            <Text style={[styles.confirmSubtitle, { fontFamily: font.regular }]}>
              {isRTL
                ? 'تمت معالجة دفعتك بنجاح. سيتوجه فني إليك قريباً.'
                : 'Your payment was processed successfully. A technician is on the way.'}
            </Text>

            {/* Detail rows */}
            <View style={styles.confirmCard}>
              {[
                {
                  label: isRTL ? 'الخدمة' : 'Service',
                  value: t(info.labelKey),
                },
                {
                  label: isRTL ? 'المبلغ' : 'Amount',
                  value: `${payConfirm?.amount ?? info.basePrice} SAR`,
                  highlight: true,
                },
                {
                  label: isRTL ? 'طريقة الدفع' : 'Payment method',
                  value: payConfirm?.method ?? '',
                },
                {
                  label: isRTL ? 'رقم الإيصال' : 'Receipt ID',
                  value: payConfirm
                    ? `…${payConfirm.paymentId.slice(-8)}`
                    : '',
                },
              ].map(({ label, value, highlight }) => (
                <View key={label} style={[styles.confirmRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.confirmRowLabel, { fontFamily: font.regular }]}>{label}</Text>
                  <Text style={[
                    styles.confirmRowValue,
                    { fontFamily: highlight ? font.bold : font.medium },
                    highlight && { color: '#2D1B69', fontSize: 18 },
                  ]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                setPayConfirm(null);
                router.replace('/tracking');
              }}
            >
              <LinearGradient
                colors={['#2D1B69', '#5B2C91']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.confirmBtnGradient, { flexDirection: rowDir }]}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
                <Text style={[styles.confirmBtnText, { fontFamily: font.bold }]}>
                  {isRTL ? 'تتبّع الفني' : 'Track my technician'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', gap: 8 },
  serviceIconBg: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  stepIndicator: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotDone: { backgroundColor: 'rgba(255,255,255,0.6)' },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepLabel: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  vehicleOption: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 12, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  vehicleOptionSelected: { borderColor: '#2D1B69' },
  vehicleOptionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#F8F9FC', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  vehiclePlate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addVehicleBtn: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  addVehicleText: { fontSize: 14, color: '#2D1B69' },
  notesInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, fontSize: 15, color: '#1A1A1A',
    minHeight: 140, borderWidth: 1.5, borderColor: '#EBEBF5', marginBottom: 20,
  },
  optionalLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 10 },
  photoRow: { flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#EBEBF5' },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F8F9FC',
  },
  uploadBtn: {
    backgroundColor: '#EDE8F8', borderRadius: 14, paddingVertical: 16,
    justifyContent: 'center', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#D0C8F0', borderStyle: 'dashed',
  },
  uploadText: { fontSize: 15, color: '#2D1B69' },
  mapPlaceholder: { borderRadius: 20, overflow: 'hidden', height: 180, marginBottom: 16 },
  mapInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  mapPlaceholderText: { fontSize: 16, fontWeight: '600', color: '#5B2C91' },
  mapAddress: { fontSize: 13, color: '#6B7280', paddingHorizontal: 24, textAlign: 'center' },
  locationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  locationLabel: { fontSize: 12, color: '#6B7280' },
  locationAddress: { fontSize: 14, color: '#1A1A1A', marginTop: 2 },
  changeText: { fontSize: 13, color: '#C21875' },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  summaryRow: { justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  summaryKey: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, maxWidth: '60%', textAlign: 'right' },
  summaryTotal: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#2D1B69' },
  coveredPriceWrap: { alignItems: 'flex-end', gap: 1 },
  totalValueStrike: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
  totalValueFree: { fontSize: 20, color: '#2ECC71' },
  planCoverageCard: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.25)',
  },
  planCoverageIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(46,204,113,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  planCoverageTitle: { fontSize: 15, color: '#1A1A1A', marginBottom: 2 },
  planCoverageSub: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  paymentTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  paymentOption: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  paymentOptionSelected: { borderColor: '#2D1B69', backgroundColor: '#F8F7FF' },
  paymentOptionDisabled: { backgroundColor: '#FAFAFA', borderColor: 'transparent', shadowOpacity: 0 },
  paymentLabel: { fontSize: 15, color: '#1A1A1A' },
  comingSoonPill: { backgroundColor: '#F0EEF8', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  comingSoonText: { fontSize: 10, color: '#9E9AB0' },
  cardFormBox: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginTop: 12,
    borderWidth: 1.5, borderColor: '#EDE8F8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardFormTitle: { fontSize: 15, color: '#1A1A1A', marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6, marginTop: 10 },
  cardInput: {
    backgroundColor: '#F8F7FF', borderRadius: 10, padding: 12, fontSize: 15,
    color: '#1A1A1A', borderWidth: 1.5, borderColor: '#EBEBF5',
  },
  cardInputError: { borderColor: '#E74C3C' },
  fieldError: { fontSize: 12, color: '#E74C3C', marginTop: 4 },
  applePayNote: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, marginTop: 12,
    alignItems: 'center', gap: 8,
  },
  applePayNoteText: { fontSize: 13, color: '#6B7280', flex: 1 },
  cashNote: {
    backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 12, padding: 12, marginTop: 12,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
  },
  cashNoteText: { fontSize: 13, color: '#27AE60', flex: 1 },
  bottomBar: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F8' },
  nextBtn: { borderRadius: 16, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnGradient: { paddingVertical: 18, justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // ── Payment confirmation modal ────────────────────────────────────────────
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 32, paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 20,
  },
  confirmIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22, fontWeight: '700', color: '#1A1A1A',
    marginBottom: 8, textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 21, marginBottom: 24,
    paddingHorizontal: 8,
  },
  confirmCard: {
    width: '100%', backgroundColor: '#F8F7FF',
    borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: '#EDE8F8',
  },
  confirmRow: {
    justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EBEBF5',
  },
  confirmRowLabel: { fontSize: 14, color: '#6B7280' },
  confirmRowValue: { fontSize: 14, color: '#1A1A1A', textAlign: 'right', maxWidth: '60%' },
  confirmBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  confirmBtnGradient: {
    paddingVertical: 18, justifyContent: 'center',
    alignItems: 'center', gap: 10,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
