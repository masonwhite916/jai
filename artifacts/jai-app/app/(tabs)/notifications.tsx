import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage, type TranslationKeys } from '@/context/LanguageContext';
import { useApp } from '@/context/AppContext';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL, font } = useLanguage();
  const { notifReadIds, markNotifRead, markAllNotifsRead } = useApp();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align = isRTL ? 'right' : 'left';

  const NOTIFICATIONS = [
    { id: 'n1', type: 'service' as const, titleKey: 'notif1Title' as TranslationKeys, bodyKey: 'notif1Body' as TranslationKeys, timeKey: 'notifAgo2' as TranslationKeys, read: false },
    { id: 'n2', type: 'service' as const, titleKey: 'notif2Title' as TranslationKeys, bodyKey: 'notif2Body' as TranslationKeys, timeKey: 'notifAgo5' as TranslationKeys, read: false },
    { id: 'n3', type: 'offer' as const, titleKey: 'notif3Title' as TranslationKeys, bodyKey: 'notif3Body' as TranslationKeys, timeKey: 'notifAgo1h' as TranslationKeys, read: true },
    { id: 'n4', type: 'service' as const, titleKey: 'notif4Title' as TranslationKeys, bodyKey: 'notif4Body' as TranslationKeys, timeKey: 'notifDate15' as TranslationKeys, read: true },
    { id: 'n5', type: 'system' as const, titleKey: 'notif5Title' as TranslationKeys, bodyKey: 'notif5Body' as TranslationKeys, timeKey: 'notifDate12' as TranslationKeys, read: true },
    { id: 'n6', type: 'offer' as const, titleKey: 'notif6Title' as TranslationKeys, bodyKey: 'notif6Body' as TranslationKeys, timeKey: 'notifDate10' as TranslationKeys, read: true },
  ];

  const TYPE_CONFIG = {
    service: { icon: 'car', color: '#2D1B69', bg: '#EDE8F8' },
    offer: { icon: 'gift', color: '#C21875', bg: '#FCEEF6' },
    system: { icon: 'information-circle', color: '#F39C12', bg: '#FEF6E8' },
  };

  const isRead = (n: { id: string; read: boolean }) => n.read || notifReadIds.includes(n.id);
  const unreadCount = NOTIFICATIONS.filter(n => !isRead(n)).length;

  function markRead(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    markNotifRead(id);
  }

  function markAllRead() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    markAllNotifsRead();
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <Text style={[styles.headerTitle, { fontFamily: font.bold, flex: 1, textAlign: align }]}>{t('notifications')}</Text>
          {unreadCount > 0 && (
            <>
              <View style={styles.unreadBadge}>
                <Text style={[styles.unreadText, { fontFamily: font.bold }]}>{unreadCount} {t('newNotifs')}</Text>
              </View>
              <TouchableOpacity onPress={markAllRead} hitSlop={8}>
                <Text style={[styles.markAllText, { fontFamily: font.semibold }]}>{t('markAllRead')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
      >
        {NOTIFICATIONS.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type];
          const read = isRead(notif);
          return (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifCard, !read && styles.notifCardUnread, { flexDirection: rowDir }]}
              activeOpacity={0.85}
              onPress={() => markRead(notif.id)}
            >
              {!read && <View style={[styles.unreadDot, isRTL ? { left: 16, right: undefined } : { right: 16 }]} />}
              <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={[styles.notifTopRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.notifTitle, !read && { fontFamily: font.bold }, read && { fontFamily: font.medium }, { textAlign: align, flex: 1 }]} numberOfLines={1}>
                    {t(notif.titleKey)}
                  </Text>
                  <Text style={[styles.notifTime, { fontFamily: font.regular }]}>{t(notif.timeKey)}</Text>
                </View>
                <Text style={[styles.notifBody, { fontFamily: font.regular, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
                  {t(notif.bodyKey)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  unreadBadge: { backgroundColor: '#C21875', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  markAllText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  notifCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    alignItems: 'flex-start', gap: 12, marginBottom: 10, position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: '#C21875' },
  unreadDot: {
    position: 'absolute', top: 18,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#C21875',
  },
  notifIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifTopRow: { justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  notifTitle: { fontSize: 14, color: '#1A1A1A' },
  notifTime: { fontSize: 12, color: '#9CA3AF', flexShrink: 0 },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});
