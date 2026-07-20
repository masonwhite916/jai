import { useAdminListTechnicians, getAdminListTechniciansQueryKey } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Star, Briefcase, DollarSign, Clock, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export default function Technicians() {
  const [search, setSearch] = useState('');
  
  const { data, isLoading, isError } = useAdminListTechnicians({
    query: {
      queryKey: getAdminListTechniciansQueryKey(),
      refetchInterval: 30000 // Poll every 30s
    }
  });

  const technicians = data?.technicians || [];
  
  const filteredTechs = technicians.filter(tech => {
    if (!search) return true;
    const term = search.toLowerCase();
    return tech.name?.toLowerCase().includes(term) || tech.phone.includes(term);
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="p-8 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technician Roster</h1>
          <p className="text-sm text-muted-foreground">Monitor fleet performance, status, and earnings.</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Find technician..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-48 bg-card border border-border/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-destructive">Failed to load roster.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-auto content-start pb-8">
          {filteredTechs.map(tech => (
            <Card key={tech.id} className="shadow-sm border-border/60 hover:border-primary/30 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-secondary-foreground border border-border/50">
                      {tech.name ? tech.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-tight">{tech.name || 'Unnamed Tech'}</h3>
                      <p className="text-xs text-muted-foreground">{tech.phone}</p>
                    </div>
                  </div>
                  <Badge variant={tech.active_jobs > 0 ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wider font-semibold">
                    {tech.active_jobs > 0 ? 'On Job' : 'Available'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-6">
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Jobs</div>
                    <span className="font-medium text-foreground">{tech.jobs_completed} completed</span>
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" /> Rating</div>
                    <span className="font-medium text-foreground">{tech.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Earnings</div>
                    <span className="font-medium text-foreground">{formatCurrency(tech.earnings_total)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last Seen</div>
                    <span className="font-medium text-foreground text-xs" title={tech.last_seen_at || ''}>
                      {tech.last_seen_at ? formatDistanceToNow(new Date(tech.last_seen_at), { addSuffix: true }) : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
