/**
 * AI Assistant chat screen.
 * Stateless — history lives only in component state, no server persistence.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { getApiBaseUrl } from '@/lib/api';
import * as Haptics from 'expo-haptics';

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

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);
  const listRef = useRef<FlatList>(null);

  // Greeting on mount
  useEffect(() => {
    const greeting: Msg = {
      id: 'greeting',
      role: 'assistant',
      content: isRTL
        ? 'مرحباً! أنا مساعد جاي الذكي 👋\nيمكنني مساعدتك في الخدمات والأسعار والعضوية وأي استفسار آخر. كيف أساعدك؟'
        : 'Hi! I\'m the JAI AI Assistant 👋\nI can help with services, pricing, membership, and more. What can I do for you?',
    };
    setMessages([greeting]);
  }, [isRTL]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, loading]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setShowChips(false);
    setInput('');

    const userMsg: Msg = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg]
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

      const botMsg: Msg = {
        id: Date.now().toString() + '_bot',
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setError(isRTL ? 'حدث خطأ. حاول مجدداً.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [messages, loading, isRTL]);

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
        <View style={{ width: 40 }} />
      </LinearGradient>

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
          <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
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
});
