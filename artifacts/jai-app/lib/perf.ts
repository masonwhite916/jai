/**
 * JAI Performance Instrumentation
 *
 * Uses React Native's built-in Performance API (available globally in RN 0.71+
 * via Hermes). No third-party package or native rebuild required.
 *
 * Marks emitted by this app:
 *   appStart        — as early as possible in the JS bundle (module-level)
 *   appInteractive  — splash hidden, session restored, first frame ready
 *   authComplete    — OTP verified, user logged in, navigating to tabs
 *   trackingReady   — WebSocket joined job room, tracking screen is live
 *
 * Measures logged to Metro console in __DEV__:
 *   launch_to_interactive   appStart → appInteractive
 *   app_to_auth             appInteractive → authComplete
 *   launch_to_tracking      appStart → trackingReady
 */

/**
 * Emit a named performance mark.
 * Safe no-op if the performance global is unavailable.
 */
export function perfMark(name: string): void {
  try {
    performance.mark(name);
  } catch { /* unavailable in this environment */ }
}

/**
 * Measure the duration between two marks and record it.
 * Omit endMark to measure from startMark to now.
 * Safe no-op if either mark is missing or the API is unavailable.
 */
export function perfMeasure(name: string, startMark: string, endMark?: string): void {
  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
  } catch { /* missing mark or unavailable API */ }
}

/**
 * Install a PerformanceObserver that logs every completed measure to the
 * Metro console in development.
 *
 * Call once at app entry (idempotent — duplicate calls are ignored).
 *
 * ── Wiring a production reporter ─────────────────────────────────────────────
 * To send metrics to your server or EAS Insights when !__DEV__, add another
 * observer here:
 *
 *   if (!__DEV__) {
 *     const remote = new PerformanceObserver((list) => {
 *       for (const entry of list.getEntries()) {
 *         apiFetch('/api/metrics', {
 *           method: 'POST',
 *           body: JSON.stringify({ name: entry.name, durationMs: entry.duration }),
 *         }).catch(() => {});
 *       }
 *     });
 *     remote.observe({ entryTypes: ['measure'] });
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */
let _reporterInstalled = false;

export function installDevPerfReporter(): void {
  if (_reporterInstalled) return;
  _reporterInstalled = true;

  if (!__DEV__) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(
          `[perf] ${entry.name}: ${entry.duration.toFixed(1)} ms` +
          ` (t+${entry.startTime.toFixed(0)} ms)`
        );
      }
    });
    observer.observe({ entryTypes: ['measure'] });
  } catch { /* PerformanceObserver unavailable in this environment */ }
}
