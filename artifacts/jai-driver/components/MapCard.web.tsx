/**
 * Web version of the map card.
 * Uses a static OpenStreetMap image (plain <img> tag — no nested iframes)
 * plus a native <a> anchor that opens Google Maps in a new tab.
 * Metro picks this file on web; MapCard.tsx is used on native.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
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
  const { font, isRTL } = useLanguage();

  const staticMapUrl =
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${latitude},${longitude}&zoom=14&size=340x160` +
    `&markers=${latitude},${longitude},red-pushpin`;

  const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Static map image — plain <img>, works inside any iframe */}
      <Image
        source={{ uri: staticMapUrl }}
        style={styles.mapImage}
        resizeMode="cover"
      />

      {/* Footer row: address + directions link */}
      <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="location" size={16} color={colors.primary} style={{ marginTop: 1 }} />
        <Text
          style={[styles.address, { color: colors.mutedForeground, fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={1}
        >
          {address}
        </Text>

        {/* Native anchor — opens Google Maps in a new browser tab */}
        {React.createElement(
          'a',
          {
            href: googleMapsUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { textDecoration: 'none', flexShrink: 0 },
          },
          React.createElement(
            'span',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: colors.primary,
                fontFamily: font.semibold,
                fontSize: 13,
                whiteSpace: 'nowrap',
              },
            },
            'Directions ↗',
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: 160,
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  address: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: 4,
  },
});
