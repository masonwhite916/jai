import { useState, useRef } from 'react';
import { useAdminListRequests, getAdminListRequestsQueryKey, useAdminListTechnicians, getAdminListTechniciansQueryKey, useAdminReassignJob, useAdminCancelRequest } from '@workspace/api-client-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Search, Filter, MoreVertical, MapPin, User, Car, AlertCircle } from 'lucide-react';
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

export default function Requests() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const queryClient = useQueryClient();

  const queryParams = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(serviceFilter !== 'all' ? { service_type: serviceFilter } : {})
  };

  const { data, isLoading } = useAdminListRequests(queryParams, {
    query: {
      queryKey: getAdminListRequestsQueryKey(queryParams),
      refetchInterval: 15000 // Poll every 15s
    }
  });

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
            <SelectItem value="tow">Tow</SelectItem>
            <SelectItem value="jump_start">Jump Start</SelectItem>
            <SelectItem value="tire_change">Tire Change</SelectItem>
            <SelectItem value="lockout">Lockout</SelectItem>
            <SelectItem value="fuel_delivery">Fuel Delivery</SelectItem>
            <SelectItem value="winch_out">Winch Out</SelectItem>
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
              filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium text-xs">#{req.id}</TableCell>
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
                      <span className="capitalize text-sm font-medium">{req.service_type.replace('_', ' ')}</span>
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
                        <ReassignDialog requestId={req.id} currentTechId={req.job?.technician_id} />
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ReassignDialog({ requestId, currentTechId }: { requestId: number, currentTechId?: number | null }) {
  const [open, setOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useAdminListTechnicians({
    query: { 
      queryKey: getAdminListTechniciansQueryKey(),
      enabled: open
    }
  });

  const reassignMutation = useAdminReassignJob({
    mutation: {
      onSuccess: () => {
        toast.success("Job reassigned successfully");
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/requests'] });
      },
      onError: (err: any) => {
        toast.error(err?.error || "Failed to reassign job");
      }
    }
  });

  const handleReassign = () => {
    if (!selectedTech) return;
    reassignMutation.mutate({ 
      id: requestId, 
      data: { technician_id: parseInt(selectedTech, 10) } 
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Reassign Job
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reassign Job #{requestId}</DialogTitle>
          <DialogDescription>
            Select a new technician to dispatch to this location.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading technicians...</div>
          ) : (
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger>
                <SelectValue placeholder="Select a technician" />
              </SelectTrigger>
              <SelectContent>
                {data?.technicians.map(tech => (
                  <SelectItem 
                    key={tech.id} 
                    value={tech.id.toString()}
                    disabled={tech.id === currentTechId}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{tech.name}</span>
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
          <Button onClick={handleReassign} disabled={!selectedTech || reassignMutation.isPending}>
            {reassignMutation.isPending ? "Reassigning..." : "Confirm Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
