/**
 * In-app chat screen — driver side.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDriver } from '@/context/DriverContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch, getAuthToken } from '@/lib/api';
import { jaiSocket } from '@/lib/socket';
import * as Haptics from 'expo-haptics';

interface ChatMsg {
  id:          number;
  job_id:      number;
  sender_id:   number;
  sender_role: string;
  sender_name: string | null;
  text:        string;
  created_at:  string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function Bubble({ msg, isMine }: { msg: ChatMsg; isMine: boolean }) {
  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
      {isMine ? (
        <LinearGradient
          colors={['#2D1B69', '#C21875']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleMine]}
        >
          <Text style={styles.bubbleTextMine}>{msg.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          {msg.sender_name && <Text style={styles.senderName}>{msg.sender_name}</Text>}
          <Text style={styles.bubbleTextTheirs}>{msg.text}</Text>
        </View>
      )}
      <Text style={[styles.timestamp, isMine ? styles.timestampMine : styles.timestampTheirs]}>
        {formatTime(msg.created_at)}
      </Text>
    </View>
  );
}

export default function DriverChatScreen() {
  const { jobId, partnerName } = useLocalSearchParams<{ jobId: string; partnerName?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { driver } = useDriver();
  const { isRTL, font } = useLanguage();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef<FlatList>(null);
  const jidNum  = Number(jobId);

  useEffect(() => {
    if (!jobId) return;
    apiFetch<ChatMsg[]>(`/api/jobs/${jobId}/messages`)
      .then((msgs) => { setMessages(msgs); setLoading(false); })
      .catch(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    const room = `job:${jobId}`;
    jaiSocket.joinRoom(room);
    const off = jaiSocket.on('chat_message', (payload) => {
      const msg = payload as unknown as ChatMsg;
      if (msg.job_id !== jidNum) return;
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    return () => { off(); };
  }, [jobId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const msg = await apiFetch<ChatMsg>(`/api/jobs/${jobId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, sending, jobId]);

  const partnerLabel = partnerName || (isRTL ? 'العميل' : 'Customer');

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7FC' }}>
      <LinearGradient
        colors={['#2D1B69', '#1a0f3f']}
        style={[styles.header, { paddingTop: insets.top + 12 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarDot}>
            <Text style={styles.avatarInitial}>{(partnerName ?? 'C').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[styles.headerName, { fontFamily: font.bold }]}>{partnerLabel}</Text>
            <Text style={[styles.headerSub,  { fontFamily: font.regular }]}>
              {isRTL ? 'العميل' : 'Customer'}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <ActivityIndicator color="#2D1B69" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Bubble msg={item} isMine={String(item.sender_id) === driver?.id} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={48} color="#C4B5E8" />
                <Text style={[styles.emptyText, { fontFamily: font.regular }]}>
                  {isRTL ? 'ابدأ المحادثة' : 'Start the conversation'}
                </Text>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 + (Platform.OS === 'web' ? 12 : 0) }]}>
          <TextInput
            style={[styles.input, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isRTL ? 'اكتب رسالة…' : 'Type a message…'}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#C21875', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerName: { fontSize: 16, color: '#fff', marginBottom: 2 },
  headerSub:  { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  listContent: { padding: 16, gap: 6, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
  bubbleWrap:       { maxWidth: '78%', marginVertical: 3 },
  bubbleWrapMine:   { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:           { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine:       { borderBottomRightRadius: 4 },
  bubbleTheirs:     { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  senderName:       { fontSize: 11, color: '#C21875', fontWeight: '600', marginBottom: 2 },
  bubbleTextMine:   { fontSize: 15, color: '#fff', lineHeight: 21 },
  bubbleTextTheirs: { fontSize: 15, color: '#1A1A1A', lineHeight: 21 },
  timestamp:        { fontSize: 11, marginTop: 4 },
  timestampMine:    { color: '#9CA3AF', textAlign: 'right' },
  timestampTheirs:  { color: '#9CA3AF', textAlign: 'left' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F8' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#F4F2FA', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A1A' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D1B69', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#C4B5E8' },
});
