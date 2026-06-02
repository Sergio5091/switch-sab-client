import { useState, useEffect } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Clock, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import api from "@/services/api";

function formatTime(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTempsRestant(fin: string) {
  return Math.max(0, Math.floor((new Date(fin).getTime() - Date.now()) / 1000));
}

interface Session {
  id: number; statut: string; fin: string; debut: string;
  estBonus: boolean;
  duree: { libelle: string; secondes: number; prix: number };
  poste: { nom: string };
}

export default function ClientSession() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api.get('/client/sessions').then(r => setSessions(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSession = sessions.find(s => s.statut === 'ACTIVE') ?? null;
  const tempsRestant = activeSession ? getTempsRestant(activeSession.fin) : 0;
  const pct = activeSession ? (tempsRestant / activeSession.duree.secondes) * 100 : 0;

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} session(s) au total</p>
        </div>

        {activeSession && (
          <div className="bg-card border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wide">En cours — {activeSession.poste.nom}</span>
            </div>
            <div className="text-center mb-4">
              <div className={cn("text-5xl font-mono font-bold mb-1", pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400")}>
                {formatTime(tempsRestant)}
              </div>
              <div className="text-sm text-muted-foreground">{activeSession.duree.libelle} achetée</div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-green-400")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Historique</h2>
          </div>
          <div className="divide-y divide-border">
            {sessions.filter(s => s.statut !== 'ACTIVE').map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    {s.estBonus ? <Gift size={13} className="text-primary" /> : <Clock size={13} className="text-muted-foreground" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.duree.libelle} — {s.poste.nom}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(s.debut), "dd MMM yyyy · HH:mm", { locale: fr })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{s.duree.prix.toLocaleString()} F</div>
                  {s.estBonus && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Bonus</Badge>}
                </div>
              </div>
            ))}
            {sessions.filter(s => s.statut !== 'ACTIVE').length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune session enregistrée</div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
