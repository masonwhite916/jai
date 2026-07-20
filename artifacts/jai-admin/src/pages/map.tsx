import { useEffect, useState, useMemo } from 'react';
import { useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminListRequests, getAdminListRequestsQueryKey } from '@workspace/api-client-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { MapPin, Navigation, Phone, Car, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

const techIcon = divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-8 h-8 rounded-lg bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

export default function MapView() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll every 15 seconds
  const { data: techData } = useAdminListTechnicians({
    query: { queryKey: getAdminListTechniciansQueryKey(), refetchInterval: 15000 }
  });

  const { data: reqData } = useAdminListRequests({}, {
    query: { queryKey: getAdminListRequestsQueryKey(), refetchInterval: 15000 }
  });

  const technicians = useMemo(() => techData?.technicians.filter(t => t.last_lat && t.last_lng) || [], [techData]);
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
          <h2 className="font-bold text-sm tracking-tight mb-1">Live Ops Map</h2>
          <p className="text-xs text-muted-foreground leading-tight">Tracking {technicians.length} technicians and {activeRequests.length} active jobs.</p>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-900 border border-white shrink-0" />
            <span>Active Technician</span>
          </div>
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

          {/* Technicians */}
          {technicians.map(tech => (
            <Marker
              key={`tech-${tech.id}`}
              position={[tech.last_lat as number, tech.last_lng as number]}
              icon={techIcon}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="font-bold text-sm border-b border-border pb-2">{tech.name || 'Unknown Tech'}</div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-foreground">{tech.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Navigation className="w-3.5 h-3.5" />
                      <span className="text-foreground text-[10px]">
                        Last updated {tech.last_seen_at ? formatDistanceToNow(new Date(tech.last_seen_at), { addSuffix: true }) : 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
