/**
 * Messages tab — driver side.
 *
 * Lists active jobs (accepted → working) that the driver is assigned to.
 * Shows the latest message preview for each and tracks unread counts in
 * real-time via WebSocket.  Tapping a row opens the in-app chat screen.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { useDriver, type Job, type ChatMessage } from '@/context/DriverContext';
import { useColors } from '@/hooks/useColors';
import { apiFetch } from '@/lib/api';
import * as Haptics from 'expo-haptics';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ConversationState {
  /** Last message from history fetch (context overrides this in real-time). */
  historyMsg: ChatMessage | null;
  loading:    boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ACTIVE_STATUSES = new Set(['accepted', 'en_route', 'arrived', 'working']);

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr  < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Conversation row ──────────────────────────────────────────────────────────
function ConvRow({
  job, lastMsg, unread, loading, onPress,
}: {
  job:     Job;
  lastMsg: ChatMessage | null;
  unread:  number;
  loading: boolean;
  onPress: () => void;
}) {
  const { isRTL, font } = useLanguage();
  const colors = useColors();
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const align  = isRTL ? 'right' : 'left';

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, flexDirection: rowDir }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      {/* Avatar */}
      <LinearGradient colors={['#2D1B69', '#C21875']} style={styles.avatar}>
        <Text style={[styles.avatarText, { fontFamily: font.bold }]}>
          {initials(job.customerName)}
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={[styles.rowContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.rowTop, { flexDirection: rowDir }]}>
          <Text style={[styles.name, { fontFamily: font.semibold, color: colors.text, textAlign: align }]} numberOfLines={1}>
            {job.customerName}
          </Text>
          {lastMsg && (
            <Text style={[styles.time, { fontFamily: font.regular, color: colors.mutedForeground }]}>
              {timeAgo(lastMsg.created_at)}
            </Text>
          )}
        </View>

        <View style={[styles.rowBottom, { flexDirection: rowDir }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : lastMsg ? (
            <Text
              style={[styles.preview, { fontFamily: font.regular, color: colors.mutedForeground, textAlign: align }]}
              numberOfLines={1}
            >
              {lastMsg.sender_role === 'customer' ? '' : '↩ '}
              {lastMsg.text}
            </Text>
          ) : (
            <Text style={[styles.preview, { fontFamily: font.regular, color: colors.mutedForeground }]}>
              {isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Chevron */}
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.mutedForeground}
        style={{ alignSelf: 'center' }}
      />
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MessagesTab() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { t, isRTL, font } = useLanguage();
  const colors  = useColors();
  const { jobs, refreshJobs, unreadByJob, lastMsgByJob, clearUnread } = useDriver();

  // Only show jobs that are currently active (assigned to this tech)
  const activeJobs = jobs.filter((j) => j.mine && ACTIVE_STATUSES.has(j.status));

  // Per-job history fetch state (loading + REST-loaded last message before any WS update)
  const [histMap, setHistMap] = useState<Record<string, ConversationState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  // ── Load last message from history for each active job ─────────────────────
  const loadLastMsg = useCallback(async (jobId: string) => {
    if (fetchedRef.current.has(jobId)) return;
    fetchedRef.current.add(jobId);
    setHistMap((prev) => ({ ...prev, [jobId]: { historyMsg: prev[jobId]?.historyMsg ?? null, loading: true } }));
    try {
      const msgs = await apiFetch<ChatMessage[]>(`/api/jobs/${jobId}/messages`);
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      setHistMap((prev) => ({ ...prev, [jobId]: { historyMsg: last, loading: false } }));
    } catch {
      setHistMap((prev) => ({ ...prev, [jobId]: { historyMsg: null, loading: false } }));
    }
  }, []);

  useEffect(() => {
    for (const job of activeJobs) {
      loadLastMsg(job.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJobs.map((j) => j.id).join(',')]);

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    fetchedRef.current.clear();
    await refreshJobs();
    await Promise.all(activeJobs.map((j) => loadLastMsg(j.id)));
    setRefreshing(false);
  }, [activeJobs, loadLastMsg, refreshJobs]);

  const openChat = (job: Job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearUnread(job.id);
    router.push({ pathname: '/chat/[jobId]' as any, params: { jobId: job.id, partnerName: job.customerName } });
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#1a0f3f']}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={[styles.headerTitle, { fontFamily: font.bold, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('tabMessages')}
        </Text>
        {activeJobs.length > 0 && (
          <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
            {activeJobs.length} {isRTL ? 'محادثة نشطة' : `active conversation${activeJobs.length !== 1 ? 's' : ''}`}
          </Text>
        )}
      </LinearGradient>

      {/* List */}
      <FlatList
        data={activeJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D1B69" />
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item: job }) => {
          // Context gives real-time last message; history fetch fills in if context has none yet
          const ctxMsg  = lastMsgByJob[job.id] ?? null;
          const histMsg = histMap[job.id]?.historyMsg ?? null;
          return (
            <ConvRow
              job={job}
              lastMsg={ctxMsg ?? histMsg}
              unread={unreadByJob[job.id] ?? 0}
              loading={histMap[job.id]?.loading ?? false}
              onPress={() => openChat(job)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="chatbubbles-outline" size={40} color="#C4B5E8" />
            </View>
            <Text style={[styles.emptyTitle, { fontFamily: font.semibold, color: colors.text }]}>
              {isRTL ? 'لا توجد محادثات نشطة' : 'No active conversations'}
            </Text>
            <Text style={[styles.emptySub, { fontFamily: font.regular, color: colors.mutedForeground }]}>
              {isRTL
                ? 'ستظهر هنا رسائل العملاء عند قبول مهمة'
                : 'Customer messages appear here when you accept a job'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 26, color: '#FFFFFF', marginBottom: 4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  list:        { flexGrow: 1 },
  separator:   { height: 1, marginLeft: 80 },

  row:         {
    paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', gap: 12,
  },
  avatar:      {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText:  { fontSize: 16, color: '#FFFFFF' },
  rowContent:  { flex: 1, gap: 4 },
  rowTop:      { justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name:        { fontSize: 15, flex: 1 },
  time:        { fontSize: 12, flexShrink: 0 },
  rowBottom:   { alignItems: 'center', gap: 8 },
  preview:     { fontSize: 13, flex: 1 },

  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#C21875', paddingHorizontal: 5,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 14 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, textAlign: 'center' },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
