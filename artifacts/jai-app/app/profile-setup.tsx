import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import * as Haptics from 'expo-haptics';

const COLORS    = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Brown', 'Gold'];
const COLORS_AR = ['أبيض', 'أسود', 'فضي', 'رمادي', 'أحمر', 'أزرق', 'أخضر', 'بني', 'ذهبي'];
const CURRENT_YEAR = new Date().getFullYear();

interface CarDraft {
  make: string; model: string; year: string; plate: string; color: string;
}

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useApp();
  const { isRTL, font } = useLanguage();

  const align  = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const [name, setName] = useState(
    user?.name && user.name !== 'Guest' ? user.name : '',
  );
  const [cars, setCars] = useState<CarDraft[]>([]);

  // In-progress car form
  const [make,  setMake]  = useState('');
  const [model, setModel] = useState('');
  const [year,  setYear]  = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const formDirty = !!(make.trim() || model.trim() || year.trim() || plate.trim() || color);

  function carFormErrors(): Record<string, string> {
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
    return e;
  }

  function draftFromForm(): CarDraft {
    return {
      make:  make.trim(),
      model: model.trim(),
      year:  year.trim(),
      plate: plate.trim().toUpperCase(),
      color,
    };
  }

  function clearCarForm() {
    setMake(''); setModel(''); setYear(''); setPlate(''); setColor('');
  }

  function handleAddAnother() {
    const e = carFormErrors();
    if (Object.keys(e).length) {
      setErrors(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setCars(prev => [...prev, draftFromForm()]);
    clearCarForm();
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function removeCar(index: number) {
    setCars(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = isRTL ? 'الاسم مطلوب' : 'Name is required';
    // If the car form was touched, it must be valid before saving
    if (formDirty) Object.assign(e, carFormErrors());
    if (Object.keys(e).length) {
      setErrors(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setErrors({});
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const allCars = formDirty ? [...cars, draftFromForm()] : cars;
      for (const car of allCars) {
        await apiFetch('/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(car),
        });
      }
      // PUT /users/me — the response refreshes the whole profile (incl. vehicles)
      await updateUser({ name: name.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      setSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors({
        submit: isRTL
          ? 'تعذر حفظ ملفك الشخصي. حاول مرة أخرى.'
          : 'Could not save your profile. Try again.',
      });
    }
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#1A0845', '#3D2080', '#6A2597']}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: insets.top + 24 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle-outline" size={34} color="#FFFFFF" />
        </View>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isRTL ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
        </Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
          {isRTL ? 'أخبرنا عنك وعن سياراتك لخدمة أسرع' : 'Tell us about you and your cars for faster service'}
        </Text>
      </LinearGradient>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Text style={[styles.sectionTitle, { fontFamily: font.semibold, textAlign: align }]}>
          {isRTL ? 'الاسم الكامل' : 'Full Name'}
        </Text>
        <TextInput
          style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
          value={name}
          onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
          placeholder={isRTL ? 'مثال: محمد العتيبي' : 'e.g. Mohammed Alotaibi'}
          placeholderTextColor="#C0C0D4"
          autoCapitalize="words"
        />
        {!!errors.name && <Text style={[styles.errorText, { textAlign: align }]}>{errors.name}</Text>}

        {/* Cars header */}
        <View style={[styles.carsHeader, { flexDirection: rowDir }]}>
          <Ionicons name="car-sport-outline" size={18} color="#2D1B69" />
          <Text style={[styles.sectionTitle, { fontFamily: font.semibold, marginBottom: 0 }]}>
            {isRTL ? 'سياراتك' : 'Your Cars'}
          </Text>
          <Text style={[styles.optionalPill, { fontFamily: font.regular }]}>
            {isRTL ? 'اختياري' : 'optional'}
          </Text>
        </View>

        {/* Cars already added */}
        {cars.map((c, i) => (
          <View key={`${c.plate}-${i}`} style={[styles.carCard, { flexDirection: rowDir }]}>
            <View style={styles.carIcon}>
              <Ionicons name="car-sport" size={20} color="#2D1B69" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.carName, { fontFamily: font.semibold, textAlign: align }]}>
                {c.year} {c.make} {c.model}
              </Text>
              <Text style={[styles.carMeta, { fontFamily: font.regular, textAlign: align }]}>
                {c.plate} · {c.color}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeCar(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color="#C0C0D4" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Car entry form */}
        <View style={styles.carForm}>
          <View style={[styles.row, { flexDirection: rowDir }]}>
            <Field label={isRTL ? 'الماركة' : 'Make'} error={errors.make} align={align} font={font.medium} style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, { fontFamily: font.medium, textAlign: align }]}
                value={make}
                onChangeText={v => { setMake(v); setErrors(e => ({ ...e, make: '' })); }}
                placeholder={isRTL ? 'مثال: تويوتا' : 'e.g. Toyota'}
                placeholderTextColor="#C0C0D4"
                autoCapitalize="words"
              />
            </Field>
            <Field label={isRTL ? 'الموديل' : 'Model'} error={errors.model} align={align} font={font.medium} style={{ flex: 1 }}>
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

          <View style={[styles.row, { flexDirection: rowDir }]}>
            <Field label={isRTL ? 'سنة الصنع' : 'Year'} error={errors.year} align={align} font={font.medium} style={{ flex: 1 }}>
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
            <Field label={isRTL ? 'رقم اللوحة' : 'Plate Number'} error={errors.plate} align={align} font={font.medium} style={{ flex: 1 }}>
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
          <Text style={[styles.fieldLabel, { fontFamily: font.medium, textAlign: align }]}>
            {isRTL ? 'اللون' : 'Colour'}
          </Text>
          <View style={[styles.colorGrid, { flexDirection: 'row', flexWrap: 'wrap' }]}>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={c}
                onPress={() => { setColor(c); setErrors(e => ({ ...e, color: '' })); }}
                activeOpacity={0.8}
                style={[styles.colorChip, color === c && styles.colorChipSelected]}
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
          {!!errors.color && <Text style={[styles.errorText, { textAlign: align }]}>{errors.color}</Text>}
        </View>

        {/* Add another car */}
        <TouchableOpacity
          onPress={handleAddAnother}
          disabled={!formDirty || saving}
          activeOpacity={0.8}
          style={[styles.addAnotherBtn, { flexDirection: rowDir, opacity: formDirty ? 1 : 0.45 }]}
        >
          <Ionicons name="add-circle-outline" size={18} color="#2D1B69" />
          <Text style={[styles.addAnotherText, { fontFamily: font.medium }]}>
            {isRTL ? 'إضافة سيارة أخرى' : 'Add another car'}
          </Text>
        </TouchableOpacity>

        {!!errors.submit && (
          <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 10 }]}>{errors.submit}</Text>
        )}

        {/* Save & Continue */}
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.88} style={styles.saveWrap}>
          <LinearGradient
            colors={saving ? ['#9CA3AF', '#9CA3AF'] : ['#2D1B69', '#6A2597']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, { flexDirection: rowDir }]}
          >
            <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#FFF" />
            <Text style={[styles.saveBtnText, { fontFamily: font.bold }]}>
              {saving
                ? (isRTL ? 'جاري الحفظ…' : 'Saving…')
                : (isRTL ? 'حفظ ومتابعة' : 'Save & Continue')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity onPress={handleSkip} disabled={saving} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={[styles.skipText, { fontFamily: font.regular }]}>
            {isRTL ? 'تخطي الآن' : 'Skip for now'}
          </Text>
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
    <View style={[{ marginBottom: 16 }, style]}>
      <Text style={[styles.fieldLabel, { fontFamily: font, textAlign: align }]}>{label}</Text>
      {children}
      {!!error && <Text style={[styles.errorText, { textAlign: align }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24, paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 14,
  },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, color: '#FFFFFF', marginTop: 12 },
  headerSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    marginTop: 6, textAlign: 'center',
  },

  scroll: { flex: 1, backgroundColor: '#F4F2FA' },
  form: { paddingHorizontal: 24, paddingTop: 28 },

  sectionTitle: { fontSize: 15, color: '#120840', marginBottom: 10 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#120840',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  errorText: { fontSize: 12, color: '#E74C3C', marginTop: 4 },

  carsHeader: {
    alignItems: 'center', gap: 8,
    marginTop: 26, marginBottom: 12,
  },
  optionalPill: {
    fontSize: 11, color: '#6B7280',
    backgroundColor: '#EAE6F5', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    overflow: 'hidden',
  },

  carCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    padding: 12, alignItems: 'center', gap: 12,
    marginBottom: 10,
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  carIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#EDE8F8',
    justifyContent: 'center', alignItems: 'center',
  },
  carName: { fontSize: 15, color: '#1A1A1A' },
  carMeta: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },

  carForm: {
    borderRadius: 16, borderWidth: 1.5,
    borderColor: '#D8D0EC', borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.55)',
    padding: 14, paddingBottom: 16,
  },
  row: { gap: 12 },
  fieldLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },

  colorGrid: { gap: 8 },
  colorChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0DBEF',
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, marginBottom: 4,
  },
  colorChipSelected: { borderColor: '#5B2C91', backgroundColor: '#EDE8F8' },
  colorChipText: { fontSize: 13 },

  addAnotherBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, marginTop: 12, marginBottom: 20,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#C9BFE6',
    backgroundColor: '#FFFFFF',
  },
  addAnotherText: { fontSize: 14, color: '#2D1B69' },

  saveWrap: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  saveBtn: {
    paddingVertical: 18,
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16 },

  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 13, color: '#9CA3AF' },
});
