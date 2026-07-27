/**
 * JAI Rush — offline snake-style game.
 * A JAI tow truck rescues stranded cars on a road grid.
 * Fully offline, no network calls, no third-party game engine.
 */
import React, {
  useCallback, useEffect, useMemo, useReducer, useRef,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  PanResponder, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/context/LanguageContext';

// ── Grid constants ─────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const COLS = 15;
const ROWS = 20;
// CELL is computed inside the component from both screen axes — see useCELL()
const HS_KEY = 'jai_rush_high_score_v1';

// ── JAI service types — these are the "food" items ────────────────────────────
const FOOD_TYPES = [
  { id: 'battery',  emoji: '🔋', labelEn: 'Battery',  labelAr: 'بطارية' },
  { id: 'tire',     emoji: '🛞', labelEn: 'Tire',      labelAr: 'إطار'   },
  { id: 'fuel',     emoji: '⛽', labelEn: 'Fuel',      labelAr: 'وقود'   },
  { id: 'tow',      emoji: '🚙', labelEn: 'Tow',       labelAr: 'سطحة'   },
  { id: 'lockout',  emoji: '🔑', labelEn: 'Lockout',   labelAr: 'مفاتيح' },
  { id: 'mechanic', emoji: '🔧', labelEn: 'Mechanic',  labelAr: 'ميكانيك'},
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type Dir   = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Phase = 'ready' | 'playing' | 'over';
interface Pos  { r: number; c: number }
interface Food extends Pos { type: typeof FOOD_TYPES[number] }

interface GameState {
  phase:    Phase;
  snake:    Pos[];   // head = [0]
  dir:      Dir;
  nextDir:  Dir;
  food:     Food;
  cones:    Pos[];
  score:    number;
  level:    number;
  rescued:  number;
  highScore: number;
}

type Action =
  | { type: 'TICK' }
  | { type: 'DIR';    dir: Dir }
  | { type: 'START';  highScore: number }
  | { type: 'RESTART' }
  | { type: 'SET_HS'; highScore: number };

// ── Pure helpers ───────────────────────────────────────────────────────────────
function k(p: Pos) { return `${p.r},${p.c}`; }

function opposite(a: Dir, b: Dir) {
  return (a === 'UP' && b === 'DOWN') || (a === 'DOWN' && b === 'UP')
      || (a === 'LEFT' && b === 'RIGHT') || (a === 'RIGHT' && b === 'LEFT');
}

function step(head: Pos, dir: Dir): Pos {
  if (dir === 'UP')    return { r: head.r - 1, c: head.c };
  if (dir === 'DOWN')  return { r: head.r + 1, c: head.c };
  if (dir === 'LEFT')  return { r: head.r,     c: head.c - 1 };
                       return { r: head.r,     c: head.c + 1 };
}

function getSpeed(level: number) { return Math.max(110, 300 - (level - 1) * 28); }

function pickFood(snake: Pos[], cones: Pos[]): Food {
  const busy = new Set([...snake.map(k), ...cones.map(k)]);
  let p: Pos;
  do { p = { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) }; }
  while (busy.has(k(p)));
  return { ...p, type: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)] };
}

function pickCone(snake: Pos[], cones: Pos[], food: Pos): Pos | null {
  const busy = new Set([...snake.map(k), ...cones.map(k), k(food)]);
  let p: Pos; let tries = 0;
  do {
    p = { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) };
    if (++tries > 300) return null;
  } while (busy.has(k(p)));
  return p;
}

function fresh(highScore = 0): GameState {
  const snake: Pos[] = [{ r: 10, c: 7 }, { r: 10, c: 6 }, { r: 10, c: 5 }];
  return {
    phase: 'ready', snake, dir: 'RIGHT', nextDir: 'RIGHT',
    food: pickFood(snake, []), cones: [],
    score: 0, level: 1, rescued: 0, highScore,
  };
}

