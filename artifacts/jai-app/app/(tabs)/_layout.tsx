import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import * as Haptics from 'expo-haptics';

// ─── iOS 26+ Liquid Glass ───────────────────────────────────────────────────
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"><Icon sf={{ default: 'house', selected: 'house.fill' }} /><Label>Home</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="requests"><Icon sf={{ default: 'list.bullet', selected: 'list.bullet.fill' }} /><Label>Requests</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="membership"><Icon sf={{ default: 'star', selected: 'star.fill' }} /><Label>VIP</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications"><Icon sf={{ default: 'bell', selected: 'bell.fill' }} /><Label>Alerts</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile"><Icon sf={{ default: 'person', selected: 'person.fill' }} /><Label>Profile</Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Tab metadata ────────────────────────────────────────────────────────────
const TAB_META = {
  index:         { iconDefault: 'home-outline',         iconActive: 'home',          labelEn: 'Home',     labelAr: 'الرئيسية' },
  requests:      { iconDefault: 'list-outline',          iconActive: 'list',          labelEn: 'Requests', labelAr: 'طلباتي'   },
  membership:    { iconDefault: 'star-outline',          iconActive: 'star',          labelEn: 'VIP',      labelAr: 'عضوية'    },
  notifications: { iconDefault: 'notifications-outline', iconActive: 'notifications', labelEn: 'Alerts',   labelAr: 'إشعارات'  },
  profile:       { iconDefault: 'person-outline',        iconActive: 'person',        labelEn: 'Profile',  labelAr: 'حسابي'    },
} as const;

const BADGE: Record<string, number> = { notifications: 2 };

// ─── Floating Pill Tab Bar (no absoluteFillObject inside tabs) ───────────────
function FloatingTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const { lang } = useLanguage();

  return (
    <View
      style={[
        styles.barWrapper,
        { bottom: insets.bottom + 16 + (Platform.OS === 'web' ? 34 : 0) },
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={['#140C30', '#2D1B69']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name as keyof typeof TAB_META];
          if (!meta) return null;
          const label = lang === 'ar' ? meta.labelAr : meta.labelEn;
          const badge = BADGE[route.name];
          const labelFont = lang === 'ar' ? 'Cairo_600SemiBold' : 'Inter_600SemiBold';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                if (!focused) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.8}
              style={styles.tabOuter}
            >
              {focused ? (
                /* Active: LinearGradient IS the container, no absolute children */
                <LinearGradient
                  colors={['#C21875', '#8B35BB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.tabInner, { paddingHorizontal: 18 }]}
                >
                  <Ionicons name={meta.iconActive as any} size={21} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                /* Inactive: plain View, badge inline */
                <View style={styles.tabInner}>
                  <Ionicons name={meta.iconDefault as any} size={21} color="rgba(255,255,255,0.38)" />
                  {!!badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

// ─── Classic layout (Android / older iOS / web) ──────────────────────────────
function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <FloatingTabBar state={props.state} navigation={props.navigation} />
      )}
    >
      <Tabs.Screen name="index"         options={{ title: 'Home'     }} />
      <Tabs.Screen name="requests"      options={{ title: 'Requests' }} />
      <Tabs.Screen name="membership"    options={{ title: 'VIP'      }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts'   }} />
      <Tabs.Screen name="profile"       options={{ title: 'Profile'  }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  // ── Floating pill container ──────────────────────────────────────────────
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
    shadowColor: '#2D1B69',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
  },

  // ── Each tab slot ────────────────────────────────────────────────────────
  tabOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  /** Shared inner shape — gradient or plain view sits here */
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 36,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxWidth: '100%',
  },
  activeLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    flexShrink: 1,
  },

  // ── Badge ────────────────────────────────────────────────────────────────
  badge: {
    backgroundColor: '#C21875',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
});
