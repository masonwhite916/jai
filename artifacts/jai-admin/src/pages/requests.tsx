import { useState, useRef, useEffect, useCallback } from 'react';
import { useAdminListRequests, getAdminListRequestsQueryKey, useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminReassignJob, useAdminCancelRequest } from '@workspace/api-client-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, Filter, MoreVertical, MapPin, Car, AlertCircle, Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Service-request statuses: pending → assigned → in_progress → completed/cancelled
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  assigned: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive"
};

/** Hook: connects to the admin WS room and calls `onNewRequest` on each new_request event. */
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
      try { msg = JSON.parse(event.data as string) as Record<string, unknown>; }
      catch { return; }

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
        default:
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

export default function Requests() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  // IDs of requests that just arrived via WS — gets a highlight class briefly
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  const queryParams = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(serviceFilter !== 'all' ? { service_type: serviceFilter } : {})
  };

  const { data, isLoading } = useAdminListRequests(queryParams, {
    query: {
      queryKey: getAdminListRequestsQueryKey(queryParams),
      refetchInterval: 15000 // Poll every 15s as fallback
    }
  });

  // Real-time: handle incoming new_request from WS
  const handleNewRequest = useCallback((requestId: number, serviceType: string, customerName: string | null) => {
    // Refresh the list immediately (bypasses 304 cache)
    queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });

    // Toast notification
    const label = serviceType.replace(/_/g, ' ');
    const who = customerName ? ` from ${customerName}` : '';
    toast(`New ${label} request${who}`, {
      icon: <Bell className="w-4 h-4 text-amber-500" />,
      description: `Request #${requestId} is waiting for a technician.`,
      duration: 8000,
      action: {
        label: 'View',
        onClick: () => {
          // Clear filters so the new row is visible
          setStatusFilter('all');
          setServiceFilter('all');
          setSearch('');
        },
      },
    });

    // Highlight the new row for 4 seconds
    setNewIds(prev => new Set(prev).add(requestId));
    setTimeout(() => {
      setNewIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }, 4000);
  }, [queryClient]);

  useAdminWs(handleNewRequest);

  const requests = data?.requests || [];
  
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

  const cancelMutation = useAdminCancelRequest({
    mutation: {
      onSuccess: () => {
        toast.success("Request cancelled successfully");
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
      },
      onError: (err: any) => {
        toast.error(err?.error || "Failed to cancel request");
      }
    }
  });

  const cancelRequestFnRef = useRef(cancelMutation.mutate);
  cancelRequestFnRef.current = cancelMutation.mutate;

  const handleCancel = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this request? This action cannot be undone.")) {
      cancelRequestFnRef.current({ id });
    }
  };

  return (
    <div className="p-8 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Requests</h1>
          <p className="text-sm text-muted-foreground">Manage and track all active and historical jobs.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, customer name, or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-background">
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
          <SelectTrigger className="w-[180px] bg-background">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span><SelectValue placeholder="Service Type" /></span>
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

      <div className="flex-1 overflow-auto border border-border/50 rounded-xl bg-card shadow-sm relative">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="animate-pulse flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
                return (
                  <TableRow
                    key={req.id}
                    className={`transition-colors duration-[3000ms] ${isNew ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}
                  >
                    <TableCell className="font-medium text-xs">
                      #{req.id}
                      {isNew && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 rounded px-1 py-0.5">New</span>}
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
                    <TableCell>
                      <div className="flex items-center gap-1.5 max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate" title={req.address || ''}>
                          {req.address || 'Coordinates only'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
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
                      <div className="flex flex-col" title={format(new Date(req.created_at), 'PPpp')}>
                        <span className="text-sm">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
    </div>
  );
}

function ReassignDialog({ requestId, currentTechId, isPending }: { requestId: number, currentTechId?: number | null, isPending?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const queryClient = useQueryClient();

  const isAssign = isPending || !currentTechId;

  const { data, isLoading } = useAdminListTechnicians({
    query: { 
      queryKey: getAdminListTechniciansQueryKey(),
      enabled: open
    }
  });

  const reassignMutation = useAdminReassignJob({
    mutation: {
      onSuccess: () => {
        toast.success(isAssign ? "Technician assigned successfully" : "Job reassigned successfully");
        setOpen(false);
        setSelectedTech('');
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
      },
      onError: (err: any) => {
        toast.error(err?.error || (isAssign ? "Failed to assign technician" : "Failed to reassign job"));
      }
    }
  });

  const handleConfirm = () => {
    if (!selectedTech) return;
    reassignMutation.mutate({ 
      id: requestId, 
      data: { technician_id: parseInt(selectedTech, 10) } 
    });
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
            {isAssign
              ? "Pick a technician to dispatch to this unassigned request."
              : "Select a different technician to take over this job."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading technicians...</div>
          ) : !data?.technicians.length ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No technicians available.</div>
          ) : (
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger>
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                {data.technicians.map(tech => (
                  <SelectItem 
                    key={tech.id} 
                    value={tech.id.toString()}
                    disabled={tech.id === currentTechId}
                  >
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
