import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  useAdminConfig,
  type AppOffer, type AppTheme, type AppAnnouncement,
  type AppContactConfig, type AppPlan,
} from '@/context/AdminConfigContext';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

// ── Colour presets ─────────────────────────────────────────────────────────────
const PRESETS = [
  '#2D1B69','#5B2C91','#C21875','#1565C0',
  '#00897B','#E65100','#C62828','#F9A825',
  '#37474F','#000000','#FFFFFF','#546E7A',
];

// ── Service list (for visibility toggles) ─────────────────────────────────────
const PANEL_SERVICES = [
  { id: 'battery',  labelEn: 'Battery Jump Start', labelAr: 'شحن البطارية' },
  { id: 'fuel',     labelEn: 'Fuel Delivery',       labelAr: 'توصيل الوقود' },
  { id: 'tire',     labelEn: 'Tire Replacement',    labelAr: 'تغيير الإطار' },
  { id: 'tow',      labelEn: 'Vehicle Towing',      labelAr: 'سحب السيارة' },
  { id: 'lockout',  labelEn: 'Lockout Assistance',  labelAr: 'فتح السيارة' },
  { id: 'mechanic', labelEn: 'Light Mechanical',    labelAr: 'إصلاح ميكانيكي' },
  { id: 'electric', labelEn: 'Electrical Repair',   labelAr: 'إصلاح كهربائي' },
];

type Tab = 'theme' | 'offers' | 'announce' | 'services' | 'contact' | 'packages';

