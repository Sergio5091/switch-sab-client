import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Monitor, Square, Play, Clock, Wifi, Usb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GerantDashboard() {
  const { currentUser, postes, sessions, stopSession, clients, categories } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const myPostes = postes.filter(p => p.salleId === salleId);
  const myCategories = categories.filter(c => c.salleId === salleId);

  function handleStop(sessionId: number, posteNum: number) {
    stopSession(sessionId);
    toast({ title: `Poste ${posteNum} arrêté` });
  }

  const catGroups = myCategories.map(cat => ({
    cat,
    postes: myPostes.filter(p => p.categorieId === cat.id),
  })).filter(g => g.postes.length > 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Postes en direct</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sessions.filter(s => s.actif && myPostes.some(p => p.id === s.posteId)).length} poste(s) actif(s)
            </p>
          </div>
          <Link href="/gerant/session/new">
            <a>
              <Button className="gap-1.5" data-testid="button-new-session">
                <Play size={15} /> Nouvelle session
              </Button>
            </a>
          </Link>
        </div>

        {catGroups.map(({ cat, postes: catPostes }) => (
          <div key={cat.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.couleur }} />
              <h2 className="text-sm font-semibold text-foreground">{cat.nom}</h2>
              <span className="text-xs text-muted-foreground">({catPostes.length} postes)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {catPostes.sort((a, b) => a.numero - b.numero).map(poste => {
                const activeSession = sessions.find(s => s.posteId === poste.id && s.actif);
                const client = clients.find(c => c.id === activeSession?.clientId);
                const pct = activeSession ? (activeSession.secondsRemaining / (activeSession.dureeMinutes * 60)) * 100 : 0;
                const urgentColor = activeSession && pct < 10 ? "text-destructive" : activeSession && pct < 25 ? "text-yellow-400" : "text-green-400";

                return (
                  <div
                    key={poste.id}
                    className={cn(
                      "bg-card border rounded-xl p-4 transition-all",
                      activeSession ? "border-primary/30 shadow-lg shadow-primary/5" : poste.actif ? "border-border" : "border-border opacity-50"
                    )}
                    data-testid={`card-poste-${poste.id}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          activeSession ? "bg-primary/10 border border-primary/30" : "bg-muted"
                        )}>
                          <Monitor size={16} className={activeSession ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">Poste {poste.numero}</div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {poste.typeSwitch === "WIFI" ? <Wifi size={9} /> : <Usb size={9} />}
                            {poste.typeSwitch}
                          </div>
                        </div>
                      </div>
                      <Badge className={cn("text-xs", activeSession ? "bg-green-500/10 text-green-400 border-green-500/20" : poste.actif ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive border-destructive/20")}>
                        {activeSession ? "Actif" : poste.actif ? "Libre" : "Hors service"}
                      </Badge>
                    </div>

                    {activeSession ? (
                      <>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-primary")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock size={11} />
                              <span className={cn("font-mono font-bold text-base", urgentColor)}>
                                {formatTime(activeSession.secondsRemaining)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{activeSession.dureeAchetee}</span>
                          </div>
                          {client && (
                            <div className="text-xs text-muted-foreground font-medium truncate">{client.pseudo}</div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full gap-1.5 text-xs"
                          onClick={() => handleStop(activeSession.id, poste.numero)}
                          data-testid={`button-stop-poste-${poste.id}`}
                        >
                          <Square size={11} /> Arrêter
                        </Button>
                      </>
                    ) : (
                      <div className="mt-2">
                        {poste.actif ? (
                          <Link href="/gerant/session/new">
                            <a className="w-full">
                              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10" data-testid={`button-start-poste-${poste.id}`}>
                                <Play size={11} /> Démarrer
                              </Button>
                            </a>
                          </Link>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-1">Poste désactivé</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
