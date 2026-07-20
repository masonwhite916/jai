import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminListRequests, getAdminListRequestsQueryKey } from '@workspace/api-client-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { MapPin, Navigation, Phone, Car, Clock, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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

const freshnessMeta: Record<Freshness, { bg: string; ring: string; label: string; badgeClass: string }> = {
  fresh:   { bg: '#10b981', ring: '#6ee7b7', label: 'Live',    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  stale:   { bg: '#f59e0b', ring: '#fcd34d', label: 'Stale',   badgeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
  offline: { bg: '#94a3b8', ring: '#cbd5e1', label: 'Offline', badgeClass: 'bg-slate-100 text-slate-500 border-slate-300' },
};

const createTechIcon = (freshness: Freshness) => {
  const { bg, ring } = freshnessMeta[freshness];
  const opacity = freshness === 'offline' ? '0.55' : '1';
  return divIcon({
    className: 'custom-div-icon',
    html: `<div style="opacity:${opacity};width:32px;height:32px;border-radius:8px;background:${bg};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35),0 0 0 3px ${ring};display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

// ── WS connection status ───────────────────────────────────────────────────────
type WsStatus = 'connecting' | 'connected' | 'disconnected';

// ── Live location overrides from WS (technicianId → {lat, lng, seenAt}) ──────
interface LiveLocation {
  lat: number;
  lng: number;
  seenAt: string;
}

export default function MapView() {
  const [mounted, setMounted] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  // Map of technicianId → live location pushed over WS
  const [liveLocations, setLiveLocations] = useState<Map<number, LiveLocation>>(new Map());
  // Ticks every 30 s so freshness badges and polling interval update without new WS data
  const [tick, setTick] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const token = localStorage.getItem('jai_admin_token');
    if (!token) return; // not logged in; nothing to do

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
          ws.close();
          setWsStatus('disconnected');
          break;

        case 'tech_location_admin': {
          const technicianId = Number(msg.technicianId);
          const lat = Number(msg.lat);
          const lng = Number(msg.lng);
          const seenAt = typeof msg.seenAt === 'string' ? msg.seenAt : new Date().toISOString();
          if (isNaN(technicianId) || isNaN(lat) || isNaN(lng)) break;
          setLiveLocations(prev => {
            const next = new Map(prev);
            next.set(technicianId, { lat, lng, seenAt });
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
      // Reconnect after 5 s
      reconnectTimer.current = setTimeout(connectWs, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Derive polling interval before queries ───────────────────────────────────
  // hasFreshLocation reads directly from liveLocations (WS-pushed data) so
  // it doesn't create a circular dependency with techData.
  // tick (updated every 30 s) ensures this re-evaluates even with no new WS push.
  const hasFreshLocation = useMemo(
    () => Array.from(liveLocations.values()).some(loc => getFreshness(loc.seenAt) === 'fresh'),
    // tick is intentional: it forces re-evaluation every 30 s so that a location
    // that ages past the 2-min threshold causes the polling interval to revert to 15 s
    // even when no new WS messages arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveLocations, tick]
  );
  // Only back off polling when WS is live AND at least one fresh GPS push arrived.
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
          return { ...t, last_lat: live.lat, last_lng: live.lng, last_seen_at: live.seenAt };
        }
        return t;
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
  // assigned = technician accepted; in_progress = service underway
  const activeRequests = useMemo(() => reqData?.requests.filter(r =>
    (r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress') &&
    r.location_lat && r.location_lng
  ) || [], [reqData]);

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

          {/* Technicians — icon color encodes GPS freshness */}
          {technicians.map(tech => {
            const freshness = getFreshness(tech.last_seen_at as string | null | undefined);
            const meta = freshnessMeta[freshness];
            return (
              <Marker
                key={`tech-${tech.id}`}
                position={[tech.last_lat as number, tech.last_lng as number]}
                icon={createTechIcon(freshness)}
              >
                <Popup>
                  <div className="space-y-2 min-w-[180px]">
                    <div className="flex items-center justify-between border-b border-border pb-2 gap-2">
                      <span className="font-bold text-sm">{tech.name || 'Unknown Tech'}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
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
                    </div>
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
