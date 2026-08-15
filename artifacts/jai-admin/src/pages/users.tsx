import {
  useAdminListUsers,
  useAdminCreateUser,
  useAdminDeleteUser,
  getAdminListUsersQueryKey,
} from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, UserCircle, Wrench, Phone, Calendar, Briefcase, UserPlus, Trash2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Role = '' | 'customer' | 'technician';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'technician', label: 'Technicians' },
];

export default function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role>('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'customer' | 'technician'>('customer');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string | null | undefined; phone: string } | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useAdminListUsers(undefined, {
    query: { queryKey: getAdminListUsersQueryKey(), refetchInterval: 60000 },
  });

  const createMutation = useAdminCreateUser({
    mutation: {
      onSuccess: (user) => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast.success(`${user.role === 'technician' ? 'Technician' : 'Customer'} ${user.name || user.phone} added`);
        setAddOpen(false);
        setNewName('');
        setNewPhone('');
        setNewRole('customer');
      },
      onError: (err: any) => {
        toast.error(err?.data?.error ?? err?.message ?? 'Failed to add user');
      },
    },
  });

  const deleteMutation = useAdminDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast.success('User deleted');
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(err?.data?.error ?? err?.message ?? 'Failed to delete user');
      },
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) { toast.error('Phone number is required'); return; }
    createMutation.mutate({ data: { name: newName.trim() || undefined, phone: newPhone.trim(), role: newRole } });
  };

  const sorted = useMemo(() => {
    return (data?.users ?? [])
      .filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (!search) return true;
        const term = search.toLowerCase();
        return u.name?.toLowerCase().includes(term) || u.phone.includes(term);
      })
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'technician' ? -1 : 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [data, roleFilter, search]);

  return (
    <div className="p-4 md:p-8 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registered Users</h1>
          <p className="text-sm text-muted-foreground">All customers and technicians in the system.</p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={[
                  'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                  roleFilter === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card shadow-sm"
            />
          </div>

          <Button onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {!isLoading && !isError && (
        <p className="text-xs text-muted-foreground -mt-2 flex-shrink-0">
          {sorted.length} {sorted.length === 1 ? 'user' : 'users'}
        </p>
      )}

      {isLoading ? (
        <div className="flex-1 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-card border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-destructive text-sm">Failed to load users.</p>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() })}>
            Retry
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No users found.
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-border/60 bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Jobs</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {sorted.map((u) => (
                <tr key={`${u.role}-${u.id}`} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm flex-shrink-0">
                        {u.name ? u.name.charAt(0).toUpperCase() : '#'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate">
                          {u.name || <span className="text-muted-foreground italic">No name</span>}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{u.phone}
                        </p>
                        <div className="sm:hidden mt-1"><RoleBadge role={u.role} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {u.role === 'technician' ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="text-foreground font-medium">{u.jobs_completed}</span>
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {u.created_at ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDistanceToNow(parseISO(u.created_at), { addSuffix: true })}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget({ id: u.id, name: u.name, phone: u.phone })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-2">
                {(['customer', 'technician'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={[
                      'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                      newRole === r
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    ].join(' ')}
                  >
                    {r === 'customer' ? '👤 Customer' : '🔧 Technician'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                placeholder="e.g. Ahmed Al-Rashidi"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-phone"
                placeholder="+966 5X XXX XXXX"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                type="tel"
              />
              <p className="text-xs text-muted-foreground">
                {newRole === 'technician'
                  ? 'The technician will use this number to log into the driver app.'
                  : 'The customer will use this number to log into the customer app.'}
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding…' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || deleteTarget?.phone}
              </span>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isTech = role === 'technician';
  return (
    <span className={[
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      isTech
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    ].join(' ')}>
      {isTech ? <Wrench className="w-3 h-3" /> : <UserCircle className="w-3 h-3" />}
      {isTech ? 'Technician' : 'Customer'}
    </span>
  );
}