function isValidHex(hex: string) { return /^#[0-9A-Fa-f]{6}$/.test(hex); }

// ── Colour row ────────────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange, font }: {
  label: string; value: string; onChange: (v: string) => void; font: any;
}) {
  const [draft, setDraft] = useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  function commit(v: string) { isValidHex(v) ? onChange(v) : setDraft(value); }
  return (
    <View style={cr.row}>
      <Text style={[cr.label, { fontFamily: font.medium }]}>{label}</Text>
      <View style={cr.right}>
        <View style={[cr.swatch, { backgroundColor: isValidHex(draft) ? draft : value }]} />
        <TextInput
          style={[cr.input, { fontFamily: font.regular }]}
          value={draft} onChangeText={setDraft}
          onBlur={() => commit(draft)} onSubmitEditing={() => commit(draft)}
          maxLength={7} autoCapitalize="characters"
          placeholder="#RRGGBB" placeholderTextColor="#AAA" returnKeyType="done"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRESETS.map((p) => (
            <TouchableOpacity key={p} style={[cr.preset, { backgroundColor: p }, p === value && cr.presetActive]}
              onPress={() => { onChange(p); setDraft(p); }} activeOpacity={0.7} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const cr = StyleSheet.create({
  row: { marginBottom: 20 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  swatch: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E0DCF0' },
  input: { flex: 1, height: 38, borderWidth: 1.5, borderColor: '#E0DCF0', borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FAFAFA' },
  preset: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  presetActive: { borderWidth: 2.5, borderColor: '#2D1B69' },
});

// ── Text field helper ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, font, rtl, phone }: {
  label: string; value: string; onChange: (v: string) => void;
  font: any; rtl?: boolean; phone?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[om.fLabel, { fontFamily: font.medium }]}>{label}</Text>
      <TextInput
        style={[om.fInput, { fontFamily: font.regular, textAlign: rtl ? 'right' : 'left' }]}
        value={value} onChangeText={onChange}
        placeholder={label} placeholderTextColor="#AAA"
        keyboardType={phone ? 'phone-pad' : 'default'}
      />
    </View>
  );
}

// ── Toggle row helper ─────────────────────────────────────────────────────────
function ToggleRow({ label, value, onChange, font }: {
  label: string; value: boolean; onChange: (v: boolean) => void; font: any;
}) {
  return (
    <View style={om.toggleRow}>
      <Text style={[om.fLabel, { fontFamily: font.medium }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: '#E0DCF0', true: '#5B2C91' }} thumbColor="#FFF" />
    </View>
  );
}

// ── Offer editor modal ────────────────────────────────────────────────────────
const EMPTY_OFFER: Omit<AppOffer, 'id'> = {
  titleEn: '', titleAr: '', subtitleEn: '', subtitleAr: '',
  color: '#2D1B69', color2: '#C21875', active: true,
};

function OfferModal({ visible, initial, onSave, onClose, font, isRTL }: {
  visible: boolean; initial: AppOffer | null;
  onSave: (o: AppOffer) => void; onClose: () => void; font: any; isRTL: boolean;
}) {
  const [draft, setDraft] = useState<Omit<AppOffer, 'id'>>(initial ?? EMPTY_OFFER);
  React.useEffect(() => { setDraft(initial ?? { ...EMPTY_OFFER }); }, [initial, visible]);

  const c1 = isValidHex(draft.color)  ? draft.color  : '#2D1B69';
  const c2 = isValidHex(draft.color2) ? draft.color2 : '#C21875';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[om.root, { paddingBottom: 24 }]}>
        <View style={om.header}>
          <TouchableOpacity onPress={onClose} style={om.closeBtn}><Ionicons name="close" size={22} color="#5B2C91" /></TouchableOpacity>
          <Text style={[om.title, { fontFamily: font.bold }]}>{initial ? (isRTL ? 'تعديل العرض' : 'Edit Offer') : (isRTL ? 'إضافة عرض' : 'New Offer')}</Text>
          <TouchableOpacity style={[om.saveBtn, (!draft.titleEn || !draft.titleAr) && { opacity: 0.4 }]}
            onPress={() => onSave({ ...draft, id: initial?.id ?? Date.now().toString() })}
            disabled={!draft.titleEn || !draft.titleAr}>
            <Text style={[om.saveTxt, { fontFamily: font.bold }]}>{isRTL ? 'حفظ' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={om.preview}>
            <Text style={[om.prevTitle, { fontFamily: font.bold }]}>{(isRTL ? draft.titleAr : draft.titleEn) || (isRTL ? 'العنوان' : 'Title')}</Text>
            <Text style={[om.prevSub, { fontFamily: font.regular }]}>{(isRTL ? draft.subtitleAr : draft.subtitleEn) || (isRTL ? 'الوصف' : 'Subtitle')}</Text>
          </LinearGradient>
          <Field label="Title (English)"    value={draft.titleEn}    onChange={(v) => setDraft(d => ({...d, titleEn: v}))}    font={font} />
          <Field label="Title (Arabic)"     value={draft.titleAr}    onChange={(v) => setDraft(d => ({...d, titleAr: v}))}    font={font} rtl />
          <Field label="Subtitle (English)" value={draft.subtitleEn} onChange={(v) => setDraft(d => ({...d, subtitleEn: v}))} font={font} />
          <Field label="Subtitle (Arabic)"  value={draft.subtitleAr} onChange={(v) => setDraft(d => ({...d, subtitleAr: v}))} font={font} rtl />
          <ColorRow label="Gradient start" value={draft.color}  onChange={(v) => setDraft(d => ({...d, color: v}))}  font={font} />
          <ColorRow label="Gradient end"   value={draft.color2} onChange={(v) => setDraft(d => ({...d, color2: v}))} font={font} />
          <ToggleRow label={isRTL ? 'نشط' : 'Active'} value={draft.active} onChange={(v) => setDraft(d => ({...d, active: v}))} font={font} />
        </ScrollView>
      </View>
    </Modal>
  );
}
const om = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F2FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0DCF0', backgroundColor: '#FFF' },
  closeBtn: { padding: 4, width: 60 },
  title: { fontSize: 17, color: '#2D1B69', flex: 1, textAlign: 'center' },
  saveBtn: { width: 60, alignItems: 'flex-end' },
  saveTxt: { fontSize: 15, color: '#5B2C91' },
  fLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  fInput: { borderWidth: 1.5, borderColor: '#E0DCF0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FFF' },
  preview: { borderRadius: 16, padding: 20, marginBottom: 24, minHeight: 90, justifyContent: 'flex-end' },
  prevTitle: { fontSize: 17, color: '#FFF', marginBottom: 4 },
  prevSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 4 },
});

