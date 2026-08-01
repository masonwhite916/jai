import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { useApp, type AppNotification } from '@/context/AppContext';

// ── Relative time helper ───────────────────────────────────────────────────────

function relativeTime(isoString: string, isRTL: boolean): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)   return isRTL ? 'الآن'                : 'Just now';
  if (diff < 3600) return isRTL ? `منذ ${Math.floor(diff / 60)} د`    : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return isRTL ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1)  return isRTL ? 'أمس'                 : 'Yesterday';
  if (days < 7)   return isRTL ? `منذ ${days} أيام`     : `${days}d ago`;
  // Older: show date
  return new Date(isoString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    month: 'short', day: 'numeric',
  });
}

// ── Notification type derivation ───────────────────────────────────────────────

type NotifType = 'service' | 'offer' | 'system';

function notifType(n: AppNotification): NotifType {
  const t = n.data?.type as string | undefined;
  if (t === 'job_accepted' || t === 'job_completed' || t === 'new_job') return 'service';
  return 'system';
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string }> = {
  service: { icon: 'car',                color: '#2D1B69', bg: '#EDE8F8' },
  offer:   { icon: 'gift',               color: '#C21875', bg: '#FCEEF6' },
  system:  { icon: 'information-circle', color: '#F39C12', bg: '#FEF6E8' },
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets  = useSafeAreaInsets();
  const { isRTL, font } = useLanguage();
  const router  = useRouter();
  const {
    notifications, unreadCount,
    fetchNotifications, markNotifRead, markAllNotifsRead,
  } = useApp();

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align  = isRTL ? 'right' : 'left';

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications().catch(() => {});
    setRefreshing(false);
  }, [fetchNotifications]);

  async function handleMarkRead(n: AppNotification) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await markNotifRead(n.id);

    // Deep-link into the relevant screen
    const data = n.data ?? {};
    if (data.screen === 'tracking' && data.jobId) {
      router.push({ pathname: '/(tabs)/requests' });
    } else if (data.screen === 'requests' || data.screen === 'job') {
      router.push({ pathname: '/(tabs)/requests' });
    }
  }

  async function handleMarkAllRead() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await markAllNotifsRead();
  }

  const isEmpty = notifications.length === 0 && !refreshing;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <Text style={[styles.headerTitle, { fontFamily: font.bold, flex: 1, textAlign: align }]}>
            {isRTL ? 'الإشعارات' : 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <>
              <View style={styles.unreadBadge}>
                <Text style={[styles.unreadText, { fontFamily: font.bold }]}>
                  {unreadCount} {isRTL ? 'جديد' : 'new'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleMarkAllRead} hitSlop={8}>
                <Text style={[styles.markAllText, { fontFamily: font.semibold }]}>
                  {isRTL ? 'قراءة الكل' : 'Mark all read'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + (Platform.OS === 'web' ? 34 : 0) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2D1B69"
            colors={['#2D1B69']}
          />
        }
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text style={[styles.emptyTitle, { fontFamily: font.semibold }]}>
              {isRTL ? 'لا توجد إشعارات' : 'No notifications yet'}
            </Text>
            <Text style={[styles.emptyBody, { fontFamily: font.regular }]}>
              {isRTL
                ? 'ستظهر هنا إشعارات طلباتك وعروضك'
                : "Your service updates and alerts will appear here"}
            </Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const type = notifType(notif);
            const cfg  = TYPE_CONFIG[type];
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.read && styles.notifCardUnread, { flexDirection: rowDir }]}
                activeOpacity={0.85}
                onPress={() => handleMarkRead(notif)}
              >
                {!notif.read && (
                  <View style={[styles.unreadDot, isRTL ? { left: 16, right: undefined } : { right: 16 }]} />
                )}
                <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={[styles.notifTopRow, { flexDirection: rowDir }]}>
                    <Text
                      style={[
                        styles.notifTitle,
                        !notif.read ? { fontFamily: font.bold } : { fontFamily: font.medium },
                        { textAlign: align, flex: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    <Text style={[styles.notifTime, { fontFamily: font.regular }]}>
                      {relativeTime(notif.created_at, isRTL)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.notifBody,
                      { fontFamily: font.regular, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' },
                    ]}
                    numberOfLines={2}
                  >
                    {notif.body}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16, color: '#374151', marginTop: 4 },
  emptyBody:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 260 },
});
