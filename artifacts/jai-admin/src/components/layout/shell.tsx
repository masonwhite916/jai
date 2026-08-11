import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, LayoutDashboard, Map as MapIcon, Users, LogOut, Menu, X } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('jai_admin_token');
    setLocation('/login');
  };

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Close sidebar when route changes (mobile navigation)
  useEffect(() => { setSidebarOpen(false); }, [location]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Map View', path: '/map', icon: MapIcon },
    { label: 'Requests', path: '/requests', icon: Activity },
    { label: 'Technicians', path: '/technicians', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-50',
          'w-64 flex-shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo + mobile close */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-accent border-opacity-30 flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              J
            </div>
            <span>JAI Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          <div className="px-2 mb-4 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Overview
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={[
                  'flex items-center gap-3 px-3 min-h-[44px] rounded-md transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-accent border-opacity-30 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 min-h-[44px] text-sm font-medium text-sidebar-foreground/80 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 border-b border-border bg-card flex items-center px-4 md:px-8 z-10 gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm flex-shrink-0">
            AD
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
