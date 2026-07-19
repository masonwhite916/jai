import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: 'service' | 'offer' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'service', title: 'Technician Assigned', body: 'Ahmed Al-Ghamdi has been assigned to your battery jump start request.', time: '2 min ago', read: false },
  { id: 'n2', type: 'service', title: 'Technician Arriving', body: 'Ahmed is 8 minutes away from your location.', time: '5 min ago', read: false },
  { id: 'n3', type: 'offer', title: 'Special Offer — 30% Off!', body: 'Get 30% off your next battery jump start service. Valid until July 31.', time: '1 hour ago', read: true },
  { id: 'n4', type: 'service', title: 'Service Completed', body: 'Your tire replacement on Jul 15 has been completed. Rate your experience.', time: 'Jul 15', read: true },
  { id: 'n5', type: 'system', title: 'Membership Renews Soon', body: 'Your Premium membership expires in 14 days. Renew now to keep your benefits.', time: 'Jul 12', read: true },
  { id: 'n6', type: 'offer', title: 'New Offer Available', body: 'Free tire check with any service this month. Limited time offer.', time: 'Jul 10', read: true },
];

const TYPE_CONFIG = {
  service: { icon: 'car', color: '#2D1B69', bg: '#EDE8F8' },
  offer: { icon: 'gift', color: '#C21875', bg: '#FCEEF6' },
  system: { icon: 'information-circle', color: '#F39C12', bg: '#FEF6E8' },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#5B2C91']}
        style={[styles.header, { paddingTop: insets.top + 16 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount} new</Text>
            </View>
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
          return (
            <TouchableOpacity key={notif.id} style={[styles.notifCard, !notif.read && styles.notifCardUnread]} activeOpacity={0.85}>
              {!notif.read && <View style={styles.unreadDot} />}
              <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.notifTopRow}>
                  <Text style={[styles.notifTitle, !notif.read && styles.notifTitleBold]}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  unreadBadge: { backgroundColor: '#C21875', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: '#C21875' },
  unreadDot: {
    position: 'absolute', top: 18, right: 16,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#C21875',
  },
  notifIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  notifTitle: { fontSize: 14, color: '#1A1A1A', fontFamily: 'Inter_500Medium', flex: 1 },
  notifTitleBold: { fontFamily: 'Inter_700Bold' },
  notifTime: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular', flexShrink: 0 },
  notifBody: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
