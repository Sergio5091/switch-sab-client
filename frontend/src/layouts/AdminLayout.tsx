import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Building2, Users, Shield, Key, Monitor,
  Tag, DollarSign, Gift, Megaphone, BarChart2,
  Ticket, LogOut, Menu, X, Gamepad2, Clock, FileText,
  ChevronRight, UserCheck, Zap, Sun, Moon, ShieldAlert, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const superAdminNav: NavItem[] = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/salles", label: "Salles", icon: Building2 },
  { href: "/superadmin/admins", label: "Admins", icon: Shield },
  { href: "/superadmin/licences", label: "Licences", icon: Key },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Catégories", icon: Tag },
  { href: "/admin/postes", label: "Postes TV", icon: Monitor },
  { href: "/admin/gerants", label: "Gérants", icon: UserCheck },
  { href: "/admin/bonus", label: "Bonus", icon: Gift },
  { href: "/admin/promo", label: "Parrainage", icon: Zap },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone },
  { href: "/admin/rapports", label: "Rapports", icon: BarChart2 },
];

const gerantNav: NavItem[] = [
  { href: "/gerant/dashboard", label: "Postes", icon: Gamepad2 },
  { href: "/gerant/session/new", label: "Nouvelle session", icon: Clock },
  { href: "/gerant/clients", label: "Clients", icon: Users },
  { href: "/gerant/recharges", label: "Recharges", icon: DollarSign },
  { href: "/gerant/coupons", label: "Coupons", icon: Ticket },
  { href: "/gerant/rapport", label: "Rapport du jour", icon: FileText },
];

function LicenceBadge() {
  const { licenceStatut } = useApp();

  if (!licenceStatut) return null;

  const jours = licenceStatut.joursRestants;
  const actif = licenceStatut.statut === "ACTIVE";

  const color = !actif
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : jours <= 7
    ? "border-red-500/30 bg-red-500/10 text-red-400"
    : jours <= 30
    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
    : "border-green-500/30 bg-green-500/10 text-green-400";

  const Icon = actif ? ShieldCheck : ShieldAlert;

  return (
    <Link href="/admin/licence">
      <div className={cn("mx-3 mb-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all hover:opacity-80", color)}>
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <span className="text-xs font-semibold">
            {actif ? "Licence active" : "Licence invalide"}
          </span>
        </div>
        {actif && (
          <div className="text-xs mt-1 opacity-80">
            Expire dans <span className="font-bold">{jours} jour{jours > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const nav = currentUser?.role === "superadmin" ? superAdminNav
    : currentUser?.role === "admin" ? adminNav
    : gerantNav;

  const roleLabel = currentUser?.role === "superadmin" ? "Super Admin"
    : currentUser?.role === "admin" ? "Admin"
    : "Gérant";

  const roleColor = currentUser?.role === "superadmin" ? "text-orange-400"
    : currentUser?.role === "admin" ? "text-blue-400"
    : "text-green-400";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <img
            src="/Image-removebg-preview.png"
            alt="Logo"
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-lg"
          />

          <div>
            <div className="font-bold text-foreground text-sm tracking-wide">
              SWITCH SAB
            </div>
            <div className={cn("text-xs font-medium", roleColor)}>
              {roleLabel}
            </div>
          </div>

          <button
            className="ml-auto lg:hidden text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Salle info */}
        {currentUser && (
          <div className="px-5 py-3 border-b border-sidebar-border bg-sidebar-accent/30">
            <div className="text-xs text-muted-foreground">Connecté en tant que</div>
            <div className="text-sm font-medium text-foreground truncate">{currentUser.prenom} {currentUser.nom}</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {nav.map(item => {
            const active = item.href === location || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`nav-${item.href.split("/").pop()}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <item.icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                  {item.label}
                  {active && <ChevronRight size={14} className="ml-auto text-primary" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Licence — visible uniquement pour admin */}
        {currentUser?.role === "admin" && (
          <LicenceBadge />
        )}

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            data-testid="button-toggle-theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut size={16} />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Gamepad2 size={16} className="text-primary" />
            <span className="font-bold text-sm">SWITCH SAB</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
