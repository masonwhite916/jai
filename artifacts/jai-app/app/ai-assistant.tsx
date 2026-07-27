/**
 * AI Assistant chat screen.
 * History is persisted to AsyncStorage (last 20 messages) so the conversation
 * survives navigation away and app restarts.
 *
 * Storage guards:
 *  - Entries older than 30 days are pruned on load.
 *  - A non-fatal warning is logged if the serialised payload exceeds 50 KB.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { getApiBaseUrl } from '@/lib/api';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HISTORY_KEY,
  MAX_STORED,
  parseStoredHistory,
  stampMessages,
  checkStorageSize,
  type StoredMsg,
} from '@/lib/chatHistory';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ── Quick-reply chips ─────────────────────────────────────────────────────────
const CHIPS_EN = [
  'What services do you offer?',
  'How fast will you arrive?',
  "What's covered in membership?",
  'How do I pay?',
];
const CHIPS_AR = [
  'ما هي الخدمات المتاحة؟',
  'كم وقت الوصول؟',
  'ماذا تشمل العضوية؟',
  'كيف أدفع؟',
];

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots({ font }: { font: { regular: string } }) {
  return (
    <View style={styles.bubbleWrapTheirs}>
      <View style={[styles.bubble, styles.bubbleTheirs, styles.dotsWrap]}>
        <Text style={[styles.dotsText, { fontFamily: font.regular }]}>● ● ●</Text>
      </View>
    </View>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({ msg, isRTL, font }: {
  msg: Msg;
  isRTL: boolean;
  font: { regular: string; bold: string };
}) {
  const isMine = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
      {isMine ? (
        <LinearGradient
          colors={['#2D1B69', '#C21875']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleMine]}
        >
          <Text style={[styles.bubbleTextMine, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}>
            {msg.content}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          <Text style={[styles.bubbleTextTheirs, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}>
            {msg.content}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AiAssistantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isRTL, font, t } = useLanguage();

  const [messages,         setMessages]         = useState<Msg[]>([]);
  const [input,            setInput]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [showChips,        setShowChips]        = useState(true);
  const [showStorageWarn,  setShowStorageWarn]  = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  /** Ensures the storage-size banner fires at most once per session. */
  const storageWarnShown = useRef(false);
  /**
   * Incremented every time the user clears chat.
   * sendMessage captures the value before its async fetch; if the value has
   * changed by the time the response arrives the result is silently discarded,
   * preventing cleared history from growing back.
   */
  const chatGeneration = useRef(0);
  const listRef = useRef<FlatList>(null);

  // ── Greeting helper ────────────────────────────────────────────────────────
  const makeGreeting = useCallback((rtl: boolean): Msg => ({
    id: 'greeting',
    role: 'assistant',
    content: rtl
      ? 'مرحباً! أنا مساعد جاي الذكي 👋\nيمكنني مساعدتك في الخدمات والأسعار والعضوية وأي استفسار آخر. كيف أساعدك؟'
      : 'Hi! I\'m the JAI AI Assistant 👋\nI can help with services, pricing, membership, and more. What can I do for you?',
  }), []);

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persistHistory = useCallback(async (msgs: Msg[]) => {
    try {
      // Strip the greeting bubble — it is re-generated from locale on mount.
      // Stamp each message with the current time so the 30-day pruner can work.
      const toStore: StoredMsg[] = stampMessages(
        msgs
          .filter((m) => m.id !== 'greeting')
          .slice(-MAX_STORED),
      );
      const serialised = JSON.stringify(toStore);
      // Non-fatal size guard: warn if the payload is unusually large.
      // Show a one-time in-app notice if the soft limit is crossed.
      if (checkStorageSize(serialised) && !storageWarnShown.current) {
        storageWarnShown.current = true;
        setShowStorageWarn(true);
      }
      await AsyncStorage.setItem(HISTORY_KEY, serialised);
    } catch {
      // Storage errors are non-fatal
    }
  }, []);

  // ── Load history on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        if (cancelled) return;
        // parseStoredHistory handles null, malformed JSON, and fully-expired history.
        const stored = parseStoredHistory(raw);
        if (stored.length > 0) {
          // Prepend greeting so the UI always starts with the welcome bubble.
          setMessages([makeGreeting(isRTL), ...stored]);
          setShowChips(false);
          return;
        }
      } catch {
        // Ignore unexpected read errors — fall through to fresh greeting
      }
      if (!cancelled) {
        setMessages([makeGreeting(isRTL)]);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; isRTL intentionally omitted

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, loading]);

  // ── Clear chat ────────────────────────────────────────────────────────────
  const doClear = useCallback(async () => {
    setShowClearConfirm(false);
    chatGeneration.current += 1;
    await AsyncStorage.removeItem(HISTORY_KEY);
    setMessages([makeGreeting(isRTL)]);
    setShowChips(true);
    setError(null);
    setShowStorageWarn(false);
    storageWarnShown.current = false;
  }, [isRTL, makeGreeting]);

  const clearChat = useCallback(() => {
    if (Platform.OS === 'web') {
      // Alert.alert and window.confirm are both blocked in iframes — use inline banner.
      setShowClearConfirm(true);
      return;
    }
    const title   = isRTL ? 'مسح المحادثة' : 'Clear chat';
    const message = isRTL
      ? 'هل تريد مسح سجل المحادثة والبدء من جديد؟'
      : 'Start a fresh conversation? Your current history will be removed.';
    const cancel  = isRTL ? 'إلغاء' : 'Cancel';
    const confirm = isRTL ? 'مسح' : 'Clear';
    Alert.alert(title, message, [
      { text: cancel,  style: 'cancel' },
      { text: confirm, style: 'destructive', onPress: doClear },
    ]);
  }, [isRTL, doClear]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setShowChips(false);
    setInput('');

    // Snapshot the generation so we can detect a clear that happens mid-flight.
    const gen = chatGeneration.current;

    const userMsg: Msg = { id: Date.now().toString(), role: 'user', content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'greeting') // don't send UI-only greeting
        .map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json() as { reply?: string; error?: string };
      const reply = data.reply ?? '';

      // If the user cleared chat while this request was in flight, discard the
      // response — do not update UI or write the old history back to storage.
      if (chatGeneration.current !== gen) return;

      const botMsg: Msg = {
        id: Date.now().toString() + '_bot',
        role: 'assistant',
        content: reply,
      };
      const withBot = [...nextMessages, botMsg];
      setMessages(withBot);
      // Persist after every completed exchange
      persistHistory(withBot);
    } catch {
      // Only surface the error if the chat hasn't been cleared since this
      // request started; otherwise silently discard it.
      if (chatGeneration.current === gen) {
        setError(isRTL ? 'حدث خطأ. حاول مجدداً.' : 'Something went wrong. Please try again.');
      }
    } finally {
      // Always clear the loading indicator so it cannot get stuck.
      setLoading(false);
    }
  }, [messages, loading, isRTL, persistHistory]);

  const handleSend = () => sendMessage(input);
  const chips = isRTL ? CHIPS_AR : CHIPS_EN;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7FC' }}>
      {/* ── Header ── */}
      <LinearGradient
        colors={['#2D1B69', '#1a0f3f']}
        style={[styles.header, { paddingTop: insets.top + 12 + (Platform.OS === 'web' ? 67 : 0) }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient
            colors={['#C21875', '#2D1B69']}
            style={styles.avatarDot}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerName, { fontFamily: font.bold }]}>
              {t('aiAssistant')}
            </Text>
            <Text style={[styles.headerSub, { fontFamily: font.regular }]}>
              {isRTL ? 'دائماً هنا للمساعدة' : 'Always here to help'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearChat} accessibilityLabel={isRTL ? 'مسح المحادثة' : 'Clear chat'}>
          <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Inline clear-chat confirmation (web-safe, no Alert/window.confirm) ── */}
      {showClearConfirm && (
        <View style={styles.clearConfirmBanner}>
          <Text style={[styles.clearConfirmText, { fontFamily: font.regular }]}>
            {isRTL ? 'مسح سجل المحادثة؟' : 'Clear chat history?'}
          </Text>
          <View style={styles.clearConfirmBtns}>
            <TouchableOpacity onPress={() => setShowClearConfirm(false)} style={styles.clearConfirmCancel}>
              <Text style={[styles.clearConfirmCancelText, { fontFamily: font.regular }]}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doClear} style={styles.clearConfirmOk}>
              <Text style={[styles.clearConfirmOkText, { fontFamily: font.bold }]}>
                {isRTL ? 'مسح' : 'Clear'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Storage size notice (once per session, dismissible) ── */}
      {showStorageWarn && (
        <View style={styles.storageWarnBanner}>
          <Text style={[styles.storageWarnText, { fontFamily: font.regular }]}>
            {isRTL
              ? 'سجل المحادثة كبير — يمكنك مسحه لتوفير المساحة'
              : 'Your chat history is getting large — consider clearing it to save space'}
          </Text>
          <TouchableOpacity
            onPress={() => setShowStorageWarn(false)}
            accessibilityLabel={isRTL ? 'إغلاق' : 'Dismiss'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color="#6B4FA0" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Messages + input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Bubble msg={item} isRTL={isRTL} font={font} />
          )}
          ListFooterComponent={
            <>
              {loading && <TypingDots font={font} />}
              {error && (
                <View style={styles.errorWrap}>
                  <Text style={[styles.errorText, { fontFamily: font.regular }]}>{error}</Text>
                </View>
              )}
              {showChips && !loading && (
                <View style={[styles.chipsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {chips.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.chip}
                      onPress={() => sendMessage(chip)}
                    >
                      <Text style={[styles.chipText, { fontFamily: font.regular }]}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* WhatsApp fallback */}
        <TouchableOpacity
          style={styles.waLink}
          onPress={() => Linking.openURL('https://wa.me/966555616449')}
        >
          <Text style={[styles.waText, { fontFamily: font.regular }]}>
            {isRTL ? 'تحدث مع فريق الدعم عبر واتساب' : 'Chat with support on WhatsApp'}
          </Text>
        </TouchableOpacity>

        {/* ── Input bar ── */}
        <View style={[
          styles.inputBar,
          { paddingBottom: insets.bottom + 8 + (Platform.OS === 'web' ? 12 : 0) },
        ]}>
          <TextInput
            style={[styles.input, { fontFamily: font.regular, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isRTL ? 'اسألني أي شيء عن جاي…' : 'Ask me anything about JAI…'}
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  clearBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarDot: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: 16, color: '#fff', marginBottom: 2 },
  headerSub:  { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  listContent: { padding: 16, gap: 6, flexGrow: 1 },

  bubbleWrap:       { maxWidth: '82%', marginVertical: 3 },
  bubbleWrapMine:   { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine:   { borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bubbleTextMine:   { fontSize: 15, color: '#fff', lineHeight: 22 },
  bubbleTextTheirs: { fontSize: 15, color: '#1A1A1A', lineHeight: 22 },

  dotsWrap: { paddingVertical: 12, paddingHorizontal: 18 },
  dotsText: { fontSize: 14, color: '#9CA3AF', letterSpacing: 3 },

  chipsWrap: {
    flexWrap: 'wrap', gap: 8,
    marginTop: 12, marginBottom: 4, paddingHorizontal: 4,
  },
  chip: {
    backgroundColor: '#EDE9FA',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#C4B5E8',
  },
  chipText: { fontSize: 13, color: '#2D1B69' },

  errorWrap: { alignSelf: 'center', marginTop: 8 },
  errorText: { fontSize: 13, color: '#EF4444' },

  waLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#F0F0F8',
    backgroundColor: '#fff',
  },
  waText: { fontSize: 12, color: '#6B7280' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0F0F8',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: '#F4F2FA', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1A1A1A',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2D1B69',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C4B5E8' },

  clearConfirmBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2D1B69',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  clearConfirmText: { flex: 1, fontSize: 13, color: '#fff' },
  clearConfirmBtns: { flexDirection: 'row', gap: 8 },
  clearConfirmCancel: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  clearConfirmCancelText: { fontSize: 13, color: '#fff' },
  clearConfirmOk: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#C21875',
  },
  clearConfirmOkText: { fontSize: 13, color: '#fff' },

  storageWarnBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDE9FA',
    borderBottomWidth: 1, borderBottomColor: '#C4B5E8',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  storageWarnText: {
    flex: 1, fontSize: 13, color: '#3D2080', lineHeight: 18,
  },
});
