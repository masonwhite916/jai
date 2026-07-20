import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Feather } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';
import * as Haptics from 'expo-haptics';

// ─── iOS 26+ Liquid Glass ────────────────────────────────────────────────────
function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} />
        <Label>{t('driverTabRequests')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="active">
        <Icon sf={{ default: 'bolt.badge.a', selected: 'bolt.badge.a.fill' }} />
        <Label>{t('driverTabActive')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earnings">
        <Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <Label>{t('driverTabEarnings')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>{t('driverTabProfile')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',    icon: 'list' as const,        sf: 'list.bullet',  labelKey: 'driverTabRequests' },
  { name: 'active',   icon: 'zap' as const,         sf: 'bolt.badge.a', labelKey: 'driverTabActive' },
  { name: 'earnings', icon: 'credit-card' as const, sf: 'creditcard',   labelKey: 'driverTabEarnings' },
  { name: 'profile',  icon: 'user' as const,        sf: 'person',       labelKey: 'driverTabProfile' },
] as const;

// ─── Custom dark floating tab bar ─────────────────────────────────────────────
function DriverTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const colors = useDriverColors();
  const { t } = useLanguage();
  const { activeJob } = useDriver();
  const isIOS = Platform.OS === 'ios';

  return (
    <View
      style={[
        styles.barWrapper,
        { bottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: '#1A1726', borderColor: 'rgba(255,255,255,0.08)' }]}>
        {TABS.map((tab, index) => {
          const focused = state.index === index;
          const hasAlert = tab.name === 'active' && !!activeJob;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                if (!focused) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  navigation.navigate(tab.name);
                }
              }}
              activeOpacity={0.8}
              style={styles.tabOuter}
            >
              <View style={[
                styles.tabInner,
                focused && { backgroundColor: 'rgba(194,24,117,0.25)', borderRadius: 36 },
              ]}>
                {isIOS ? (
                  <SymbolView
                    name={focused ? `${tab.sf}.fill` as any : tab.sf as any}
                    tintColor={focused ? '#C21875' : 'rgba(255,255,255,0.38)'}
                    size={22}
                  />
                ) : (
                  <Feather
                    name={tab.icon}
                    size={22}
                    color={focused ? '#C21875' : 'rgba(255,255,255,0.38)'}
                  />
                )}
                {hasAlert && <View style={styles.alertDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Classic layout ───────────────────────────────────────────────────────────
function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <DriverTabBar state={props.state} navigation={props.navigation} />
      )}
    >
      <Tabs.Screen name="index"    options={{ title: 'Requests' }} />
      <Tabs.Screen name="active"   options={{ title: 'Active' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}

export default function DriverTabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  barWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    borderRadius: 44,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
  },
  tabOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    position: 'relative',
  },
  alertDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C21875',
  },
});
