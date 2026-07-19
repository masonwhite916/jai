import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import * as Haptics from 'expo-haptics';

const SERVICE_INFO: Record<string, { label: string; icon: string; lib: string; basePrice: number }> = {
  battery: { label: 'Battery Jump Start', icon: 'battery-charging', lib: 'Ionicons', basePrice: 120 },
  fuel: { label: 'Fuel Delivery', icon: 'gas-station', lib: 'MCIcons', basePrice: 80 },
  tire: { label: 'Tire Replacement', icon: 'tire', lib: 'MCIcons', basePrice: 350 },
  tow: { label: 'Vehicle Towing', icon: 'tow-truck', lib: 'MCIcons', basePrice: 500 },
  lockout: { label: 'Lockout Assistance', icon: 'key', lib: 'Ionicons', basePrice: 200 },
  mechanic: { label: 'Light Mechanical Repair', icon: 'wrench', lib: 'MCIcons', basePrice: 300 },
  electric: { label: 'Electrical Repair', icon: 'flash', lib: 'Ionicons', basePrice: 280 },
};

function ServiceIcon({ icon, lib }: { icon: string; lib: string }) {
  if (lib === 'Ionicons') return <Ionicons name={icon as any} size={28} color="#FFFFFF" />;
  return <MaterialCommunityIcons name={icon as any} size={28} color="#FFFFFF" />;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.stepDot, i < current && styles.stepDotDone, i === current - 1 && styles.stepDotActive]} />
      ))}
    </View>
  );
}

