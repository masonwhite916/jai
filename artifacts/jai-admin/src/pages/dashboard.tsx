import { useAdminGetStats, getAdminGetStatsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, Banknote, ArrowUpRight, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Tooltip as PieTooltip } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  accepted: '#3b82f6',
  en_route: '#8b5cf6',
  in_progress: '#a855f7',
  completed: '#22c55e',
  cancelled: '#ef4444'
};

const SERVICE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
          <div className="h-80 bg-muted rounded-xl"></div>
          <div className="h-80 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Failed to load statistics</h2>
          <p className="text-muted-foreground text-sm">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);
  const formatTime = (seconds?: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  const statCards = [
    { title: 'Active Jobs', value: stats.active_jobs, icon: Activity, trend: null },
    { title: 'Completed Today', value: stats.completed_today, icon: CheckCircle, trend: `${stats.requests_today} total` },
    { title: 'Avg Response', value: formatTime(stats.avg_response_seconds), icon: Clock, trend: null },
    { title: 'Revenue Today', value: formatCurrency(stats.revenue_today), icon: Banknote, trend: formatCurrency(stats.revenue_total) + ' total' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
        <p className="text-sm text-muted-foreground">Live operational statistics and daily performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.trend && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.trend}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Requests by Status bar chart */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center gap-2 pb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Requests by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_status} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="status" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.replace('_', ' ').toUpperCase()} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Type Breakdown pie chart */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center gap-2 pb-4">
            <PieChartIcon className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Service Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="h-52 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.by_service_type}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="service_type"
                  >
                    {stats.by_service_type.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}
                    formatter={(value, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Inline legend — no absolute positioning */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pb-1">
              {stats.by_service_type.map((entry, idx) => (
                <div key={entry.service_type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SERVICE_COLORS[idx % SERVICE_COLORS.length] }} />
                  {entry.service_type.replace(/_/g, ' ').toUpperCase()} ({entry.count})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