// ── Plan editor modal ─────────────────────────────────────────────────────────
const EMPTY_PLAN: AppPlan = {
  id: '', nameEn: '', nameAr: '', subtitleEn: '', subtitleAr: '',
  price: '', color1: '#2D1B69', color2: '#C21875', popular: false, active: true,
  benefitsEn: [], benefitsAr: [],
};

function PlanModal({ visible, initial, onSave, onClose, font, isRTL }: {
  visible: boolean; initial: AppPlan | null;
  onSave: (p: AppPlan) => void; onClose: () => void; font: any; isRTL: boolean;
}) {
  const [draft, setDraft] = useState<AppPlan>(initial ?? EMPTY_PLAN);
  React.useEffect(() => { setDraft(initial ?? { ...EMPTY_PLAN }); }, [initial, visible]);

  const [benefitsEnText, setBenefitsEnText] = useState(draft.benefitsEn.join('\n'));
  const [benefitsArText, setBenefitsArText] = useState(draft.benefitsAr.join('\n'));
  React.useEffect(() => {
    setBenefitsEnText((initial ?? EMPTY_PLAN).benefitsEn.join('\n'));
    setBenefitsArText((initial ?? EMPTY_PLAN).benefitsAr.join('\n'));
  }, [initial, visible]);

  const c1 = isValidHex(draft.color1) ? draft.color1 : '#2D1B69';
  const c2 = isValidHex(draft.color2) ? draft.color2 : '#C21875';
  const isNew = !initial;
  const canSave = !!draft.nameEn && !!draft.nameAr && !!draft.price && (isNew ? !!draft.id : true);

  function commit() {
    onSave({
      ...draft,
      benefitsEn: benefitsEnText.split('\n').map(s => s.trim()).filter(Boolean),
      benefitsAr: benefitsArText.split('\n').map(s => s.trim()).filter(Boolean),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[om.root, { paddingBottom: 24 }]}>
        <View style={om.header}>
          <TouchableOpacity onPress={onClose} style={om.closeBtn}><Ionicons name="close" size={22} color="#5B2C91" /></TouchableOpacity>
          <Text style={[om.title, { fontFamily: font.bold }]}>{isNew ? (isRTL ? 'إضافة باقة' : 'New Package') : (isRTL ? 'تعديل الباقة' : 'Edit Package')}</Text>
          <TouchableOpacity style={[om.saveBtn, !canSave && { opacity: 0.4 }]} onPress={commit} disabled={!canSave}>
            <Text style={[om.saveTxt, { fontFamily: font.bold }]}>{isRTL ? 'حفظ' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {/* Preview */}
          <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={om.preview}>
            <Text style={[om.prevTitle, { fontFamily: font.bold }]}>{(isRTL ? draft.nameAr : draft.nameEn) || (isRTL ? 'اسم الباقة' : 'Package name')}</Text>
            <Text style={[om.prevSub, { fontFamily: font.regular }]}>{draft.price ? `${draft.price} SAR / year` : (isRTL ? 'السعر' : 'Price')}</Text>
          </LinearGradient>

          {isNew && <Field label="ID (unique, e.g. premium)" value={draft.id} onChange={(v) => setDraft(d => ({...d, id: v.toLowerCase().replace(/\s+/g, '-')}))} font={font} />}
          <Field label="Name (English)"    value={draft.nameEn}    onChange={(v) => setDraft(d => ({...d, nameEn: v}))}    font={font} />
          <Field label="Name (Arabic)"     value={draft.nameAr}    onChange={(v) => setDraft(d => ({...d, nameAr: v}))}    font={font} rtl />
          <Field label="Subtitle (English)" value={draft.subtitleEn} onChange={(v) => setDraft(d => ({...d, subtitleEn: v}))} font={font} />
          <Field label="Subtitle (Arabic)"  value={draft.subtitleAr} onChange={(v) => setDraft(d => ({...d, subtitleAr: v}))} font={font} rtl />
          <Field label="Price (SAR/year)"  value={draft.price}     onChange={(v) => setDraft(d => ({...d, price: v}))}     font={font} phone />
          <ColorRow label="Gradient start" value={draft.color1} onChange={(v) => setDraft(d => ({...d, color1: v}))} font={font} />
          <ColorRow label="Gradient end"   value={draft.color2} onChange={(v) => setDraft(d => ({...d, color2: v}))} font={font} />
          <ToggleRow label={isRTL ? 'الأكثر شيوعاً' : 'Popular badge'} value={draft.popular} onChange={(v) => setDraft(d => ({...d, popular: v}))} font={font} />
          <ToggleRow label={isRTL ? 'نشط'            : 'Active'}       value={draft.active}  onChange={(v) => setDraft(d => ({...d, active: v}))}  font={font} />

          <Text style={[pm.areaLabel, { fontFamily: font.medium }]}>Benefits (English) — one per line</Text>
          <TextInput style={[pm.area, { fontFamily: font.regular }]} multiline value={benefitsEnText}
            onChangeText={setBenefitsEnText} placeholder="Battery charge — 6 times&#10;Fuel supply — 6 times" placeholderTextColor="#AAA" />

          <Text style={[pm.areaLabel, { fontFamily: font.medium }]}>Benefits (Arabic) — one per line</Text>
          <TextInput style={[pm.area, { fontFamily: font.regular, textAlign: 'right' }]} multiline value={benefitsArText}
            onChangeText={setBenefitsArText} placeholder="شحن البطارية — 6 مرات" placeholderTextColor="#AAA" />
        </ScrollView>
      </View>
    </Modal>
  );
}
const pm = StyleSheet.create({
  areaLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  area: { borderWidth: 1.5, borderColor: '#E0DCF0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', backgroundColor: '#FFF', minHeight: 100, marginBottom: 16, textAlignVertical: 'top' },
  ribbon: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  ribbonTxt: { fontSize: 11, color: '#FFD700' },
});
const pm2 = pm;

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminPanelScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { theme, offers, announcement, hiddenServices, contact, plans, isAdmin, logout,
          updateTheme, updateOffers, updateAnnouncement, updateServiceConfig, updateContact, updatePlans } = useAdminConfig();
  const { isRTL, font } = useLanguage();

  const [tab,              setTab]              = useState<Tab>('theme');
  const [saving,           setSaving]           = useState(false);
  const [localTheme,       setLocalTheme]       = useState<AppTheme>({ ...theme });
  const [localOffers,      setLocalOffers]      = useState<AppOffer[]>([...offers]);
  const [editOffer,        setEditOffer]        = useState<AppOffer | null>(null);
  const [modalOpen,        setModalOpen]        = useState(false);
  const [localAnnounce,    setLocalAnnounce]    = useState<AppAnnouncement>({ ...announcement });
  const [localHidden,      setLocalHidden]      = useState<string[]>([...hiddenServices]);
  const [localContact,     setLocalContact]     = useState<AppContactConfig>({ ...contact });
  const [localPlans,       setLocalPlans]       = useState<AppPlan[]>([...plans]);
  const [editPlan,         setEditPlan]         = useState<AppPlan | null>(null);
  const [planModalOpen,    setPlanModalOpen]    = useState(false);

  React.useEffect(() => { setLocalTheme({ ...theme });       }, [theme]);
  React.useEffect(() => { setLocalOffers([...offers]);       }, [offers]);
  React.useEffect(() => { setLocalAnnounce({ ...announcement }); }, [announcement]);
  React.useEffect(() => { setLocalHidden([...hiddenServices]); }, [hiddenServices]);
  React.useEffect(() => { setLocalContact({ ...contact });   }, [contact]);
  React.useEffect(() => { setLocalPlans([...plans]);         }, [plans]);

  if (!isAdmin) { router.replace('/admin-login' as any); return null; }

  // ── Generic save helper ────────────────────────────────────────────────────
  async function doSave(fn: () => Promise<void>, successMsg: string) {
    setSaving(true);
    try {
      await fn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(isRTL ? 'تم الحفظ' : 'Saved', isRTL ? successMsg.replace(/saved/i, 'تم الحفظ') : successMsg);
    } catch (e) {
      Alert.alert(isRTL ? 'خطأ' : 'Error', (e as Error).message);
    } finally { setSaving(false); }
  }

  // ── Offer helpers ─────────────────────────────────────────────────────────
  async function persistOffers(next: AppOffer[]) {
    setLocalOffers(next);
    setSaving(true);
    try { await updateOffers(next); }
    catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  }

  function handleSaveOffer(offer: AppOffer) {
    const exists = localOffers.some((o) => o.id === offer.id);
    const next = exists ? localOffers.map((o) => o.id === offer.id ? offer : o) : [...localOffers, offer];
    setModalOpen(false); setEditOffer(null);
    persistOffers(next);
  }

  function handleDeleteOffer(id: string) {
    persistOffers(localOffers.filter(o => o.id !== id));
  }

  // ── Plan helpers ──────────────────────────────────────────────────────────
  async function persistPlans(next: AppPlan[]) {
    setLocalPlans(next);
    setSaving(true);
    try { await updatePlans(next); }
    catch (e) { Alert.alert('Error', (e as Error).message); }
    finally { setSaving(false); }
  }

  function handleSavePlan(plan: AppPlan) {
    const exists = localPlans.some((p) => p.id === plan.id);
    const next = exists ? localPlans.map((p) => p.id === plan.id ? plan : p) : [...localPlans, plan];
    setPlanModalOpen(false); setEditPlan(null);
    persistPlans(next);
  }

  function handleDeletePlan(id: string) {
    persistPlans(localPlans.filter(p => p.id !== id));
  }

  // ── Service toggle ────────────────────────────────────────────────────────
  async function toggleService(id: string, visible: boolean) {
    const next = visible ? localHidden.filter(h => h !== id) : [...localHidden, id];
    setLocalHidden(next);
    try { await updateServiceConfig({ hidden: next }); }
    catch (e) { Alert.alert('Error', (e as Error).message); }
  }

  // ── Tab label ─────────────────────────────────────────────────────────────
  function tabLabel(t: Tab) {
    const labels: Record<Tab, [string, string]> = {
      theme:    ['Theme',    'الألوان'],
      offers:   ['Offers',   'العروض'],
      announce: ['Announce', 'إعلان'],
      services: ['Services', 'الخدمات'],
      contact:  ['Contact',  'التواصل'],
      packages: ['Packages', 'الباقات'],
    };
    return isRTL ? labels[t][1] : labels[t][0];
  }

  const gradPreview: [string, string, string] = [
    isValidHex(localTheme.gradientStart) ? localTheme.gradientStart : '#2D1B69',
    isValidHex(localTheme.gradientMid)   ? localTheme.gradientMid   : '#5B2C91',
    isValidHex(localTheme.gradientEnd)   ? localTheme.gradientEnd   : '#C21875',
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.topBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#2D1B69" />
        </TouchableOpacity>
        <Text style={[s.topTitle, { fontFamily: font.bold }]}>{isRTL ? 'لوحة التحكم' : 'Admin Panel'}</Text>
        <TouchableOpacity style={s.topBtn} onPress={async () => {
          await logout();
          router.replace('/(tabs)/' as any);
        }}>
          <Ionicons name="log-out-outline" size={22} color="#C21875" />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable tab bar ────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabBar}>
        {(['theme','offers','announce','services','contact','packages'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, { fontFamily: font.semibold }, tab === t && s.tabTxtActive]}>{tabLabel(t)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* ═══ THEME ═══════════════════════════════════════════════════════ */}
        {tab === 'theme' && (
          <>
            <LinearGradient colors={gradPreview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.gradPreview}>
              <Text style={[s.gradPreviewTxt, { fontFamily: font.bold }]}>{isRTL ? 'معاينة التدرج' : 'Gradient preview'}</Text>
            </LinearGradient>
            <Text style={[s.sectionHeading, { fontFamily: font.bold }]}>{isRTL ? 'ألوان التدرج' : 'Gradient colours'}</Text>
            <ColorRow label={isRTL ? 'بداية التدرج' : 'Gradient start'} value={localTheme.gradientStart} onChange={(v) => setLocalTheme(t => ({...t, gradientStart: v}))} font={font} />
            <ColorRow label={isRTL ? 'وسط التدرج'   : 'Gradient mid'}   value={localTheme.gradientMid}   onChange={(v) => setLocalTheme(t => ({...t, gradientMid:   v}))} font={font} />
            <ColorRow label={isRTL ? 'نهاية التدرج' : 'Gradient end'}   value={localTheme.gradientEnd}   onChange={(v) => setLocalTheme(t => ({...t, gradientEnd:   v}))} font={font} />
            <Text style={[s.sectionHeading, { fontFamily: font.bold }]}>{isRTL ? 'الألوان الرئيسية' : 'Brand colours'}</Text>
            <ColorRow label={isRTL ? 'اللون الأساسي' : 'Primary'}   value={localTheme.primary}   onChange={(v) => setLocalTheme(t => ({...t, primary:   v}))} font={font} />
            <ColorRow label={isRTL ? 'اللون الثانوي' : 'Secondary'} value={localTheme.secondary} onChange={(v) => setLocalTheme(t => ({...t, secondary: v}))} font={font} />
            <SaveBtn saving={saving} label={isRTL ? 'حفظ الألوان' : 'Save Theme'} font={font}
              onPress={() => doSave(() => updateTheme(localTheme), 'Theme updated.')} />
          </>
        )}

        {/* ═══ OFFERS ══════════════════════════════════════════════════════ */}
        {tab === 'offers' && (
          <>
            {localOffers.length === 0 && (
              <View style={s.emptyBox}>
                <Ionicons name="pricetag-outline" size={36} color="#C8C4DC" />
                <Text style={[s.emptyTxt, { fontFamily: font.regular }]}>{isRTL ? 'لا توجد عروض بعد' : 'No offers yet'}</Text>
              </View>
            )}
            {localOffers.map((offer) => (
              <View key={offer.id} style={s.offerRow}>
                <LinearGradient colors={[isValidHex(offer.color) ? offer.color : '#2D1B69', isValidHex(offer.color2) ? offer.color2 : '#C21875']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.offerPreview}>
                  <Text style={[s.offerPreviewTitle, { fontFamily: font.bold }]} numberOfLines={1}>{isRTL ? offer.titleAr : offer.titleEn}</Text>
                  <Text style={[s.offerPreviewSub,   { fontFamily: font.regular }]} numberOfLines={1}>{isRTL ? offer.subtitleAr : offer.subtitleEn}</Text>
                </LinearGradient>
                <View style={s.offerActions}>
                  <Switch value={offer.active} onValueChange={(v) => persistOffers(localOffers.map(o => o.id === offer.id ? {...o, active: v} : o))}
                    trackColor={{ false: '#E0DCF0', true: '#5B2C91' }} thumbColor="#FFF" style={{ transform: [{ scale: 0.85 }] }} />
                  <TouchableOpacity style={s.offerActionBtn} onPress={() => { setEditOffer(offer); setModalOpen(true); }}>
                    <Ionicons name="pencil" size={16} color="#5B2C91" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.offerActionBtn} onPress={() => handleDeleteOffer(offer.id)}>
                    <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addBtn} onPress={() => { setEditOffer(null); setModalOpen(true); }}>
              <Ionicons name="add-circle-outline" size={20} color="#5B2C91" />
              <Text style={[s.addTxt, { fontFamily: font.semibold }]}>{isRTL ? 'إضافة عرض جديد' : 'Add Offer'}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ═══ ANNOUNCEMENT ════════════════════════════════════════════════ */}
        {tab === 'announce' && (
          <>
            {/* Preview */}
            {localAnnounce.titleEn ? (
              <View style={[s.announcePrev, { backgroundColor: isValidHex(localAnnounce.color) ? localAnnounce.color : '#2D1B69' }]}>
                <Text style={[s.announcePrevTxt, { color: isValidHex(localAnnounce.textColor) ? localAnnounce.textColor : '#FFF', fontFamily: font.semibold }]} numberOfLines={2}>
                  {isRTL ? localAnnounce.titleAr : localAnnounce.titleEn}
                </Text>
                <Ionicons name="close-circle" size={18} color={isValidHex(localAnnounce.textColor) ? localAnnounce.textColor : '#FFF'} />
              </View>
            ) : (
              <View style={s.emptyBox}>
                <Ionicons name="megaphone-outline" size={36} color="#C8C4DC" />
                <Text style={[s.emptyTxt, { fontFamily: font.regular }]}>{isRTL ? 'لا يوجد إعلان نشط' : 'No active announcement'}</Text>
              </View>
            )}
            <ToggleRow label={isRTL ? 'إظهار الإعلان' : 'Show banner'} value={localAnnounce.active} onChange={(v) => setLocalAnnounce(a => ({...a, active: v}))} font={font} />
            <Field label="Message (English)" value={localAnnounce.titleEn} onChange={(v) => setLocalAnnounce(a => ({...a, titleEn: v}))} font={font} />
            <Field label="Message (Arabic)"  value={localAnnounce.titleAr} onChange={(v) => setLocalAnnounce(a => ({...a, titleAr: v}))} font={font} rtl />
            <ColorRow label={isRTL ? 'لون الخلفية' : 'Background colour'} value={localAnnounce.color}     onChange={(v) => setLocalAnnounce(a => ({...a, color:     v}))} font={font} />
            <ColorRow label={isRTL ? 'لون النص'    : 'Text colour'}       value={localAnnounce.textColor} onChange={(v) => setLocalAnnounce(a => ({...a, textColor: v}))} font={font} />
            <SaveBtn saving={saving} label={isRTL ? 'حفظ الإعلان' : 'Save Announcement'} font={font}
              onPress={() => doSave(() => updateAnnouncement(localAnnounce), 'Announcement updated.')} />
          </>
        )}

        {/* ═══ SERVICES ════════════════════════════════════════════════════ */}
        {tab === 'services' && (
          <>
            <Text style={[s.tipTxt, { fontFamily: font.regular }]}>
              {isRTL ? 'اختر الخدمات التي تظهر في التطبيق.' : 'Choose which services appear on the home screen. Changes apply immediately.'}
            </Text>
            {PANEL_SERVICES.map((svc) => (
              <View key={svc.id} style={s.svcRow}>
                <Text style={[s.svcLabel, { fontFamily: font.medium }]}>{isRTL ? svc.labelAr : svc.labelEn}</Text>
                <Switch
                  value={!localHidden.includes(svc.id)}
                  onValueChange={(visible) => toggleService(svc.id, visible)}
                  trackColor={{ false: '#E0DCF0', true: '#5B2C91' }} thumbColor="#FFF"
                />
              </View>
            ))}
          </>
        )}

        {/* ═══ CONTACT ═════════════════════════════════════════════════════ */}
        {tab === 'contact' && (
          <>
            <Text style={[s.tipTxt, { fontFamily: font.regular }]}>
              {isRTL
                ? 'أرقام الاتصال المستخدمة في زر الاتصال والدعم عبر واتساب. أدخل الأرقام بدون + (مثال: 966555616449).'
                : 'Phone numbers used for the Call Center button and WhatsApp support. Digits only, no + (e.g. 966555616449).'}
            </Text>
            <Field label={isRTL ? 'رقم الهاتف'   : 'Phone number'}    value={localContact.phone}    onChange={(v) => setLocalContact(c => ({...c, phone: v}))}    font={font} phone />
            <Field label={isRTL ? 'رقم واتساب'   : 'WhatsApp number'} value={localContact.whatsapp} onChange={(v) => setLocalContact(c => ({...c, whatsapp: v}))} font={font} phone />
            <SaveBtn saving={saving} label={isRTL ? 'حفظ معلومات التواصل' : 'Save Contact Info'} font={font}
              onPress={() => doSave(() => updateContact(localContact), 'Contact info updated.')} />
          </>
        )}

        {/* ═══ PACKAGES ════════════════════════════════════════════════════ */}
        {tab === 'packages' && (
          <>
            {localPlans.map((plan) => (
              <View key={plan.id} style={s.offerRow}>
                <LinearGradient
                  colors={[isValidHex(plan.color1) ? plan.color1 : '#2D1B69', isValidHex(plan.color2) ? plan.color2 : '#C21875']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.offerPreview}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[s.offerPreviewTitle, { fontFamily: font.bold, flex: 1 }]} numberOfLines={1}>
                      {isRTL ? plan.nameAr : plan.nameEn}
                    </Text>
                    {plan.popular && (
                      <View style={pm2.ribbon}>
                        <Text style={[pm2.ribbonTxt, { fontFamily: font.bold }]}>★</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.offerPreviewSub, { fontFamily: font.regular }]}>{plan.price} SAR / year</Text>
                </LinearGradient>
                <View style={s.offerActions}>
                  <Switch value={plan.active}
                    onValueChange={(v) => persistPlans(localPlans.map(p => p.id === plan.id ? {...p, active: v} : p))}
                    trackColor={{ false: '#E0DCF0', true: '#5B2C91' }} thumbColor="#FFF" style={{ transform: [{ scale: 0.85 }] }} />
                  <TouchableOpacity style={s.offerActionBtn} onPress={() => { setEditPlan(plan); setPlanModalOpen(true); }}>
                    <Ionicons name="pencil" size={16} color="#5B2C91" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.offerActionBtn} onPress={() => handleDeletePlan(plan.id)}>
                    <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addBtn} onPress={() => { setEditPlan(null); setPlanModalOpen(true); }}>
              <Ionicons name="add-circle-outline" size={20} color="#5B2C91" />
              <Text style={[s.addTxt, { fontFamily: font.semibold }]}>{isRTL ? 'إضافة باقة جديدة' : 'Add Package'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <OfferModal visible={modalOpen} initial={editOffer} onSave={handleSaveOffer}
        onClose={() => { setModalOpen(false); setEditOffer(null); }} font={font} isRTL={isRTL} />

      <PlanModal visible={planModalOpen} initial={editPlan} onSave={handleSavePlan}
        onClose={() => { setPlanModalOpen(false); setEditPlan(null); }} font={font} isRTL={isRTL} />
    </View>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────
function SaveBtn({ saving, label, onPress, font }: { saving: boolean; label: string; onPress: () => void; font: any }) {
  return (
    <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={onPress} disabled={saving}>
      {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={[s.saveTxt, { fontFamily: font.bold }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F4F2FA' },
  topBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0DCF0' },
  topBtn:  { padding: 4, width: 36 },
  topTitle: { fontSize: 18, color: '#2D1B69', flex: 1, textAlign: 'center' },
  tabScroll: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0DCF0', maxHeight: 48 },
  tabBar:   { flexDirection: 'row', paddingHorizontal: 4 },
  tabBtn:   { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#2D1B69' },
  tabTxt:   { fontSize: 13, color: '#9E9AB0' },
  tabTxtActive: { color: '#2D1B69' },
  content:  { padding: 20, paddingBottom: 60 },
  gradPreview: { height: 72, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  gradPreviewTxt: { color: '#FFF', fontSize: 14 },
  sectionHeading: { fontSize: 15, color: '#2D1B69', marginBottom: 16, marginTop: 8 },
  saveBtn: { backgroundColor: '#2D1B69', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#2D1B69', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  saveTxt: { color: '#FFF', fontSize: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTxt: { color: '#9E9AB0', fontSize: 14 },
  offerRow: { marginBottom: 12 },
  offerPreview: { borderRadius: 14, padding: 16, marginBottom: 8, minHeight: 72, justifyContent: 'flex-end' },
  offerPreviewTitle: { color: '#FFF', fontSize: 15 },
  offerPreviewSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  offerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  offerActionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0DCF0' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', borderWidth: 1.5, borderColor: '#5B2C91', borderRadius: 14, paddingVertical: 14, borderStyle: 'dashed', marginTop: 12 },
  addTxt: { color: '#5B2C91', fontSize: 15 },
  announcePrev: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, gap: 12 },
  announcePrevTxt: { flex: 1, fontSize: 14, lineHeight: 20 },
  tipTxt: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 19 },
  svcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EEF8' },
  svcLabel: { fontSize: 15, color: '#1A1A1A', flex: 1 },
});
