/**
 * JAI WebSocket client — singleton real-time connection to the API server.
 *
 * Usage:
 *   import { jaiSocket } from '@/lib/socket';
 *
 *   jaiSocket.connect(token);
 *   jaiSocket.joinRoom('job:42');
 *   const off = jaiSocket.on('job_accepted', (payload) => { ... });
 *   // later:
 *   off();                       // unsubscribe
 *   jaiSocket.disconnect();
 */

import Constants from 'expo-constants';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWsUrl(): string {
  const host =
    (Constants.expoConfig?.extra as Record<string, string> | undefined)
      ?.apiHost ?? 'localhost';
  // Use wss:// on any real host; ws:// for localhost dev fallback
  // Use wss:// on Replit (proxied via /api/ws path); ws:// for bare localhost
  const scheme = host === 'localhost' ? 'ws' : 'wss';
  // The Replit proxy routes /api/* to the API service — WS must match that prefix
  const wsPath = host === 'localhost' ? '/api/ws' : '/api/ws';
  return `${scheme}://${host}${wsPath}`;
}

type Listener = (payload: Record<string, unknown>) => void;

// ── Singleton class ───────────────────────────────────────────────────────────

class JaiSocket {
  private ws:            WebSocket | null = null;
  private token:         string   | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay  = 1000;  // ms, doubles on each failure (capped at 30 s)
  private readonly maxDelay = 30_000;
  private listeners    = new Map<string, Set<Listener>>();
  private pendingRooms = new Set<string>();  // rooms to join after (re)auth
  private isAuthenticated = false;

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Open connection and authenticate with the given token. */
  connect(token: string): void {
    this.token = token;
    this.reconnectDelay = 1000;
    this._open();
  }

  /** Close the connection permanently. */
  disconnect(): void {
    this.token = null;
    this.isAuthenticated = false;
    this.pendingRooms.clear();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Subscribe to a server-sent message type. Returns an unsubscribe function. */
  on(type: string, listener: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  /** Subscribe to a message type and automatically unsubscribe after first call. */
  once(type: string, listener: Listener): () => void {
    const unsub = this.on(type, (payload) => {
      unsub();
      listener(payload);
    });
    return unsub;
  }

  /** Join a room — will be rejoined automatically on reconnect. */
  joinRoom(room: string): void {
    this.pendingRooms.add(room);
    if (this.isAuthenticated) {
      this._send({ type: 'join', room });
    }
  }

  /** Leave a room and stop rejoining on reconnect. */
  leaveRoom(room: string): void {
    this.pendingRooms.delete(room);
    this._send({ type: 'leave', room });
  }

  /** Send a GPS location update for the active job. */
  sendLocation(lat: number, lng: number, jobId: string): void {
    this._send({ type: 'location_update', lat, lng, jobId });
  }

  /** True if the WebSocket is open and authenticated. */
  get connected(): boolean {
    return this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _open(): void {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return; // already connecting/open
    if (!this.token) return;

    const url = getWsUrl();
    try {
      this.ws = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      // Authenticate immediately
      this._send({ type: 'auth', token: this.token! });
    };

    this.ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type ?? '');

      if (type === 'auth_ok') {
        this.isAuthenticated = true;
        // Re-join all pending rooms
        for (const room of this.pendingRooms) {
          this._send({ type: 'join', room });
        }
      } else if (type === 'auth_error') {
        // Token invalid — do not reconnect (would just fail again)
        this.token = null;
        this.isAuthenticated = false;
        return;
      }

      const subs = this.listeners.get(type);
      if (subs?.size) {
        for (const fn of subs) fn(msg);
      }
    };

    this.ws.onerror = () => {
      /* errors are always followed by onclose */
    };

    this.ws.onclose = () => {
      this.isAuthenticated = false;
      this.ws = null;
      if (this.token) this._scheduleReconnect();
    };
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token) this._open();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
  }

  private _send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

export const jaiSocket = new JaiSocket();
