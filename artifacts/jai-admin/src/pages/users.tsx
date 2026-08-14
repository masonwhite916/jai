import { useAdminListUsers, getAdminListUsersQueryKey } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Wrench, Phone, Calendar, Star, Briefcase } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useState } from 'react';

const ROLE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'technician', label: 'Technicians' },
] as const;

const MEMBERSHIP_COLORS: Record<string, string> = {
  none:      'secondary',
  basic:     'outline',
  premium:   'default',
  accidents: 'destructive',
  rental:    'default',
};

export default function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'customer' | 'technician'>('');

  const params = roleFilter ? { role: roleFilter } : undefined;

  const { data, isLoading, isError } = useAdminListUsers(params, {
    query: {
      queryKey: getAdminListUsersQueryKey(params),
      refetchInterval: 60000,
    },
  });

  const users = data?.users ?? [];

  const filtered = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.phone.includes(term)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registered Users</h1>
          <p className="text-sm text-muted-foreground">All customers and technicians in the system.</p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Role filter pills */}
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

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Count */}
      {!isLoading && !isError && (
        <p className="text-xs text-muted-foreground -mt-2 flex-shrink-0">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </p>
      )}

      {/* Table / States */}
      {isLoading ? (
        <div className="flex-1 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-card border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-destructive text-sm">Failed to load users.</p>
        </div>
      ) : filtered.length === 0 ? (
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Membership</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Jobs</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Points</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  {/* Name + phone */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-sm flex-shrink-0">
                        {u.name ? u.name.charAt(0).toUpperCase() : '#'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate">{u.name || <span className="text-muted-foreground italic">No name</span>}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {u.phone}
                        </p>
                        {/* Role badge — visible only on mobile */}
                        <div className="sm:hidden mt-1">
                          <RoleBadge role={u.role} />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Membership */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={(MEMBERSHIP_COLORS[u.membership] ?? 'secondary') as any} className="capitalize text-xs">
                      {u.membership === 'none' ? '—' : u.membership}
                    </Badge>
                  </td>

                  {/* Jobs completed */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="text-foreground font-medium">{u.jobs_completed}</span>
                    </span>
                  </td>

                  {/* Points */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-foreground font-medium">{u.points}</span>
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDistanceToNow(parseISO(u.created_at), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
