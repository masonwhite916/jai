import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Requests from '@/pages/requests';
import Technicians from '@/pages/technicians';
import MapView from '@/pages/map';
import Layout from '@/components/layout/shell';
import { useEffect } from 'react';

// Setup auth token for all api client requests
setAuthTokenGetter(() => {
  return localStorage.getItem('jai_admin_token');
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      if (error?.status === 401 || error?.response?.status === 401) {
        localStorage.removeItem('jai_admin_token');
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      if (error?.status === 401 || error?.response?.status === 401) {
        localStorage.removeItem('jai_admin_token');
        window.location.href = import.meta.env.BASE_URL + 'login';
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('jai_admin_token');
    if (!token) {
      setLocation('/login');
    }
  }, [location, setLocation]);

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/requests">
        {() => <ProtectedRoute component={Requests} />}
      </Route>
      <Route path="/map">
        {() => <ProtectedRoute component={MapView} />}
      </Route>
      <Route path="/technicians">
        {() => <ProtectedRoute component={Technicians} />}
      </Route>
      <Route path="/">
        {() => {
          const token = localStorage.getItem('jai_admin_token');
          if (token) return <ProtectedRoute component={Dashboard} />;
          window.location.href = import.meta.env.BASE_URL + 'login';
          return null;
        }}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
