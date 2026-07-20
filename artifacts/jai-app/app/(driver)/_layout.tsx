import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useDriverColors } from '@/hooks/useDriverColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver } from '@/context/DriverContext';

function NativeTabLayout() {
  const { t } = useLanguage();
  useDriver(); // ensure context
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

function ClassicTabLayout() {
  const colors = useDriverColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const { t } = useLanguage();
  const { activeJob } = useDriver();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('driverTabRequests'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={24} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: t('driverTabActive'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bolt.badge.a" tintColor={color} size={24} />
            ) : (
              <Feather name="zap" size={22} color={color} />
            ),
          tabBarBadge: activeJob ? '' : undefined,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t('driverTabEarnings'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="creditcard" tintColor={color} size={24} />
            ) : (
              <Feather name="credit-card" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('driverTabProfile'),
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function DriverTabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
