import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Gate } from '@/components/gate';
import { Shell } from '@/components/shell';
import { Card, Empty } from '@/components/kit';
import { useMe } from '@/lib/app';
import Portfolio from '@/pages/portfolio';
import UtilityPage from '@/pages/utility';
import Requests from '@/pages/requests';
import UsersPage from '@/pages/users';
import AuditPage from '@/pages/audit';
import { ShieldAlert } from 'lucide-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, refetchOnWindowFocus: false } } });

function Denied() {
  return <Card><Empty icon={<ShieldAlert className="h-6 w-6" />} title="Not available for your role" body="This area is restricted. Ask a Studio administrator if you need access." /></Card>;
}

function Home() {
  const me = useMe();
  return me.role === 'admin' ? <Redirect to="/admin" /> : <Portfolio admin={false} />;
}
function AdminRoute() {
  const me = useMe();
  return me.role === 'admin' ? <Portfolio admin /> : <Denied />;
}
function Restricted({ children }: { children: ReactNode }) {
  const me = useMe();
  return me.role === 'admin' || me.role === 'ttl' ? <>{children}</> : <Denied />;
}

function Router() {
  return (
    <Gate>
      <Shell>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/admin" component={AdminRoute} />
            <Route path="/utilities/:id" component={UtilityPage} />
            <Route path="/requests">{() => <Restricted><Requests /></Restricted>}</Route>
            <Route path="/users">{() => <Restricted><UsersPage /></Restricted>}</Route>
            <Route path="/audit">{() => <Restricted><AuditPage /></Restricted>}</Route>
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </Shell>
    </Gate>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
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
