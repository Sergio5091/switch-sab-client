import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Monitor, Square, Play, Clock, Wifi, Loader2, Usb, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { io } from "socket.io-client";
import gerantService, { Session, Poste, Categorie } from "@/services/gerantService";
import adminService from "@/services/adminService";

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
  const [switchType, setSwitchType] = useState<string>('MOCK');
  const [tick, setTick] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  // Map posteId → true si réappairage en cours
  const [reappairingIds, setReappairingIds] = useState<Record<number, boolean>>({});
  // USB : état de connexion du switch
  const [usbConnecte, setUsbConnecte] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const [p, s, c, salle] = await Promise.all([
      gerantService.getPostesDisponibles(),
      gerantService.getSessions(),
      gerantService.getCategories(),
      gerantService.getSalle().catch(() => ({ switchType: 'MOCK' })),
    ]);
    setPostes(p);
    setSessions(s);
    setCategories(c);
    setSwitchType(salle.switchType);
  }, []);

  // Charge l'état de connexion USB (seulement si mode USB)
  const loadUsbStatut = useCallback(async () => {
    try {
      const data = await adminService.usbStatut();
      if (data.switchType === 'USB') {
        setUsbConnecte(data.connecte);
      }
    } catch {
      // silencieux — non bloquant
    }
  }, []);

  // Chargement initial au montage
  useEffect(() => {
    load();
    loadUsbStatut();
  }, [load, loadUsbStatut]);

  // Timer local — force re-render chaque seconde
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Polling USB toutes les 30s (seulement si switch USB)
  useEffect(() => {
    if (switchType !== 'USB') return;
    const interval = setInterval(loadUsbStatut, 30_000);
    return () => clearInterval(interval);
  }, [switchType, loadUsbStatut]);

  // Socket — événements session + événements USB
  useEffect(() => {
    const socketUrl = new URL(import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").origin;
    const socket = io(socketUrl);
    socket.on("connect", () => { load(); });
    socket.on("session:start", () => { load(); });
    socket.on("session:end", () => { load(); });
    socket.on("session:stop", () => { load(); });

    // ── Événements USB ────────────────────────────────────────────────────
    socket.on("usb:deconnecte", () => {
      setUsbConnecte(false);
      toast({
        title: "⚠️ Switch USB déconnecté",
        description: "Vérifiez le câble USB du switch.",
        variant: "destructive",
      });
    });

    socket.on("usb:resynchronisation", () => {
      setUsbConnecte(true);
      toast({
        title: "✅ Switch reconnecté",
        description: "Les postes ont été resynchronisés automatiquement.",
      });
    });

    return () => { socket.disconnect(); };
  }, [load, toast]);

  async function handleStop(sessionId: number, posteNom: string) {
    try {
      await gerantService.arreterSession(sessionId);
      toast({ title: `${posteNom} arrêté` });
      load();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  async function handleReappairer(poste: Poste) {
    setReappairingIds(prev => ({ ...prev, [poste.id]: true }));
    try {
      const result = await gerantService.reappairerPrise(poste.id);
      toast({ title: `✅ Prise réappairée sur "${poste.nom}" — ${result.zigbeeName}` });
      load();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur réappairage", variant: "destructive" });
    } finally {
      setReappairingIds(prev => ({ ...prev, [poste.id]: false }));
    }
  }

  const activeSessions = sessions.filter(s => s.statut === 'ACTIVE');
  const catGroups = categories.map(cat => ({
    cat,
    // En mode ZIGBEE, n'afficher que les postes avec une prise appairée (zigbeeName non null)
    postes: postes.filter(p =>
      p.categorieId === cat.id &&
      (switchType !== 'ZIGBEE' || !!p.zigbeeName)
    ),
  })).filter(g => g.postes.length > 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Postes en direct</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{activeSessions.length} poste(s) actif(s)</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge statut switch USB */}
            {switchType === 'USB' && usbConnecte !== null && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
                usbConnecte
                  ? "bg-green-500/10 border-green-500/20 text-green-500"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              )}>
                {usbConnecte
                  ? <><CheckCircle2 size={12} /> Switch connecté</>
                  : <><AlertTriangle size={12} /> Switch déconnecté</>
                }
              </div>
            )}
            {switchType === 'USB' && usbConnecte === null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground">
                <Usb size={12} /> USB…
              </div>
            )}
            <Link href="/gerant/session/new">
              <Button className="gap-1.5" data-testid="button-new-session">
                <Play size={15} /> Nouvelle session
              </Button>
            </Link>
          </div>
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
                      <div className="space-y-2">
                        <Link href="/gerant/session/new">
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10" data-testid={`button-start-poste-${poste.id}`}>
                            <Play size={11} /> Démarrer
                          </Button>
                        </Link>
                        {switchType === 'ZIGBEE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-amber-500"
                            disabled={!!reappairingIds[poste.id]}
                            onClick={() => handleReappairer(poste)}
                            title="Réappairer la prise Zigbee de ce poste (prise remplacée ou réinitialisée)"
                          >
                            {reappairingIds[poste.id]
                              ? <><Loader2 size={11} className="animate-spin" /> En attente de la prise…</>
                              : <><Wifi size={11} /> Réappairer</>
                            }
                          </Button>
                        )}
                      </div>
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
