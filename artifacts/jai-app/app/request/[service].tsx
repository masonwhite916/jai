import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Platform, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import { useJaiLocation } from '@/context/LocationContext';
import * as Haptics from 'expo-haptics';

type ServiceDef = { labelKey: TranslationKeys; icon: string; lib: string; basePrice: number };

const SERVICE_INFO: Record<string, ServiceDef> = {
  battery: { labelKey: 'serviceBattery', icon: 'battery-charging', lib: 'Ionicons', basePrice: 120 },
  fuel: { labelKey: 'serviceFuel', icon: 'gas-station', lib: 'MCIcons', basePrice: 80 },
  tire: { labelKey: 'serviceTire', icon: 'tire', lib: 'MCIcons', basePrice: 350 },
  tow: { labelKey: 'serviceTow', icon: 'tow-truck', lib: 'MCIcons', basePrice: 500 },
  lockout: { labelKey: 'serviceLockout', icon: 'key', lib: 'Ionicons', basePrice: 200 },
  mechanic: { labelKey: 'serviceMechanic', icon: 'wrench', lib: 'MCIcons', basePrice: 300 },
  electric: { labelKey: 'serviceElectric', icon: 'flash', lib: 'Ionicons', basePrice: 280 },
};

function ServiceIcon({ icon, lib }: { icon: string; lib: string }) {
  if (lib === 'Ionicons') return <Ionicons name={icon as any} size={28} color="#FFFFFF" />;
  return <MaterialCommunityIcons name={icon as any} size={28} color="#FFFFFF" />;
}

export default function ServiceRequest() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const { t, isRTL, font } = useLanguage();
  const gps = useJaiLocation();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const info = SERVICE_INFO[service ?? 'battery'] ?? SERVICE_INFO.battery;
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentIdx, setPaymentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const TOTAL_STEPS = 4;

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setSubmitting(true);
      await new Promise(r => setTimeout(r, 1000));
      setSubmitting(false);
      router.replace('/tracking');
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
      quality: 0.7,
    });
    if (!res.canceled) {
      setPhotos(prev => [...prev, ...res.assets.map(a => a.uri)].slice(0, 4));
    }
  }

  function refreshLocation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    gps.refresh();
  }

  const canProceed = step === 1 ? !!selectedVehicle : true;

  const PAYMENT_OPTIONS: { label: TranslationKeys; iconName: string }[] = [
    { label: 'applePay', iconName: 'logo-apple' },
    { label: 'madaCard', iconName: 'card-outline' },
    { label: 'visaMaster', iconName: 'card-outline' },
    { label: 'cash', iconName: 'cash-outline' },
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
                      onPress={() => setPhotos(p => p.filter(u => u !== uri))}
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
                <Text style={[styles.totalValue, { fontFamily: font.bold }]}>{info.basePrice} SAR</Text>
              </View>
            </View>

            <Text style={[styles.paymentTitle, { fontFamily: font.bold, textAlign: align }]}>{t('paymentMethod')}</Text>
            {PAYMENT_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.paymentOption, i === paymentIdx && styles.paymentOptionSelected, { flexDirection: rowDir }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPaymentIdx(i); }}
                activeOpacity={0.85}
              >
                <Ionicons name={opt.iconName as any} size={20} color={i === paymentIdx ? '#2D1B69' : '#6B7280'} />
                <Text style={[styles.paymentLabel, i === paymentIdx && { color: '#2D1B69', fontFamily: font.semibold }, { flex: 1, fontFamily: font.medium, textAlign: align }]}>{t(opt.label)}</Text>
                {i === paymentIdx && <Ionicons name="checkmark-circle" size={18} color="#2D1B69" />}
              </TouchableOpacity>
            ))}
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
  paymentTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  paymentOption: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  paymentOptionSelected: { borderColor: '#2D1B69', backgroundColor: '#F8F7FF' },
  paymentLabel: { fontSize: 15, color: '#1A1A1A' },
  bottomBar: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F8' },
  nextBtn: { borderRadius: 16, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnGradient: { paddingVertical: 18, justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
