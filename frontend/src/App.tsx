import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ShieldAlert, X } from "lucide-react";

import LoginPage from "@/pages/login";
import LicencePage from "@/pages/admin/licence";
import SetupSallePage from "@/pages/setup/salle";
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
import GerantCoupons from "@/pages/gerant/coupons";
import GerantRapport from "@/pages/gerant/rapport";

import ClientHome from "@/pages/client/home";
import ClientSession from "@/pages/client/session";
import ClientCoupon from "@/pages/client/coupon";

const queryClient = new QueryClient();

function FraudeAlert() {
  const { fraudeDetectee, messageFraude, logout, resetFraude } = useApp();
  const [, setLocation] = useLocation();
  if (!fraudeDetectee) return null;

  function handleActiverLicence() {
    resetFraude();
    setLocation("/admin/licence");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-2 border-destructive rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={24} className="text-destructive" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-destructive mb-1">
              ⚠️ Tentative de fraude détectée
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {messageFraude}
            </p>
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
              Cette licence a été corrompue. Importez une nouvelle licence valide ou contactez votre Super Admin.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleActiverLicence}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Activer une nouvelle licence
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const { currentUser, licenceStatut, salleConfiguree } = useApp();
  if (!currentUser) return <Redirect to="/login" />;

  // Première installation : salle pas encore configurée
  if (currentUser.role === "admin" && salleConfiguree === false) {
    return <Redirect to="/setup/salle" />;
  }

  // Licence invalide ou expirée (on attend que licenceStatut soit chargé)
  if (licenceStatut !== null && licenceStatut.statut !== "ACTIVE") {
    return <Redirect to="/admin/licence" />;
  }

  // licenceStatut encore null (chargement en cours) → ne pas rediriger
  if (licenceStatut === null) return null;

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
  const { currentUser, licenceStatut, salleConfiguree } = useApp();
  if (!currentUser) return <Redirect to="/login" />;
  if (!roles.includes(currentUser.role)) return <RoleRedirect />;

  // Première installation : salle pas encore configurée
  if (roles.includes("admin") && salleConfiguree === false) {
    return <Redirect to="/setup/salle" />;
  }

  // Pour les routes admin, vérifier la licence (attendre que licenceStatut soit chargé)
  if (roles.includes("admin") && licenceStatut !== null && licenceStatut.statut !== "ACTIVE") {
    return <Redirect to="/admin/licence" />;
  }

  return <Component />;
}

function LicenseRequiredRoute({ component: Component }: { component: React.ComponentType }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Redirect to="/login" />;
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

      {/* Setup première installation */}
      <Route path="/setup/salle" component={SetupSallePage} />

      {/* Licence activation route - accessible seulement si connecté */}
      <Route path="/admin/licence">
        {() => <LicenseRequiredRoute component={LicencePage} />}
      </Route>

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
      <Route path="/gerant/coupons">
        {() => <ProtectedRoute component={GerantCoupons} roles={["gerant"]} />}
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
      <Route path="/client/coupon">
        {() => <ProtectedRoute component={ClientCoupon} roles={["client"]} />}
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
              <FraudeAlert />
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