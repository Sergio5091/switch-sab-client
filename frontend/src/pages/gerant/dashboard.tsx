import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Monitor, Square, Play, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { io } from "socket.io-client";
import gerantService, { Session, Poste, Categorie } from "@/services/gerantService";
import api from "@/services/api";

function formatTime(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTempsRestant(fin: string) {
  return Math.max(0, Math.floor((new Date(fin).getTime() - Date.now()) / 1000));
}

export default function GerantDashboard() {
  const { toast } = useToast();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [p, s, c] = await Promise.all([
      gerantService.getPostesDisponibles(),
      gerantService.getSessions(),
      gerantService.getCategories(),
    ]);
    setPostes(p);
    setSessions(s);
    setCategories(c);
  }, []);

  // Timer local — force re-render chaque seconde
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket — uniquement pour les événements de changement d'état
  useEffect(() => {
    const socketUrl = new URL(import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").origin;
    const socket = io(socketUrl);
    socket.on("connect", () => { load(); });
    socket.on("session:start", () => { load(); });
    socket.on("session:end", () => { load(); });
    socket.on("session:stop", () => { load(); });
    return () => { socket.disconnect(); };
  }, [load]);

  async function handleStop(sessionId: number, posteNom: string) {
    try {
      await gerantService.arreterSession(sessionId);
      toast({ title: `${posteNom} arrêté` });
      load();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  const activeSessions = sessions.filter(s => s.statut === 'ACTIVE');
  const catGroups = categories.map(cat => ({
    cat,
    postes: postes.filter(p => p.categorieId === cat.id),
  })).filter(g => g.postes.length > 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Postes en direct</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{activeSessions.length} poste(s) actif(s)</p>
          </div>
          <Link href="/gerant/session/new">
            <Button className="gap-1.5" data-testid="button-new-session">
              <Play size={15} /> Nouvelle session
            </Button>
          </Link>
        </div>

        {catGroups.map(({ cat, postes: catPostes }) => (
          <div key={cat.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{cat.nom}</h2>
              <span className="text-xs text-muted-foreground">({catPostes.length} postes)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {catPostes.map(poste => {
                const activeSession = sessions.find(s => s.posteId === poste.id && s.statut === 'ACTIVE');
                const tempsRestant = activeSession ? getTempsRestant(activeSession.fin) : 0;
                const pct = activeSession ? (tempsRestant / (activeSession.duree?.secondes ?? 1)) * 100 : 0;
                const urgentColor = pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400";

                return (
                  <div
                    key={poste.id}
                    className={cn(
                      "bg-card border rounded-xl p-4 transition-all",
                      activeSession ? "border-primary/30 shadow-lg shadow-primary/5" : "border-border"
                    )}
                    data-testid={`card-poste-${poste.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", activeSession ? "bg-primary/10 border border-primary/30" : "bg-muted")}>
                          <Monitor size={16} className={activeSession ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{poste.nom}</div>
                          <div className="text-[10px] text-muted-foreground">{cat.nom}</div>
                        </div>
                      </div>
                      <Badge className={cn("text-xs", activeSession ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted text-muted-foreground")}>
                        {activeSession ? "Actif" : "Libre"}
                      </Badge>
                    </div>

                    {activeSession ? (
                      <>
                        <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-primary")}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock size={11} />
                              <span className={cn("font-mono font-bold text-base", urgentColor)}>
                                {formatTime(tempsRestant)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{activeSession.duree?.libelle}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium truncate">{activeSession.client?.pseudo}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full gap-1.5 text-xs"
                          onClick={() => handleStop(activeSession.id, poste.nom)}
                          data-testid={`button-stop-poste-${poste.id}`}
                        >
                          <Square size={11} /> Arrêter
                        </Button>
                      </>
                    ) : (
                      <Link href="/gerant/session/new">
                        <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10" data-testid={`button-start-poste-${poste.id}`}>
                          <Play size={11} /> Démarrer
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {catGroups.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">
            Aucun poste configuré
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
