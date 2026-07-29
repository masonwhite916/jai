---
name: Reanimated Android percentage string crash
description: Passing template-literal percentage strings to Reanimated animated styles crashes the Android native thread.
---

## Rule
Never use percentage strings (`"75%"`, `` `${val}%` ``) in `useAnimatedStyle` worklets on Android for `translateX`, `translateY`, or `width`/`height` passed via transform. The native Reanimated renderer only accepts numbers. Use pixel values instead (e.g. `val * SCREEN_W`).

**Why:** Reanimated's native thread receives the worklet return value directly. On Android, CSS-style percentage strings are not handled and cause an immediate native crash — silent in production, no JS stack trace.

**How to apply:** Any time an Animated.View uses `useAnimatedStyle` with a transform or dimension that would naturally be a percentage, compute the equivalent pixel value using `Dimensions.get('window').width` or `.height` at module scope. `overflow: 'hidden'` on the parent clips any overshoot.
