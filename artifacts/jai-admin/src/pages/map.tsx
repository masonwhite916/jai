import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminListRequests, getAdminListRequestsQueryKey } from '@workspace/api-client-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { MapPin, Navigation, Phone, Car, Clock, Wifi, WifiOff, AlertTriangle, BellOff } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Fix Leaflet's default icon paths issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom markers using divIcon for better styling
// Colors keyed on SERVICE REQUEST statuses: pending → assigned → in_progress
const createJobMarker = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500',
    assigned: 'bg-blue-500',
    in_progress: 'bg-fuchsia-500'
  };
  
  const bgColor = colors[status] || 'bg-gray-500';
  
  return divIcon({
    className: 'custom-div-icon',
    html: `<div class="w-5 h-5 rounded-full ${bgColor} border-2 border-white shadow-md flex items-center justify-center ring-2 ring-black/10"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// ── Freshness helpers ──────────────────────────────────────────────────────────
type Freshness = 'fresh' | 'stale' | 'offline';

function getFreshness(seenAt: string | null | undefined): Freshness {
  if (!seenAt) return 'offline';
  const mins = differenceInMinutes(new Date(), new Date(seenAt));
  if (mins < 2) return 'fresh';
  if (mins < 10) return 'stale';
  return 'offline';
}

// ── Idle detection ─────────────────────────────────────────────────────────────
// A technician is "idle" when their GPS is still reporting (not offline)
// but their position hasn't changed significantly in > IDLE_MINUTES.
const IDLE_MINUTES = 15;

function isIdleTech(
  freshness: Freshness,
  lastMovedAt: string | null | undefined,
): boolean {
  if (freshness === 'offline') return false; // offline is its own state
  if (!lastMovedAt) return false;
  return differenceInMinutes(new Date(), new Date(lastMovedAt)) >= IDLE_MINUTES;
}

const freshnessMeta: Record<Freshness, { bg: string; ring: string; label: string; badgeClass: string }> = {
  fresh:   { bg: '#10b981', ring: '#6ee7b7', label: 'Live',    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  stale:   { bg: '#f59e0b', ring: '#fcd34d', label: 'Stale',   badgeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
  offline: { bg: '#94a3b8', ring: '#cbd5e1', label: 'Offline', badgeClass: 'bg-slate-100 text-slate-500 border-slate-300' },
};

const createTechIcon = (freshness: Freshness, idle: boolean) => {
  const { bg, ring } = freshnessMeta[freshness];
  const opacity = freshness === 'offline' ? '0.55' : '1';

  // Navigation arrow SVG (same as before)
  const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>`;

  // Small warning badge overlaid on bottom-right when idle
  const idleBadge = idle
    ? `<div style="position:absolute;bottom:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#f97316;border:1.5px solid white;display:flex;align-items:center;justify-content:center;">
         <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
       </div>`
    : '';

  return divIcon({
    className: 'custom-div-icon',
    html: `<div style="position:relative;opacity:${opacity};width:32px;height:32px;border-radius:8px;background:${bg};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35),0 0 0 3px ${ring};display:flex;align-items:center;justify-content:center;overflow:visible;">
             ${arrowSvg}
             ${idleBadge}
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

// ── WS connection status ───────────────────────────────────────────────────────
type WsStatus = 'connecting' | 'connected' | 'disconnected';

// ── Live location overrides from WS (technicianId → {lat, lng, seenAt, lastMovedAt}) ──────
interface LiveLocation {
  lat: number;
  lng: number;
  seenAt: string;
  lastMovedAt: string;
}

// ── Snooze state ───────────────────────────────────────────────────────────────
const SNOOZE_MINUTES = 30;

export default function MapView() {
  const [mounted, setMounted] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  // Map of technicianId → live location pushed over WS
  const [liveLocations, setLiveLocations] = useState<Map<number, LiveLocation>>(new Map());
  // Map of technicianId → snooze-until timestamp
  const [snoozed, setSnoozed] = useState<Map<number, Date>>(new Map());
  // Ticks every 30 s so freshness badges and polling interval update without new WS data
  const [tick, setTick] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether an auth_error was received so we don't auto-reconnect
  const authErrorRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Periodic freshness tick ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── WebSocket connection + admin auth ────────────────────────────────────────
  const connectWs = useCallback(() => {
    // Clear any pending reconnect timer
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    // Don't reconnect if the tab is hidden — wait for visibilitychange
    if (document.visibilityState === 'hidden') return;

    const token = localStorage.getItem('jai_admin_token');
    if (!token) return; // not logged in; nothing to do

    // Close any existing socket before opening a new one
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      existing.onclose = null; // prevent it from scheduling another reconnect
      existing.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => {
      // Authenticate as admin
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data as string) as Record<string, unknown>; }
      catch { return; }

      switch (msg.type) {
        case 'auth_ok':
          setWsStatus('connected');
          // Join the admin room (server also auto-joins, but explicit is clearer)
          ws.send(JSON.stringify({ type: 'join', room: 'admin' }));
          break;

        case 'auth_error':
          // Token invalid — fall back to polling only; don't reconnect
          authErrorRef.current = true;
          ws.close();
          setWsStatus('disconnected');
          break;

        case 'tech_location_admin': {
          const technicianId = Number(msg.technicianId);
          const lat = Number(msg.lat);
          const lng = Number(msg.lng);
          const seenAt = typeof msg.seenAt === 'string' ? msg.seenAt : new Date().toISOString();
          const lastMovedAt = typeof msg.lastMovedAt === 'string' ? msg.lastMovedAt : seenAt;
          if (isNaN(technicianId) || isNaN(lat) || isNaN(lng)) break;
          setLiveLocations(prev => {
            const next = new Map(prev);
            next.set(technicianId, { lat, lng, seenAt, lastMovedAt });
            return next;
          });
          break;
        }

        default:
          break;
      }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      // Don't retry after an auth error (bad token)
      if (authErrorRef.current) return;
      // If tab is visible schedule a 5 s retry; otherwise wait for visibilitychange
      if (document.visibilityState !== 'hidden') {
        reconnectTimer.current = setTimeout(connectWs, 5000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    authErrorRef.current = false;
    connectWs();

    // Reconnect immediately when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const ws = wsRef.current;
        const isDisconnected = !ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;
        if (isDisconnected && !authErrorRef.current) {
          connectWs();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent onclose from scheduling a reconnect during cleanup
        ws.close();
      }
    };
  }, [connectWs]);

  // ── Derive polling interval before queries ───────────────────────────────────
  const hasFreshLocation = useMemo(
    () => Array.from(liveLocations.values()).some(loc => getFreshness(loc.seenAt) === 'fresh'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveLocations, tick]
  );
  const wsLiveAndFresh = wsStatus === 'connected' && hasFreshLocation;
  const pollInterval = wsLiveAndFresh ? 5 * 60 * 1000 : 15000;

  // ── Data fetching (fallback / initial load) ───────────────────────────────────
  const { data: techData } = useAdminListTechnicians({
    query: {
      queryKey: getAdminListTechniciansQueryKey(),
      refetchInterval: pollInterval,
    }
  });

  const technicians = useMemo(() => {
    const list = techData?.technicians ?? [];
    return list
      .map(t => {
        const live = liveLocations.get(t.id);
        if (live) {
          return {
            ...t,
            last_lat: live.lat,
            last_lng: live.lng,
            last_seen_at: live.seenAt,
            last_moved_at: live.lastMovedAt,
          };
        }
        return { ...t, last_moved_at: undefined as string | undefined };
      })
      .filter(t => t.last_lat && t.last_lng);
  }, [techData, liveLocations]);

  const { data: reqData } = useAdminListRequests({}, {
    query: {
      queryKey: getAdminListRequestsQueryKey(),
      refetchInterval: pollInterval,
    }
  });

  // Show active service requests by REQUEST status (not job status)
  const activeRequests = useMemo(() => reqData?.requests.filter(r =>
    (r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress') &&
    r.location_lat && r.location_lng
  ) || [], [reqData]);

  // ── Idle technician list (non-snoozed) ────────────────────────────────────────
  // tick ensures this re-evaluates every 30 s even without new WS data
  const idleTechs = useMemo(() => {
    const now = new Date();
    return technicians.filter(t => {
      const freshness = getFreshness(t.last_seen_at as string | null | undefined);
      const idle = isIdleTech(freshness, t.last_moved_at);
      if (!idle) return false;
      const snoozeUntil = snoozed.get(t.id);
      return !snoozeUntil || snoozeUntil < now;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicians, snoozed, tick]);

  const snooze = useCallback((techId: number) => {
    setSnoozed(prev => {
      const next = new Map(prev);
      const until = new Date();
      until.setMinutes(until.getMinutes() + SNOOZE_MINUTES);
      next.set(techId, until);
      return next;
    });
  }, []);

  // Default to SF Bay Area if no data
  const center: [number, number] = technicians.length > 0 
    ? [technicians[0].last_lat as number, technicians[0].last_lng as number] 
    : [37.7749, -122.4194];

  if (!mounted) return null;

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Overlay control panel */}
      <div className="absolute top-4 left-4 z-[1000] bg-card/95 backdrop-blur shadow-lg border border-border rounded-xl p-4 w-72 flex flex-col gap-4 pointer-events-auto">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-sm tracking-tight">Live Ops Map</h2>
            <div className="flex items-center gap-1.5">
              {wsStatus === 'connected' ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">Live</span>
                </>
              ) : wsStatus === 'connecting' ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-[10px] text-amber-500 font-medium">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">Polling</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-tight">Tracking {technicians.length} technicians and {activeRequests.length} active jobs.</p>
        </div>

        {/* ── Idle alert panel ─────────────────────────────────────────────── */}
        {idleTechs.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[11px] font-semibold text-orange-700">
                {idleTechs.length} technician{idleTechs.length > 1 ? 's' : ''} idle ≥ {IDLE_MINUTES} min
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {idleTechs.map(t => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-orange-800 font-medium truncate">{t.name || `Tech #${t.id}`}</span>
                  <button
                    onClick={() => snooze(t.id)}
                    className="flex items-center gap-1 text-[10px] text-orange-600 hover:text-orange-800 shrink-0"
                    title={`Snooze alert for ${SNOOZE_MINUTES} min`}
                  >
                    <BellOff className="w-3 h-3" />
                    Snooze
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="space-y-2 text-xs">
          {/* Technician pin freshness legend */}
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Technicians</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#10b981' }} />
            <span>Live <span className="text-muted-foreground">(&lt; 2 min)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#f59e0b' }} />
            <span>Stale <span className="text-muted-foreground">(2 – 10 min)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0 opacity-55" style={{ background: '#94a3b8' }} />
            <span>Offline <span className="text-muted-foreground">(&gt; 10 min)</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0 bg-orange-500" />
            <AlertTriangle className="w-2.5 h-2.5 text-orange-500 -ml-1 shrink-0" />
            <span>Idle <span className="text-muted-foreground">(&gt; {IDLE_MINUTES} min no movement)</span></span>
          </div>
          {/* Job pin legend */}
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-1">Jobs</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shrink-0" />
            <span>Pending Request</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shrink-0" />
            <span>Accepted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 border border-white shrink-0" />
            <span>En Route</span>
          </div>
        </div>
      </div>

      <div className="flex-1 z-0 relative isolate">
        <MapContainer 
          center={center} 
          zoom={12} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={false}
        >
          {/* Use a muted tile layer suitable for operations/dispatch */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* Active Jobs */}
          {activeRequests.map(req => (
            <Marker 
              key={`req-${req.id}`}
              position={[req.location_lat as number, req.location_lng as number]}
              icon={createJobMarker(req.status)}
            >
              <Popup className="dispatch-popup">
                <div className="space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Job #{req.id}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {req.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="text-xs space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="w-3.5 h-3.5" />
                      <span className="text-foreground">{req.service_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-foreground truncate block max-w-[180px]">{req.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-foreground">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Technicians — icon color encodes GPS freshness; badge shows idle state */}
          {technicians.map(tech => {
            const freshness = getFreshness(tech.last_seen_at as string | null | undefined);
            const meta = freshnessMeta[freshness];
            const idle = isIdleTech(freshness, tech.last_moved_at);
            const now = new Date();
            const snoozedUntil = snoozed.get(tech.id);
            const isSnoozed = snoozedUntil && snoozedUntil >= now;
            const showIdleAlert = idle && !isSnoozed;

            return (
              <Marker
                key={`tech-${tech.id}`}
                position={[tech.last_lat as number, tech.last_lng as number]}
                icon={createTechIcon(freshness, showIdleAlert)}
              >
                <Popup>
                  <div className="space-y-2 min-w-[180px]">
                    <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
                      <span className="font-bold text-sm">{tech.name || 'Unknown Tech'}</span>
                      <div className="flex items-center gap-1">
                        {showIdleAlert && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-300 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Idle
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-foreground">{tech.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="text-foreground text-[10px]">
                          Last updated {tech.last_seen_at
                            ? formatDistanceToNow(new Date(tech.last_seen_at as string), { addSuffix: true })
                            : 'unknown'}
                        </span>
                      </div>
                      {idle && tech.last_moved_at && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-orange-600 text-[10px]">
                            No movement {formatDistanceToNow(new Date(tech.last_moved_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                    {idle && (
                      <div className="pt-1 border-t border-border">
                        {isSnoozed ? (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <BellOff className="w-3 h-3" />
                            Alert snoozed until {snoozedUntil!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-6 text-[10px] gap-1"
                            onClick={() => snooze(tech.id)}
                          >
                            <BellOff className="w-3 h-3" />
                            Snooze alert ({SNOOZE_MINUTES} min)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