export default function ServiceRequest() {
  const { service } = useLocalSearchParams<{ service: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();

  const info = SERVICE_INFO[service ?? 'battery'] ?? SERVICE_INFO.battery;
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
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

  function canProceed() {
    if (step === 1) return !!selectedVehicle;
    return true;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.serviceIconBg}>
              <ServiceIcon icon={info.icon} lib={info.lib} />
            </View>
            <Text style={styles.headerTitle}>{info.label}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {/* Step 1: Vehicle */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select Your Vehicle</Text>
            {user?.vehicles?.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.vehicleOption, selectedVehicle === v.id && styles.vehicleOptionSelected]}
                onPress={() => setSelectedVehicle(v.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.vehicleOptionIcon, selectedVehicle === v.id && { backgroundColor: '#EDE8F8' }]}>
                  <Ionicons name="car" size={22} color={selectedVehicle === v.id ? '#2D1B69' : '#6B7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleName, selectedVehicle === v.id && { color: '#2D1B69' }]}>{v.year} {v.make} {v.model}</Text>
                  <Text style={styles.vehiclePlate}>{v.plate} · {v.color}</Text>
                </View>
                {selectedVehicle === v.id && <Ionicons name="checkmark-circle" size={22} color="#2D1B69" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addVehicleBtn}>
              <Ionicons name="add-circle-outline" size={20} color="#2D1B69" />
              <Text style={styles.addVehicleText}>Add New Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Problem Description */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Describe the Problem</Text>
            <Text style={styles.stepSubtitle}>Help our technician understand the issue better</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g., Car won't start, battery seems completely dead..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.optionalLabel}>Optional — add photos</Text>
            <TouchableOpacity style={styles.uploadBtn}>
              <Ionicons name="camera-outline" size={22} color="#2D1B69" />
              <Text style={styles.uploadText}>Upload Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirm Your Location</Text>
            <View style={styles.mapPlaceholder}>
              <LinearGradient colors={['#EDE8F8', '#F8F9FC']} style={styles.mapInner}>
                <Ionicons name="map" size={48} color="#5B2C91" />
                <Text style={styles.mapPlaceholderText}>Location Detected</Text>
                <Text style={styles.mapAddress}>King Fahd Road, Riyadh</Text>
              </LinearGradient>
            </View>
            <View style={styles.locationCard}>
              <Ionicons name="location-sharp" size={18} color="#C21875" />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>Current Location</Text>
                <Text style={styles.locationAddress}>King Fahd Road, Al Olaya District, Riyadh 12244</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 4: Summary & Confirm */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Service</Text>
                <Text style={styles.summaryValue}>{info.label}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Vehicle</Text>
                <Text style={styles.summaryValue}>
                  {user?.vehicles?.find(v => v.id === selectedVehicle)?.make ?? 'N/A'}{' '}
                  {user?.vehicles?.find(v => v.id === selectedVehicle)?.model ?? ''}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Location</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>King Fahd Road, Riyadh</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Est. Arrival</Text>
                <Text style={[styles.summaryValue, { color: '#2ECC71', fontFamily: 'Inter_700Bold' }]}>~8 minutes</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Estimated Cost</Text>
                <Text style={styles.totalValue}>{info.basePrice} SAR</Text>
              </View>
            </View>

            <Text style={styles.paymentTitle}>Payment Method</Text>
            {['Apple Pay', 'Mada Card', 'Visa / Mastercard', 'Cash'].map((method, i) => (
              <TouchableOpacity key={method} style={[styles.paymentOption, i === 0 && styles.paymentOptionSelected]}>
                <Ionicons name={i === 0 ? 'logo-apple' : i === 3 ? 'cash-outline' : 'card-outline'} size={20} color={i === 0 ? '#2D1B69' : '#6B7280'} />
                <Text style={[styles.paymentLabel, i === 0 && { color: '#2D1B69', fontFamily: 'Inter_600SemiBold' }]}>{method}</Text>
                {i === 0 && <Ionicons name="checkmark-circle" size={18} color="#2D1B69" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) }]}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed() || submitting) && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canProceed() ? ['#2D1B69', '#5B2C91'] : ['#C0C0D0', '#C0C0D0']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>
              {submitting ? 'Confirming...' : step === TOTAL_STEPS ? 'Confirm Request' : 'Continue'}
            </Text>
            {!submitting && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', gap: 8 },
  serviceIconBg: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  stepIndicator: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  stepDot: { width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotDone: { backgroundColor: 'rgba(255,255,255,0.6)' },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepLabel: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular' },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 20 },
  vehicleOption: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  vehicleOptionSelected: { borderColor: '#2D1B69' },
  vehicleOptionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#F8F9FC', justifyContent: 'center', alignItems: 'center' },
  vehicleName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', fontFamily: 'Inter_600SemiBold' },
  vehiclePlate: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', marginTop: 2 },
  addVehicleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  addVehicleText: { fontSize: 14, color: '#2D1B69', fontFamily: 'Inter_600SemiBold' },
  notesInput: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, fontSize: 15, color: '#1A1A1A', fontFamily: 'Inter_400Regular', minHeight: 140, borderWidth: 1.5, borderColor: '#EBEBF5', marginBottom: 20 },
  optionalLabel: { fontSize: 13, color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginBottom: 10 },
  uploadBtn: { backgroundColor: '#EDE8F8', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#D0C8F0', borderStyle: 'dashed' },
  uploadText: { fontSize: 15, color: '#2D1B69', fontFamily: 'Inter_600SemiBold' },
  mapPlaceholder: { borderRadius: 20, overflow: 'hidden', height: 180, marginBottom: 16 },
  mapInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  mapPlaceholderText: { fontSize: 16, fontWeight: '600', color: '#5B2C91', fontFamily: 'Inter_600SemiBold' },
  mapAddress: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  locationLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  locationAddress: { fontSize: 14, color: '#1A1A1A', fontFamily: 'Inter_500Medium', marginTop: 2 },
  changeText: { fontSize: 13, color: '#C21875', fontFamily: 'Inter_600SemiBold' },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' },
  summaryKey: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 14, color: '#1A1A1A', fontFamily: 'Inter_500Medium', maxWidth: '60%', textAlign: 'right' },
  summaryTotal: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#2D1B69', fontFamily: 'Inter_700Bold' },
  paymentTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Inter_700Bold', marginBottom: 12 },
  paymentOption: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  paymentOptionSelected: { borderColor: '#2D1B69', backgroundColor: '#F8F7FF' },
  paymentLabel: { flex: 1, fontSize: 15, color: '#1A1A1A', fontFamily: 'Inter_500Medium' },
  bottomBar: { backgroundColor: '#FFFFFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F8' },
  nextBtn: { borderRadius: 16, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnGradient: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
