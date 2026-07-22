/**
 * Native version — shows address + opens the native maps app.
 * Metro picks MapCard.web.tsx on web, this file on iOS/Android.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  latitude: number;
  longitude: number;
  address: string;
}

export default function MapCard({ latitude, longitude, address }: Props) {
  const colors = useColors();
  const { font, isRTL, t } = useLanguage();

  const openMaps = () => {
    const googleUrl = `https://maps.google.com/?daddr=${latitude},${longitude}`;
    const iosUrl = `maps://app?daddr=${latitude},${longitude}`;
    const androidUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;

    // Try native scheme first, fall back to Google Maps browser
    const nativeUrl = Platform.OS === 'ios' ? iosUrl : androidUrl;
    Linking.openURL(nativeUrl).catch(() => Linking.openURL(googleUrl));
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={openMaps}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="navigate" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.tapLabel, { color: colors.primary, fontFamily: font.semibold }]}>
            {t('navigate')}
          </Text>
          <Text
            style={[styles.address, { color: colors.mutedForeground, fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
            numberOfLines={2}
          >
            {address}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  row: { alignItems: 'center' },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapLabel: { fontSize: 15, marginBottom: 2 },
  address: { fontSize: 13, lineHeight: 18 },
});
