import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, CreditCard, Ticket, Gift, Trophy, Tv2, Sun, Moon, Gamepad2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const tabs: TabItem[] = [
  { href: "/client/home",    label: "Accueil",  icon: Home },
  { href: "/client/session", label: "Sessions", icon: Tv2 },
  { href: "/client/coupon",  label: "Coupon",   icon: Ticket },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Gamepad2 size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">SWITCH SAB</div>
            <div className="text-xs text-primary font-medium">Client</div>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="text-xs text-muted-foreground">Connecté en tant que</div>
          <div className="text-sm font-semibold text-foreground truncate">{currentUser?.pseudo}</div>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {tabs.map(tab => {
            const active = location.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  active ? "bg-primary/10 text-primary border border-primary/20" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                  <tab.icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                  {tab.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors">
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col md:ml-56">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Gamepad2 size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">SWITCH SAB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{currentUser?.pseudo}</span>
            <button onClick={toggleTheme} className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground">
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Sortir</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex">
          {tabs.map(tab => {
            const active = location.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center gap-1 py-2.5 transition-colors cursor-pointer",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  <tab.icon size={18} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
