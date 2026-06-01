import { Link, useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, CreditCard, Ticket, Gift, Trophy, Tv2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const tabs: TabItem[] = [
  { href: "/client/home", label: "Accueil", icon: Home },
  { href: "/client/session", label: "Session", icon: Tv2 },
  { href: "/client/recharge", label: "Recharge", icon: CreditCard },
  { href: "/client/coupon", label: "Coupon", icon: Ticket },
  { href: "/client/leaderboard", label: "Classement", icon: Trophy },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { currentUser, logout } = useApp();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Gift size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">SWITCH SAB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentUser?.pseudo}</span>
          <button
            onClick={toggleTheme}
            className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-toggle-theme"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            data-testid="button-logout-client"
          >
            Sortir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-10">
        <div className="flex">
          {tabs.map(tab => {
            const active = location.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <a
                  data-testid={`tab-${tab.href.split("/").pop()}`}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-colors min-w-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <tab.icon size={18} />
                  <span className="text-[10px] font-medium truncate">{tab.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
