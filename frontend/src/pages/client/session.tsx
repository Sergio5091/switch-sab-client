import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Clock, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ClientSession() {
  const { currentUser, clients, sessions } = useApp();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
  const mySessions = sessions.filter(s => s.clientId === client?.id).slice().reverse();
  const activeSession = mySessions.find(s => s.actif);
  const pct = activeSession ? (activeSession.secondsRemaining / (activeSession.dureeMinutes * 60)) * 100 : 0;

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{mySessions.length} session(s) au total</p>
        </div>

        {/* Active session */}
        {activeSession && (
          <div className="bg-card border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wide">En cours</span>
            </div>
            <div className="text-center mb-4">
              <div className={cn("text-5xl font-mono font-bold mb-1", pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400")}>
                {formatTime(activeSession.secondsRemaining)}
              </div>
              <div className="text-sm text-muted-foreground">{activeSession.dureeAchetee} achetée</div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-green-400")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Historique des sessions</h2>
          </div>
          <div className="divide-y divide-border">
            {mySessions.filter(s => !s.actif).map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3" data-testid={`row-session-${s.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    {s.estBonus ? <Gift size={13} className="text-primary" /> : <Clock size={13} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.dureeAchetee}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(s.heureDebut), "dd MMM yyyy · HH:mm", { locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{s.montant.toLocaleString()} F</div>
                  {s.estBonus && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Bonus</Badge>}
                </div>
              </div>
            ))}
            {mySessions.filter(s => !s.actif).length === 0 && !activeSession && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune session enregistrée</div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