// ── Reducer ────────────────────────────────────────────────────────────────────
function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_HS':  return { ...state, highScore: action.highScore };
    case 'START':   return { ...fresh(action.highScore), phase: 'playing' };
    case 'RESTART': return { ...fresh(state.highScore),  phase: 'playing' };

    case 'DIR': {
      if (state.phase !== 'playing') return state;
      if (opposite(state.dir, action.dir)) return state;
      return { ...state, nextDir: action.dir };
    }

    case 'TICK': {
      if (state.phase !== 'playing') return state;
      const dir = opposite(state.dir, state.nextDir) ? state.dir : state.nextDir;
      const nh  = step(state.snake[0], dir);

      // Wall / self / cone collision → game over
      const snakeSet = new Set(state.snake.map(k));
      const coneSet  = new Set(state.cones.map(k));
      if (
        nh.r < 0 || nh.r >= ROWS || nh.c < 0 || nh.c >= COLS ||
        snakeSet.has(k(nh)) || coneSet.has(k(nh))
      ) {
        return { ...state, phase: 'over', highScore: Math.max(state.score, state.highScore) };
      }

      const ateFood = k(nh) === k(state.food);
      const newSnake = ateFood
        ? [nh, ...state.snake]
        : [nh, ...state.snake.slice(0, -1)];

      if (!ateFood) return { ...state, snake: newSnake, dir, nextDir: dir };

      // Ate food → score, level, maybe a new cone
      const rescued  = state.rescued + 1;
      const score    = state.score + 10;
      const level    = Math.floor(rescued / 5) + 1;
      const newFood  = pickFood(newSnake, state.cones);
      let   newCones = state.cones;
      if (level >= 2 && rescued % 3 === 0) {
        const cone = pickCone(newSnake, state.cones, newFood);
        if (cone) newCones = [...state.cones, cone];
      }
      return {
        ...state, snake: newSnake, dir, nextDir: dir,
        food: newFood, cones: newCones,
        score, level, rescued, highScore: Math.max(score, state.highScore),
      };
    }

    default: return state;
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GameScreen() {
  const insets  = useSafeAreaInsets();
  // Fit the grid so the full UI (header + levelbar + foodstrip + dpad) always shows without scrolling
  const FIXED_UI = 56 + 26 + 5 + 42 + 8 + 162 + 20; // header+levelbar+margin+foodstrip+margin+dpad+bottom
  const cellFromH = Math.floor((SH - insets.top - insets.bottom - FIXED_UI) / ROWS);
  const cellFromW = Math.floor((SW - 32) / COLS);
  const CELL = Math.max(13, Math.min(cellFromH, cellFromW));
  const router  = useRouter();
  const { isRTL, font } = useLanguage();

  const [state, dispatch] = useReducer(reducer, fresh(0));
  const stateRef   = useRef(state);
  stateRef.current = state;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved high score once
  useEffect(() => {
    AsyncStorage.getItem(HS_KEY).then(v => {
      if (v) dispatch({ type: 'SET_HS', highScore: Number(v) });
    }).catch(() => {});
  }, []);

  // Save high score + haptic on game over
  useEffect(() => {
    if (state.phase === 'over') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      AsyncStorage.setItem(HS_KEY, String(state.highScore)).catch(() => {});
    }
  }, [state.phase]);

  // Game loop — restart when phase or level changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.phase === 'playing') {
      intervalRef.current = setInterval(
        () => dispatch({ type: 'TICK' }),
        getSpeed(state.level),
      );
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.phase, state.level]);

  // Swipe gesture handler
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderRelease: (_, gs) => {
        if (stateRef.current.phase !== 'playing') return;
        const { dx, dy } = gs;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          dispatch({ type: 'DIR', dir: dx > 0 ? 'RIGHT' : 'LEFT' });
        } else {
          dispatch({ type: 'DIR', dir: dy > 0 ? 'DOWN' : 'UP' });
        }
      },
    })
  ).current;

  // Precompute sets for render
  const snakeSet = useMemo(() => new Set(state.snake.map(k)), [state.snake]);
  const coneSet  = useMemo(() => new Set(state.cones.map(k)), [state.cones]);
  const headKey  = k(state.snake[0]);
  const foodKey  = k(state.food);

  const dirBtn = useCallback((dir: Dir) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'DIR', dir });
  }, []);

  const doStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    dispatch({ type: 'START', highScore: stateRef.current.highScore });
  }, []);

  const doRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    dispatch({ type: 'RESTART' });
  }, []);

  // ── Grid rendering ───────────────────────────────────────────────────────────
  function renderCell(r: number, c: number) {
    const ck = `${r},${c}`;
    const isHead = ck === headKey;
    const isBody = !isHead && snakeSet.has(ck);
    const isFood = ck === foodKey;
    const isCone = coneSet.has(ck);
    const base   = [styles.cell, { width: CELL, height: CELL }] as const;

    if (isHead) return (
      <View key={ck} style={base}>
        <LinearGradient colors={['#5B2C91', '#C21875']} style={styles.headCell}>
          <Text style={{ fontSize: CELL * 0.62, lineHeight: CELL }}>🚛</Text>
        </LinearGradient>
      </View>
    );
    if (isBody) return (
      <View key={ck} style={base}>
        <View style={styles.bodyCell} />
      </View>
    );
    if (isFood) return (
      <View key={ck} style={base}>
        <View style={styles.foodCell}>
          <Text style={{ fontSize: CELL * 0.58, lineHeight: CELL * 0.72 }}>
            {state.food.type.emoji}
          </Text>
        </View>
      </View>
    );
    if (isCone) return (
      <View key={ck} style={base}>
        <View style={styles.coneCell}>
          <Text style={{ fontSize: CELL * 0.6, lineHeight: CELL * 0.72 }}>🚧</Text>
        </View>
      </View>
    );
    // Road tile — subtle checkerboard
    return (
      <View
        key={ck}
        style={[styles.cell, {
          width: CELL, height: CELL,
          backgroundColor: (r + c) % 2 === 0 ? '#12102B' : '#0F0D24',
        }]}
      />
    );
  }

  function renderGrid() {
    const rows: React.ReactNode[] = [];
    for (let r = 0; r < ROWS; r++) {
      const cells: React.ReactNode[] = [];
      for (let c = 0; c < COLS; c++) cells.push(renderCell(r, c));
      rows.push(<View key={r} style={{ flexDirection: 'row' }}>{cells}</View>);
    }
    return rows;
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: insets.bottom + 8 }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#2D1B69', '#1a0f3f']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: font.bold }]}>
          {isRTL ? 'جاي راش 🚛' : 'JAI Rush 🚛'}
        </Text>
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreVal, { fontFamily: font.bold }]}>{state.score}</Text>
          <Text style={[styles.scoreLbl, { fontFamily: font.regular }]}>
            {isRTL ? 'نقطة' : 'pts'}
          </Text>
        </View>
      </LinearGradient>

      {/* ── Level / best bar ───────────────────────────────────────────── */}
      <View style={[styles.levelBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.levelTxt, { fontFamily: font.medium }]}>
          {isRTL ? `المستوى ${state.level}` : `Level ${state.level}`}
        </Text>
        <Text style={[styles.hsTxt, { fontFamily: font.medium }]}>
          {isRTL ? `الأعلى: ${state.highScore}` : `Best: ${state.highScore}`}
        </Text>
      </View>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <View
        style={[styles.grid, { width: CELL * COLS, height: CELL * ROWS }]}
        {...pan.panHandlers}
      >
        {renderGrid()}

        {/* Ready overlay */}
        {state.phase === 'ready' && (
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={doStart}>
            <View style={[styles.overlayCard, { width: CELL * COLS - 32 }]}>
              <Text style={[styles.ovTitle, { fontFamily: font.bold }]}>
                {isRTL ? '🚛 جاي راش' : '🚛 JAI Rush'}
              </Text>
              <Text style={[styles.ovSub, { fontFamily: font.regular }]}>
                {isRTL
                  ? 'أنقذ السيارات العالقة\nوكبّر قافلتك!'
                  : 'Rescue stranded cars\nand grow your convoy!'}
              </Text>
              <View style={styles.ovBtn}>
                <Text style={[styles.ovBtnTxt, { fontFamily: font.bold }]}>
                  {isRTL ? 'ابدأ اللعبة' : 'TAP TO PLAY'}
                </Text>
              </View>
              <Text style={[styles.ovHint, { fontFamily: font.regular }]}>
                {isRTL ? 'اسحب أو استخدم أزرار الاتجاه' : 'Swipe or use the D-pad to steer'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Game over overlay */}
        {state.phase === 'over' && (
          <View style={styles.overlay}>
            <View style={[styles.overlayCard, { width: CELL * COLS - 32 }]}>
              <Text style={[styles.ovTitle, { fontFamily: font.bold }]}>
                {isRTL ? '💥 انتهت اللعبة' : '💥 Game Over'}
              </Text>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { fontFamily: font.bold }]}>{state.score}</Text>
                  <Text style={[styles.statLbl, { fontFamily: font.regular }]}>
                    {isRTL ? 'النقاط' : 'Score'}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { fontFamily: font.bold, color: '#FFD700' }]}>
                    {state.highScore}
                  </Text>
                  <Text style={[styles.statLbl, { fontFamily: font.regular }]}>
                    {isRTL ? 'الأعلى' : 'Best'}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { fontFamily: font.bold, color: '#C21875' }]}>
                    {state.rescued}
                  </Text>
                  <Text style={[styles.statLbl, { fontFamily: font.regular }]}>
                    {isRTL ? 'أُنقذ' : 'Rescued'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.ovBtn} onPress={doRestart}>
                <Text style={[styles.ovBtnTxt, { fontFamily: font.bold }]}>
                  {isRTL ? '▶  العب مجدداً' : '▶  PLAY AGAIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Current target strip ───────────────────────────────────────── */}
      {state.phase === 'playing' && (
        <View style={styles.foodStrip}>
          <Text style={[styles.foodStripTxt, { fontFamily: font.regular }]}>
            {state.food.type.emoji}
            {'  '}
            {isRTL
              ? `أنقذ السيارة: ${state.food.type.labelAr}`
              : `Rescue: ${state.food.type.labelEn}`}
          </Text>
        </View>
      )}

      {/* ── D-pad ──────────────────────────────────────────────────────── */}
      <View style={styles.dpad}>
        <TouchableOpacity style={styles.dBtn} onPress={() => dirBtn('UP')}>
          <Ionicons name="chevron-up" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.dMid}>
          <TouchableOpacity style={styles.dBtn} onPress={() => dirBtn('LEFT')}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.dCenter} />
          <TouchableOpacity style={styles.dBtn} onPress={() => dirBtn('RIGHT')}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.dBtn} onPress={() => dirBtn('DOWN')}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0B1F', alignItems: 'center' },

  header: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, color: '#fff', textAlign: 'center' },
  scoreBox:    { alignItems: 'center', minWidth: 44 },
  scoreVal:    { fontSize: 20, color: '#FFD700' },
  scoreLbl:    { fontSize: 10, color: 'rgba(255,255,255,0.45)' },

  levelBar: {
    width: '100%', paddingHorizontal: 14, paddingVertical: 5,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  levelTxt: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  hsTxt:    { fontSize: 11, color: '#C21875' },

  grid: {
    marginTop: 5,
    borderWidth: 2, borderColor: '#2D1B69',
    borderRadius: 4, overflow: 'hidden',
  },
  cell: { overflow: 'hidden' },
  headCell: {
    flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 3,
  },
  bodyCell: {
    flex: 1, margin: 1, backgroundColor: '#5B2C91', borderRadius: 3,
  },
  foodCell: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(194,24,117,0.18)',
    borderWidth: 1, borderColor: 'rgba(194,24,117,0.45)',
    borderRadius: 3,
  },
  coneCell: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,150,0,0.12)',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,5,25,0.86)',
    justifyContent: 'center', alignItems: 'center',
  },
  overlayCard: {
    alignItems: 'center', gap: 12,
    paddingHorizontal: 22, paddingVertical: 26,
    backgroundColor: 'rgba(45,27,105,0.92)',
    borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(194,24,117,0.35)',
    // width set inline (CELL is component-scoped)
  },
  ovTitle:  { fontSize: 22, color: '#fff' },
  ovSub:    { fontSize: 13, color: 'rgba(255,255,255,0.68)', textAlign: 'center', lineHeight: 20 },
  ovBtn: {
    backgroundColor: '#C21875',
    borderRadius: 12, paddingHorizontal: 26, paddingVertical: 11,
    marginTop: 4,
  },
  ovBtnTxt: { fontSize: 14, color: '#fff', letterSpacing: 0.5 },
  ovHint:   { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  statRow:    { flexDirection: 'row', gap: 14, alignItems: 'center' },
  statItem:   { alignItems: 'center', gap: 4 },
  statVal:    { fontSize: 26, color: '#fff' },
  statLbl:    { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  statDivider:{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },

  foodStrip: {
    marginTop: 6, paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: 'rgba(45,27,105,0.55)', borderRadius: 16,
  },
  foodStripTxt: { fontSize: 12, color: 'rgba(255,255,255,0.72)' },

  dpad: { marginTop: 8, alignItems: 'center', gap: 4 },
  dMid: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dBtn: {
    width: 50, height: 50, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
  },
  dCenter: {
    width: 50, height: 50, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
