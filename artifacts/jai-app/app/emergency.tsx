import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

// ── Scenario definitions ──────────────────────────────────────────────────────
type Scenario = {
  id: string;
  service: string;               // maps to /request/[service]
  icon: string;
  lib: 'Ion' | 'MCI';
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  color: string;
  bg: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'wont_start',
    service: 'battery',
    icon: 'battery-dead-outline',
    lib: 'Ion',
    labelEn: "Car won't start",
    labelAr: 'السيارة لا تدور',
    descEn: 'Battery dead or not cranking',
    descAr: 'البطارية فارغة أو المحرك لا يستجيب',
    color: '#2D1B69',
    bg: '#EDE8F8',
  },
  {
    id: 'flat_tire',
    service: 'tire',
    icon: 'tire',
    lib: 'MCI',
    labelEn: 'Flat tyre',
    labelAr: 'إطار مثقوب',
    descEn: 'One or more tyres are flat',
    descAr: 'إطار واحد أو أكثر مسطح',
    color: '#5B2C91',
    bg: '#F0EBF9',
  },
  {
    id: 'no_fuel',
    service: 'fuel',
    icon: 'gas-station',
    lib: 'MCI',
    labelEn: 'Out of fuel',
    labelAr: 'نفذ الوقود',
    descEn: 'Tank is empty — need fuel delivery',
    descAr: 'الخزان فارغ — أحتاج توصيل وقود',
    color: '#7B2A9E',
    bg: '#F3E8FC',
  },
  {
    id: 'accident',
    service: 'tow',
    icon: 'car-crash',
    lib: 'MCI',
    labelEn: 'Accident',
    labelAr: 'حادث',
    descEn: 'Car involved in a collision',
    descAr: 'السيارة تعرضت لحادث',
    color: '#C21875',
    bg: '#FCE8F3',
  },
  {
    id: 'breakdown',
    service: 'tow',
    icon: 'tow-truck',
    lib: 'MCI',
    labelEn: 'Breakdown — need tow',
    labelAr: 'عطل — أحتاج قاطرة',
    descEn: 'Car broke down and cannot move',
    descAr: 'تعطلت السيارة ولا تتحرك',
    color: '#9B1560',
    bg: '#FBDDF0',
  },
  {
    id: 'lockout',
    service: 'lockout',
    icon: 'key-outline',
    lib: 'Ion',
    labelEn: 'Locked out',
    labelAr: 'مقفول خارج السيارة',
    descEn: 'Keys locked inside the car',
    descAr: 'المفاتيح داخل السيارة والباب مقفل',
    color: '#2D1B69',
    bg: '#EDE8F8',
  },
  {
    id: 'mechanical',
    service: 'mechanic',
    icon: 'wrench',
    lib: 'MCI',
    labelEn: 'Mechanical problem',
    labelAr: 'مشكلة ميكانيكية',
    descEn: 'Engine or mechanical issue',
    descAr: 'عطل في المحرك أو الميكانيك',
    color: '#5B2C91',
    bg: '#F0EBF9',
  },
  {
    id: 'electrical',
    service: 'electric',
    icon: 'flash-outline',
    lib: 'Ion',
    labelEn: 'Electrical fault',
    labelAr: 'مشكلة كهربائية',
    descEn: 'Lights, fuses, or wiring issues',
    descAr: 'مشكلة في الأنوار أو الفيوزات أو الأسلاك',
    color: '#C21875',
    bg: '#FCE8F3',
  },
];

function ScenarioIcon({ icon, lib, color }: { icon: string; lib: 'Ion' | 'MCI'; color: string }) {
  if (lib === 'Ion') return <Ionicons name={icon as any} size={30} color={color} />;
  return <MaterialCommunityIcons name={icon as any} size={30} color={color} />;
}

export default function EmergencyTriageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRTL, font } = useLanguage();
  const align = isRTL ? 'right' : 'left';
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const [selected, setSelected] = useState<string | null>(null);

  function choose(scenario: Scenario) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(scenario.id);
    // Brief visual feedback then navigate
    setTimeout(() => {
      router.replace(`/request/${scenario.service}` as any);
    }, 180);
  }

  return (
    <View style={styles.root}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#6B0020', '#B01050', '#C21875']}
        locations={[0, 0.55, 1]}
        style={[styles.header, {
          paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0),
        }]}
      >
        {/* Back */}
        <TouchableOpacity
          style={[styles.backBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Icon + title */}
        <View style={styles.headerIconWrap}>
          <Ionicons name="warning" size={28} color="#FFFFFF" />
        </View>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isRTL ? 'ما نوع الطارئ؟' : "What's the emergency?"}
        </Text>
        <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
          {isRTL
            ? 'اختر ما يصف وضعك بدقة — سنرسل لك الفريق المناسب'
            : "Select what best describes your situation \u2014 we'll send the right team"}
        </Text>
      </LinearGradient>

      {/* ── Scenario grid ────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 40 + (Platform.OS === 'web' ? 34 : 0) },
        ]}
      >
        {SCENARIOS.map((sc) => {
          const isActive = selected === sc.id;
          return (
            <TouchableOpacity
              key={sc.id}
              style={[
                styles.card,
                { flexDirection: rowDir },
                isActive && styles.cardActive,
              ]}
              activeOpacity={0.82}
              onPress={() => choose(sc)}
            >
              {/* Icon bubble */}
              <View style={[styles.iconBubble, { backgroundColor: isActive ? sc.color : sc.bg }]}>
                <ScenarioIcon
                  icon={sc.icon}
                  lib={sc.lib}
                  color={isActive ? '#FFFFFF' : sc.color}
                />
              </View>

              {/* Text */}
              <View style={styles.cardBody}>
                <Text style={[styles.cardLabel, { fontFamily: font.bold, textAlign: align, color: isActive ? sc.color : '#1A1A1A' }]}>
                  {isRTL ? sc.labelAr : sc.labelEn}
                </Text>
                <Text style={[styles.cardDesc, { fontFamily: font.regular, textAlign: align }]}>
                  {isRTL ? sc.descAr : sc.descEn}
                </Text>
              </View>

              {/* Arrow */}
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={isActive ? sc.color : '#C0C0D0'}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FC' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#B01050',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  backBtn: { width: '100%', paddingBottom: 4 },
  headerIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 24, color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 19, paddingHorizontal: 10 },

  grid: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#C21875',
    backgroundColor: '#FFF7FB',
  },

  iconBubble: {
    width: 58, height: 58, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 3 },
  cardLabel: { fontSize: 16, lineHeight: 22 },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
});
