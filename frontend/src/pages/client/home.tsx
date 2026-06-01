import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Link } from "wouter";
import { DollarSign, Gift, Clock, Play, Star, Zap, ChevronRight, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ClientHome() {
  const { currentUser, clients, sessions } = useApp();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
  const activeSession = sessions.find(s => s.clientId === client?.id && s.actif);

  const recentSessions = sessions
    .filter(s => s.clientId === client?.id && !s.actif)
    .slice(-5)
    .reverse();

  const pct = activeSession ? (activeSession.secondsRemaining / (activeSession.dureeMinutes * 60)) * 100 : 0;
  const urgentColor = activeSession && pct < 10 ? "text-destructive" : activeSession && pct < 25 ? "text-yellow-400" : "text-green-400";

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">Bonjour 👋</p>
          <h1 className="text-2xl font-bold text-foreground">{client?.pseudo ?? currentUser?.pseudo ?? "Client"}</h1>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <DollarSign size={11} /> Crédit
            </div>
            <div className="text-2xl font-bold text-foreground">{(client?.creditMonetaire ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">FCFA</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Gift size={11} /> Bonus
            </div>
            <div className="text-2xl font-bold text-foreground">{client?.bonusTempsDispo ?? 0}</div>
            <div className="text-xs text-muted-foreground">minutes offertes</div>
          </div>
        </div>

        {/* Active session */}
        {activeSession ? (
          <div className="bg-card border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Session en cours</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className={cn("font-mono text-4xl font-bold", urgentColor)}>
                {formatTime(activeSession.secondsRemaining)}
              </div>
              <div className="text-right">
                <div className="text-sm text-foreground font-medium">{activeSession.dureeAchetee}</div>
                {activeSession.estBonus && <div className="text-xs text-primary">Session bonus</div>}
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-green-400")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Play size={20} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Pas de session active</div>
              <div className="text-xs text-muted-foreground mt-0.5">Demandez un gérant pour démarrer</div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/client/recharge">
            <a className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap size={16} className="text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium text-center">Recharger</span>
            </a>
          </Link>
          <Link href="/client/coupon">
            <a className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Ticket size={16} className="text-orange-400" />
              </div>
              <span className="text-xs text-muted-foreground font-medium text-center">Coupon</span>
            </a>
          </Link>
          <Link href="/client/leaderboard">
            <a className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Star size={16} className="text-yellow-400" />
              </div>
              <span className="text-xs text-muted-foreground font-medium text-center">Top joueurs</span>
            </a>
          </Link>
        </div>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Sessions récentes</span>
              <Link href="/client/session">
                <a className="text-xs text-primary flex items-center gap-0.5">Tout voir <ChevronRight size={12} /></a>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm text-foreground">{s.dureeAchetee}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(s.heureDebut), "dd MMM · HH:mm", { locale: fr })}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">{s.montant.toLocaleString()} F</div>
                    {s.estBonus && <div className="text-xs text-orange-400">Bonus</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
