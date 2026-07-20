import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp, type Vehicle } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

const COLORS = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Brown', 'Gold'];
const COLORS_AR = ['أبيض', 'أسود', 'فضي', 'رمادي', 'أحمر', 'أزرق', 'أخضر', 'بني', 'ذهبي'];

const CURRENT_YEAR = new Date().getFullYear();

export default function AddVehicleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useApp();
  const { isRTL, font } = useLanguage();

  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const [make,  setMake]  = useState('');
  const [model, setModel] = useState('');
  const [year,  setYear]  = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    const req = isRTL ? 'مطلوب' : 'Required';
    if (!make.trim())  e.make  = req;
    if (!model.trim()) e.model = req;
    if (!year.trim())  e.year  = req;
    else if (!/^\d{4}$/.test(year) || +year < 1990 || +year > CURRENT_YEAR + 1) {
      e.year = isRTL ? 'سنة غير صحيحة' : 'Invalid year';
    }
    if (!plate.trim()) e.plate = req;
    if (!color)        e.color = isRTL ? 'اختر لوناً' : 'Pick a colour';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const newVehicle: Vehicle = {
      id: `v${Date.now()}`,
      make: make.trim(),
      model: model.trim(),
      year: year.trim(),
      plate: plate.trim().toUpperCase(),
      color,
    };

    const updated = [...(user?.vehicles ?? []), newVehicle];
    await updateUser({ vehicles: updated });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="car-sport" size={26} color="#FFFFFF" />
          </View>
          <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
            {isRTL ? 'إضافة مركبة جديدة' : 'Add New Vehicle'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Make & Model */}
        <View style={[styles.row, { flexDirection: rowDir }]}>
          <Field
            label={isRTL ? 'الماركة' : 'Make'}
            error={errors.make}
            align={align}
            font={font.medium}
            style={{ flex: 1 }}
          >
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
              value={make}
              onChangeText={v => { setMake(v); setErrors(e => ({ ...e, make: '' })); }}
              placeholder={isRTL ? 'مثال: تويوتا' : 'e.g. Toyota'}
              placeholderTextColor="#C0C0D4"
              autoCapitalize="words"
            />
          </Field>
          <Field
            label={isRTL ? 'الموديل' : 'Model'}
            error={errors.model}
            align={align}
            font={font.medium}
            style={{ flex: 1 }}
          >
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
              value={model}
              onChangeText={v => { setModel(v); setErrors(e => ({ ...e, model: '' })); }}
              placeholder={isRTL ? 'مثال: كامري' : 'e.g. Camry'}
              placeholderTextColor="#C0C0D4"
              autoCapitalize="words"
            />
          </Field>
        </View>

        {/* Year & Plate */}
        <View style={[styles.row, { flexDirection: rowDir }]}>
          <Field
            label={isRTL ? 'سنة الصنع' : 'Year'}
            error={errors.year}
            align={align}
            font={font.medium}
            style={{ flex: 1 }}
          >
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: 'center', letterSpacing: 2 }]}
              value={year}
              onChangeText={v => { setYear(v.replace(/\D/g, '').slice(0, 4)); setErrors(e => ({ ...e, year: '' })); }}
              placeholder="2022"
              placeholderTextColor="#C0C0D4"
              keyboardType="number-pad"
              maxLength={4}
            />
          </Field>
          <Field
            label={isRTL ? 'رقم اللوحة' : 'Plate Number'}
            error={errors.plate}
            align={align}
            font={font.medium}
            style={{ flex: 1 }}
          >
            <TextInput
              style={[styles.input, { fontFamily: font.medium, textAlign: 'center', letterSpacing: 3 }]}
              value={plate}
              onChangeText={v => { setPlate(v.toUpperCase()); setErrors(e => ({ ...e, plate: '' })); }}
              placeholder="ABC 1234"
              placeholderTextColor="#C0C0D4"
              autoCapitalize="characters"
            />
          </Field>
        </View>

        {/* Colour picker */}
        <View style={{ marginBottom: 28 }}>
          <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
            {isRTL ? 'اللون' : 'Colour'}
          </Text>
          <View style={[styles.colorGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={c}
                onPress={() => { setColor(c); setErrors(e => ({ ...e, color: '' })); }}
                activeOpacity={0.8}
                style={[
                  styles.colorChip,
                  color === c && styles.colorChipSelected,
                ]}
              >
                <Text style={[
                  styles.colorChipText,
                  { fontFamily: font.medium, color: color === c ? '#2D1B69' : '#6B7280' },
                ]}>
                  {isRTL ? COLORS_AR[i] : c}
                </Text>
                {color === c && (
                  <Ionicons name="checkmark" size={12} color="#2D1B69" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          {!!errors.color && (
            <Text style={[styles.errorText, { textAlign: align }]}>{errors.color}</Text>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
          style={styles.saveWrap}
        >
          <LinearGradient
            colors={saving ? ['#9CA3AF', '#9CA3AF'] : ['#2D1B69', '#5B2C91']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, { flexDirection: rowDir }]}
          >
            <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: font.bold }]}>
              {saving
                ? (isRTL ? 'جاري الحفظ…' : 'Saving…')
                : (isRTL ? 'حفظ المركبة' : 'Save Vehicle')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, error, align, font, children, style,
}: {
  label: string; error?: string; align: 'left' | 'right';
  font: string; children: React.ReactNode; style?: object;
}) {
  return (
    <View style={[{ marginBottom: 20 }, style]}>
      <Text style={[styles.fieldLabel, { fontFamily: font, textAlign: align }]}>{label}</Text>
      {children}
      {!!error && <Text style={[styles.errorText, { textAlign: align }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 28,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, color: '#FFFFFF' },

  scroll: { flex: 1, backgroundColor: '#F4F2FA' },
  form: { padding: 20 },

  row: { gap: 12 },

  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  errorText: { fontSize: 12, color: '#E74C3C', marginTop: 4 },

  colorGrid: { gap: 8 },
  colorChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, marginBottom: 4,
  },
  colorChipSelected: {
    borderColor: '#5B2C91', backgroundColor: '#EDE8F8',
  },
  colorChipText: { fontSize: 13 },

  saveWrap: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    marginTop: 8,
  },
  saveBtn: {
    paddingVertical: 18,
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16 },
});
