import { useState, useRef, useEffect, useCallback } from 'react';
import { useAdminListRequests, getAdminListRequestsQueryKey, useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminReassignJob, useAdminCancelRequest } from '@workspace/api-client-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, Filter, MoreVertical, MapPin, Car, AlertCircle, Bell, X, User, FileText, Clock, Phone, Wrench, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminRequest = {
  id: number;
  status: string;
  service_type: string;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_plate?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  customer: { id: number; name?: string | null; phone: string };
  job?: {
    id?: number | null;
    status?: string | null;
    payout?: number | null;
    technician_id?: number | null;
    technician_name?: string | null;
    technician_phone?: string | null;
    accepted_at?: string | null;
    completed_at?: string | null;
  } | null;
};

// ── Status colours ─────────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  assigned: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

// ── Mini-map pin ───────────────────────────────────────────────────────────────

const pinIcon = divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Admin WS hook ──────────────────────────────────────────────────────────────

function useAdminWs(onNewRequest: (requestId: number, serviceType: string, customerName: string | null) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authErrorRef = useRef(false);
  const onNewRequestRef = useRef(onNewRequest);
  onNewRequestRef.current = onNewRequest;

  const connect = useCallback(() => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    if (document.visibilityState === 'hidden') return;

    const token = localStorage.getItem('jai_admin_token');
    if (!token) return;

    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      existing.onclose = null;
      existing.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data as string) as Record<string, unknown>; } catch { return; }
      switch (msg.type) {
        case 'auth_ok':
          ws.send(JSON.stringify({ type: 'join', room: 'admin' }));
          break;
        case 'auth_error':
          authErrorRef.current = true;
          ws.close();
          break;
        case 'new_request':
          onNewRequestRef.current(
            Number(msg.request_id),
            typeof msg.service_type === 'string' ? msg.service_type : 'service',
            typeof msg.customer_name === 'string' ? msg.customer_name : null,
          );
          break;
      }
    };

    ws.onclose = () => {
      if (authErrorRef.current) return;
      if (document.visibilityState !== 'hidden') {
        reconnectTimer.current = setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    authErrorRef.current = false;
    connect();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const ws = wsRef.current;
        const dead = !ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;
        if (dead && !authErrorRef.current) connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [connect]);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Requests() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // Close drawer on Escape
  useEffect(() => {
    if (!selectedRequest) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedRequest(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedRequest]);

  // Close drawer on click outside
  useEffect(() => {
    if (!selectedRequest) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setSelectedRequest(null);
      }
    };
    // Delay so the row-click that opened the drawer doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [selectedRequest]);

  const queryParams = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(serviceFilter !== 'all' ? { service_type: serviceFilter } : {}),
  };

  const { data, isLoading } = useAdminListRequests(queryParams, {
    query: { queryKey: getAdminListRequestsQueryKey(queryParams), refetchInterval: 15000 },
  });

  const handleNewRequest = useCallback((requestId: number, serviceType: string, customerName: string | null) => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
    const label = serviceType.replace(/_/g, ' ');
    const who = customerName ? ` from ${customerName}` : '';
    toast(`New ${label} request${who}`, {
      icon: <Bell className="w-4 h-4 text-amber-500" />,
      description: `Request #${requestId} is waiting for a technician.`,
      duration: 8000,
      action: {
        label: 'View',
        onClick: () => { setStatusFilter('all'); setServiceFilter('all'); setSearch(''); },
      },
    });
    setNewIds(prev => new Set(prev).add(requestId));
    setTimeout(() => {
      setNewIds(prev => { const next = new Set(prev); next.delete(requestId); return next; });
    }, 4000);
  }, [queryClient]);

  useAdminWs(handleNewRequest);

  const cancelMutation = useAdminCancelRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Request cancelled successfully");
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
        setSelectedRequest(null);
      },
      onError: (err: any) => toast.error(err?.error || "Failed to cancel request"),
    },
  });

  const cancelRequestFnRef = useRef(cancelMutation.mutate);
  cancelRequestFnRef.current = cancelMutation.mutate;

  const handleCancel = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this request? This action cannot be undone.")) {
      cancelRequestFnRef.current({ id });
    }
  };

  const requests = (data?.requests || []) as AdminRequest[];
  const filteredRequests = requests.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.customer.name?.toLowerCase().includes(term) ||
      r.customer.phone.includes(term) ||
      r.address?.toLowerCase().includes(term) ||
      r.id.toString() === term
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Service Requests</h1>
        <p className="text-sm text-muted-foreground">Manage and track all active and historical jobs.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 flex-shrink-0 bg-card p-3 md:p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span><SelectValue placeholder="Status" /></span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[160px] bg-background flex-shrink-0">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span><SelectValue placeholder="Service" /></span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="battery">Battery</SelectItem>
            <SelectItem value="tow">Tow</SelectItem>
            <SelectItem value="tire">Tire</SelectItem>
            <SelectItem value="lockout">Lockout</SelectItem>
            <SelectItem value="fuel">Fuel</SelectItem>
            <SelectItem value="mechanic">Mechanic</SelectItem>
            <SelectItem value="electric">Electric</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile card list (< md) ──────────────────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-auto space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center text-muted-foreground py-16">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p>No requests found matching your filters.</p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isNew = newIds.has(req.id);
            const isSelected = selectedRequest?.id === req.id;
            return (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className={[
                  'rounded-xl border bg-card shadow-sm p-4 cursor-pointer transition-colors active:scale-[0.99]',
                  isNew ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30' : 'border-border/50',
                  isSelected ? 'ring-2 ring-primary/40' : '',
                ].join(' ')}
              >
                {/* Top row: status badge + service + actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={STATUS_VARIANTS[req.status] || "secondary"} className="capitalize text-[10px] uppercase tracking-wider font-semibold">
                      {req.status.replace(/_/g, ' ')}
                    </Badge>
                    {isNew && (
                      <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 rounded px-1.5 py-0.5">New</span>
                    )}
                  </div>
                  {/* Actions button — stops propagation so the card click doesn't fire */}
                  <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 -mr-1 -mt-1">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <ReassignDialog requestId={req.id} currentTechId={req.job?.technician_id} isPending={req.status === 'pending'} />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleCancel(req.id)}
                          disabled={req.status === 'cancelled' || req.status === 'completed'}
                        >
                          Cancel Request
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Service + ID */}
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-base font-semibold capitalize leading-tight">
                    {req.service_type.replace(/_/g, ' ')}
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">#{req.id}</span>
                </div>

                {/* Customer */}
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium">{req.customer.name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">{req.customer.phone}</span>
                </div>

                {/* Bottom row: technician + time */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                  {req.job?.technician_name ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                        {req.job.technician_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium">{req.job.technician_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Unassigned
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1" title={format(new Date(req.created_at), 'PPpp')}>
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
      <div className="hidden md:block flex-1 overflow-auto border border-border/50 rounded-xl bg-card shadow-sm relative">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Technician</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="animate-pulse flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading requests...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p>No requests found matching your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => {
                const isNew = newIds.has(req.id);
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <TableRow
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={[
                      'cursor-pointer transition-colors',
                      isNew ? 'bg-amber-50 dark:bg-amber-950/30 duration-[3000ms]' : '',
                      isSelected ? 'bg-primary/5 hover:bg-primary/5' : 'hover:bg-muted/40',
                    ].join(' ')}
                  >
                    <TableCell className="font-medium text-xs">
                      #{req.id}
                      {isNew && <span className="ml-1.5 inline-flex items-center text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 rounded px-1 py-0.5">New</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[req.status] || "secondary"} className="capitalize text-[10px] uppercase tracking-wider font-semibold">
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{req.customer.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{req.customer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="capitalize text-sm font-medium">{req.service_type.replace(/_/g, ' ')}</span>
                        {req.vehicle_make && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {req.vehicle_make} {req.vehicle_model}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate" title={req.address || ''}>{req.address || 'Coordinates only'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {req.job?.technician_name ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {req.job.technician_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{req.job.technician_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm" title={format(new Date(req.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <ReassignDialog requestId={req.id} currentTechId={req.job?.technician_id} isPending={req.status === 'pending'} />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => handleCancel(req.id)}
                            disabled={req.status === 'cancelled' || req.status === 'completed'}
                          >
                            Cancel Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail drawer ───────────────────────────────────────────────────── */}
      {selectedRequest && (
        <RequestDetailDrawer
          ref={drawerRef}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
            setSelectedRequest(null);
          }}
          onCancelled={() => handleCancel(selectedRequest.id)}
        />
      )}
    </div>
  );
}

// ── Request Detail Drawer ─────────────────────────────────────────────────────

import { forwardRef } from 'react';

const RequestDetailDrawer = forwardRef<HTMLDivElement, {
  request: AdminRequest;
  onClose: () => void;
  onAssigned: () => void;
  onCancelled: () => void;
}>(function RequestDetailDrawer({ request, onClose, onAssigned, onCancelled }, ref) {
  const queryClient = useQueryClient();
  const req = request;
  const isAssign = req.status === 'pending' || !req.job?.technician_id;
  const canCancel = req.status !== 'cancelled' && req.status !== 'completed';
  const hasCoords = req.location_lat && req.location_lng;

  return (
    <div
      ref={ref}
      className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-background border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Request</p>
            <h2 className="text-lg font-bold leading-tight">#{req.id}</h2>
          </div>
          <Badge variant={STATUS_VARIANTS[req.status] || "secondary"} className="capitalize text-[10px] uppercase tracking-wider font-semibold">
            {req.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Service + time */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Service</p>
            <p className="text-base font-semibold capitalize">{req.service_type.replace(/_/g, ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" /> Elapsed
            </p>
            <p className="text-sm font-medium" title={format(new Date(req.created_at), 'PPpp')}>
              {formatDistanceToNow(new Date(req.created_at), { addSuffix: false })}
            </p>
          </div>
        </div>

        <Separator />

        {/* Customer */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Customer
          </p>
          <div className="bg-muted/40 rounded-lg px-4 py-3 space-y-2">
            <p className="font-semibold text-sm">{req.customer.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {req.customer.phone}
            </p>
          </div>
        </div>

        {/* Vehicle */}
        {(req.vehicle_make || req.vehicle_plate) && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" /> Vehicle
            </p>
            <div className="bg-muted/40 rounded-lg px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              {req.vehicle_make && (
                <>
                  <span className="text-muted-foreground">Make / Model</span>
                  <span className="font-medium">{req.vehicle_make} {req.vehicle_model}</span>
                </>
              )}
              {req.vehicle_plate && (
                <>
                  <span className="text-muted-foreground">Plate</span>
                  <span className="font-mono font-semibold tracking-wider">{req.vehicle_plate}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {req.notes ? (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </p>
            <div className="bg-muted/40 rounded-lg px-4 py-3">
              <p className="text-sm leading-relaxed">{req.notes}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </p>
            <p className="text-sm text-muted-foreground italic">No notes provided.</p>
          </div>
        )}

        {/* Location + mini map */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Location
          </p>
          {req.address && (
            <p className="text-sm mb-3 text-foreground">{req.address}</p>
          )}
          {hasCoords ? (
            <div className="h-44 rounded-xl overflow-hidden border border-border">
              <MapContainer
                key={req.id}
                center={[req.location_lat as number, req.location_lng as number]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <Marker
                  position={[req.location_lat as number, req.location_lng as number]}
                  icon={pinIcon}
                />
              </MapContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No coordinates recorded.</p>
          )}
        </div>

        {/* Assigned technician */}
        {req.job?.technician_name && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Assigned Technician
            </p>
            <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {req.job.technician_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{req.job.technician_name}</p>
                {req.job.technician_phone && (
                  <p className="text-xs text-muted-foreground">{req.job.technician_phone}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex-shrink-0 border-t border-border p-4 flex gap-3">
        <AssignInDrawer
          requestId={req.id}
          currentTechId={req.job?.technician_id}
          isAssign={isAssign}
          onDone={onAssigned}
        />
        {canCancel && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={onCancelled}
          >
            Cancel Request
          </Button>
        )}
      </div>
    </div>
  );
});

// ── Assign button inside the drawer ──────────────────────────────────────────

function AssignInDrawer({ requestId, currentTechId, isAssign, onDone }: {
  requestId: number;
  currentTechId?: number | null;
  isAssign: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');

  const { data, isLoading } = useAdminListTechnicians({
    query: { queryKey: getAdminListTechniciansQueryKey(), enabled: open },
  });

  const reassignMutation = useAdminReassignJob({
    mutation: {
      onSuccess: () => {
        toast.success(isAssign ? "Technician assigned successfully" : "Job reassigned successfully");
        setOpen(false);
        setSelectedTech('');
        onDone();
      },
      onError: (err: any) => toast.error(err?.error || "Failed to assign technician"),
    },
  });

  const handleConfirm = () => {
    if (!selectedTech) return;
    reassignMutation.mutate({ id: requestId, data: { technician_id: parseInt(selectedTech, 10) } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedTech(''); }}>
      <DialogTrigger asChild>
        <Button className="flex-1">
          {isAssign ? "Assign Technician" : "Reassign Job"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isAssign ? `Assign Technician — Request #${requestId}` : `Reassign Job #${requestId}`}</DialogTitle>
          <DialogDescription>
            {isAssign ? "Pick a technician to dispatch to this unassigned request." : "Select a different technician to take over this job."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading technicians...</div>
          ) : !data?.technicians.length ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No technicians available.</div>
          ) : (
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger><SelectValue placeholder="Select a technician" /></SelectTrigger>
              <SelectContent>
                {data.technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id.toString()} disabled={tech.id === currentTechId}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tech.name || tech.phone}</span>
                      {tech.id === currentTechId && <span className="text-xs text-muted-foreground ml-2">(Current)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedTech || reassignMutation.isPending}>
            {reassignMutation.isPending ? "Assigning..." : (isAssign ? "Assign & Dispatch" : "Confirm Dispatch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Row dropdown ReassignDialog (kept for quick access from the row menu) ─────

function ReassignDialog({ requestId, currentTechId, isPending }: {
  requestId: number;
  currentTechId?: number | null;
  isPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const queryClient = useQueryClient();
  const isAssign = isPending || !currentTechId;

  const { data, isLoading } = useAdminListTechnicians({
    query: { queryKey: getAdminListTechniciansQueryKey(), enabled: open },
  });

  const reassignMutation = useAdminReassignJob({
    mutation: {
      onSuccess: () => {
        toast.success(isAssign ? "Technician assigned successfully" : "Job reassigned successfully");
        setOpen(false);
        setSelectedTech('');
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
      },
      onError: (err: any) => toast.error(err?.error || (isAssign ? "Failed to assign technician" : "Failed to reassign job")),
    },
  });

  const handleConfirm = () => {
    if (!selectedTech) return;
    reassignMutation.mutate({ id: requestId, data: { technician_id: parseInt(selectedTech, 10) } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedTech(''); }}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          {isAssign ? "Assign Technician" : "Reassign Job"}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isAssign ? `Assign Technician — Request #${requestId}` : `Reassign Job #${requestId}`}</DialogTitle>
          <DialogDescription>
            {isAssign ? "Pick a technician to dispatch to this unassigned request." : "Select a different technician to take over this job."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading technicians...</div>
          ) : !data?.technicians.length ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No technicians available.</div>
          ) : (
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger><SelectValue placeholder="Select a technician" /></SelectTrigger>
              <SelectContent>
                {data.technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id.toString()} disabled={tech.id === currentTechId}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tech.name || tech.phone}</span>
                      {tech.id === currentTechId && <span className="text-xs text-muted-foreground ml-2">(Current)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedTech || reassignMutation.isPending}>
            {reassignMutation.isPending
              ? (isAssign ? "Assigning..." : "Reassigning...")
              : (isAssign ? "Assign & Dispatch" : "Confirm Dispatch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
