import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

// import SuperAdminDashboard from "@/pages/superadmin/dashboard";
// import SuperAdminSalles from "@/pages/superadmin/salles";
// import SuperAdminAdmins from "@/pages/superadmin/admins";
// import SuperAdminLicences from "@/pages/superadmin/licences";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminCategories from "@/pages/admin/categories";
import AdminDurees from "@/pages/admin/durees";
import AdminPostes from "@/pages/admin/postes";
import AdminGerants from "@/pages/admin/gerants";
import AdminBonus from "@/pages/admin/bonus";
import AdminPromo from "@/pages/admin/promo";
import AdminCoupons from "@/pages/admin/coupons";
import AdminPromotions from "@/pages/admin/promotions";
import AdminRapports from "@/pages/admin/rapports";

import GerantDashboard from "@/pages/gerant/dashboard";
import GerantSessionNew from "@/pages/gerant/session-new";
import GerantClients from "@/pages/gerant/clients";
import GerantRecharges from "@/pages/gerant/recharges";
import GerantRapport from "@/pages/gerant/rapport";

import ClientHome from "@/pages/client/home";
import ClientSession from "@/pages/client/session";
import ClientRecharge from "@/pages/client/recharge";
import ClientCoupon from "@/pages/client/coupon";
import ClientPromoCode from "@/pages/client/promo-code";
import ClientPromotions from "@/pages/client/promotions";
import ClientLeaderboard from "@/pages/client/leaderboard";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { currentUser } = useApp();
  if (!currentUser) return <Redirect to="/login" />;
  switch (currentUser.role) {
    case "superadmin": return <Redirect to="/superadmin/dashboard" />;
    case "admin": return <Redirect to="/admin/dashboard" />;
    case "gerant": return <Redirect to="/gerant/dashboard" />;
    case "client": return <Redirect to="/client/home" />;
    default: return <Redirect to="/login" />;
  }
}

function ProtectedRoute({
  component: Component,
  roles,
}: {
  component: React.ComponentType;
  roles: string[];
}) {
  const { currentUser } = useApp();
  if (!currentUser) return <Redirect to="/login" />;
  if (!roles.includes(currentUser.role)) return <RoleRedirect />;
  return <Component />;
}

function LoginGuard() {
  const { currentUser } = useApp();
  const [location] = useLocation();
  if (currentUser && location === "/login") return <RoleRedirect />;
  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleRedirect} />
      <Route path="/login" component={LoginGuard} />

      {/* Super Admin
      <Route path="/superadmin/dashboard">
        {() => <ProtectedRoute component={SuperAdminDashboard} roles={["superadmin"]} />}
      </Route>
      <Route path="/superadmin/salles">
        {() => <ProtectedRoute component={SuperAdminSalles} roles={["superadmin"]} />}
      </Route>
      <Route path="/superadmin/admins">
        {() => <ProtectedRoute component={SuperAdminAdmins} roles={["superadmin"]} />}
      </Route>
      <Route path="/superadmin/licences">
        {() => <ProtectedRoute component={SuperAdminLicences} roles={["superadmin"]} />}
      </Route> */}

      {/* Admin */}
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} />}
      </Route>
      <Route path="/admin/categories">
        {() => <ProtectedRoute component={AdminCategories} roles={["admin"]} />}
      </Route>
      <Route path="/admin/categories/:id/durees">
        {() => <ProtectedRoute component={AdminDurees} roles={["admin"]} />}
      </Route>
      <Route path="/admin/postes">
        {() => <ProtectedRoute component={AdminPostes} roles={["admin"]} />}
      </Route>
      <Route path="/admin/gerants">
        {() => <ProtectedRoute component={AdminGerants} roles={["admin"]} />}
      </Route>
      <Route path="/admin/bonus">
        {() => <ProtectedRoute component={AdminBonus} roles={["admin"]} />}
      </Route>
      <Route path="/admin/promo">
        {() => <ProtectedRoute component={AdminPromo} roles={["admin"]} />}
      </Route>
      <Route path="/admin/coupons">
        {() => <ProtectedRoute component={AdminCoupons} roles={["admin"]} />}
      </Route>
      <Route path="/admin/promotions">
        {() => <ProtectedRoute component={AdminPromotions} roles={["admin"]} />}
      </Route>
      <Route path="/admin/rapports">
        {() => <ProtectedRoute component={AdminRapports} roles={["admin"]} />}
      </Route>

      {/* Gérant */}
      <Route path="/gerant/dashboard">
        {() => <ProtectedRoute component={GerantDashboard} roles={["gerant"]} />}
      </Route>
      <Route path="/gerant/session/new">
        {() => <ProtectedRoute component={GerantSessionNew} roles={["gerant"]} />}
      </Route>
      <Route path="/gerant/clients">
        {() => <ProtectedRoute component={GerantClients} roles={["gerant"]} />}
      </Route>
      <Route path="/gerant/recharges">
        {() => <ProtectedRoute component={GerantRecharges} roles={["gerant"]} />}
      </Route>
      <Route path="/gerant/rapport">
        {() => <ProtectedRoute component={GerantRapport} roles={["gerant"]} />}
      </Route>

      {/* Client */}
      <Route path="/client/home">
        {() => <ProtectedRoute component={ClientHome} roles={["client"]} />}
      </Route>
      <Route path="/client/session">
        {() => <ProtectedRoute component={ClientSession} roles={["client"]} />}
      </Route>
      <Route path="/client/recharge">
        {() => <ProtectedRoute component={ClientRecharge} roles={["client"]} />}
      </Route>
      <Route path="/client/coupon">
        {() => <ProtectedRoute component={ClientCoupon} roles={["client"]} />}
      </Route>
      <Route path="/client/promo-code">
        {() => <ProtectedRoute component={ClientPromoCode} roles={["client"]} />}
      </Route>
      <Route path="/client/promotions">
        {() => <ProtectedRoute component={ClientPromotions} roles={["client"]} />}
      </Route>
      <Route path="/client/leaderboard">
        {() => <ProtectedRoute component={ClientLeaderboard} roles={["client"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
