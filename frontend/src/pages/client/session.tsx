import { useState, useEffect, useCallback } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Clock, Gift, Square, Plus, Wallet, Sparkles, PauseCircle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { io } from "socket.io-client";
import api from "@/services/api";

function formatTime(secs: number) {
  if (secs == null || isNaN(secs)) return "00:00";
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function getTempsRestant(fin: string) {
  return Math.max(0, Math.floor((new Date(fin).getTime() - Date.now()) / 1000));
}

interface Duree { id: number; libelle: string; secondes: number; prix: number; categorieId?: number }
interface Session {
  id: number; statut: string; fin: string; debut: string;
  estBonus: boolean;
  duree: { libelle: string; secondes: number; prix: number };
  poste: { nom: string };
}
interface ClientBonus { solde: number; disponible: boolean }
interface CreditCat { solde: number; categorie: { id: number; nom: string } }

export default function ClientSession() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tick, setTick] = useState(0);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [resumingId, setResumingId] = useState<number | null>(null);

  // Prolongement
  const [prolongSessionId, setProlongSessionId] = useState<number | null>(null);
  const [prolongDurees, setProlongDurees] = useState<Duree[]>([]);
  const [prolongDureeId, setProlongDureeId] = useState("");
  const [prolongLoading, setProlongLoading] = useState(false);
  const [useBonusProlong, setUseBonusProlong] = useState(false);

  // Données client pour vérifier soldes
  const [bonus, setBonus] = useState<ClientBonus | null>(null);
  const [credits, setCredits] = useState<CreditCat[]>([]);
  const [soldeMonetaire, setSoldeMonetaire] = useState(0);

  const reload = useCallback(() => {
    api.get('/client/sessions').then(r => setSessions(r.data)).catch(console.error);
    // Recharger aussi les soldes pour les calculs de dispo
    api.get('/client/home').then(r => {
      setBonus(r.data.bonus);
      setCredits(r.data.credits);
      setSoldeMonetaire(r.data.soldeMonetaire);
    }).catch(console.error);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socketUrl = new URL(import.meta.env.VITE_API_URL ?? "http://localhost:3005/api").origin;
    const socket = io(socketUrl);
    socket.on("session:end", reload);
    socket.on("session:stop", reload);
    socket.on("session:start", reload);
    socket.on("session:prolonged", reload);
    return () => { socket.disconnect(); };
  }, [reload]);

  // Charger les durées quand on ouvre le dialog de prolongement
  useEffect(() => {
    if (!prolongSessionId) return;
    const session = sessions.find(s => s.id === prolongSessionId);
    if (!session) return;
    api.get(`/client/session/${prolongSessionId}/categorie`)
      .then(r => api.get(`/client/categories/${r.data.categorieId}/durees`))
      .then(r => setProlongDurees(r.data))
      .catch(() => {
        api.get('/client/categories').then(r => {
          if (r.data.length > 0) api.get(`/client/categories/${r.data[0].id}/durees`).then(d => setProlongDurees(d.data));
        });
      });
    setProlongDureeId("");
    setUseBonusProlong(false);
  }, [prolongSessionId]);

  async function handleStop(sessionId: number) {
    setStoppingId(sessionId);
    try {
      await api.post(`/client/session/${sessionId}/stop`);
      toast({ title: "Session mise en pause" });
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setStoppingId(null);
    }
  }

  async function handleReprendre(sessionId: number) {
    setResumingId(sessionId);
    try {
      const res = await api.post(`/client/session/${sessionId}/reprendre`);
      toast({ title: `Session reprise — ${res.data.posteNom}` });
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setResumingId(null);
    }
  }

  async function handleProlong() {
    if (!prolongSessionId || !prolongDureeId) return;
    setProlongLoading(true);
    try {
      await api.post(`/client/session/${prolongSessionId}/prolonger`, { dureeId: Number(prolongDureeId), useBonus: useBonusProlong });
      toast({ title: "Session prolongée ✅" });
      closeProlongDialog();
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setProlongLoading(false);
    }
  }

  function closeProlongDialog() {
    setProlongSessionId(null);
    setProlongDurees([]);
    setProlongDureeId("");
    setUseBonusProlong(false);
  }

  const bonusDisponible = bonus?.disponible === true && (bonus?.solde ?? 0) > 0;
  const selectedProlongDuree = prolongDurees.find(d => d.id === Number(prolongDureeId));
  const bonusSuffisantProlong = bonusDisponible && !!selectedProlongDuree && (bonus!.solde >= selectedProlongDuree.secondes);

  const activeSessions = sessions.filter(s => s.statut === 'ACTIVE');
  const pausedSessions = sessions.filter(s => s.statut === 'ARRETEE');
  const historique = sessions.filter(s => s.statut === 'TERMINEE');

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sessions.length} session(s) au total</p>
        </div>

        {/* Sessions actives */}
        {activeSessions.length > 0 && (
          <div className="space-y-3">
            {activeSessions.map(s => {
              const tempsRestant = getTempsRestant(s.fin);
              const pct = (tempsRestant / s.duree.secondes) * 100;
              const urgentColor = pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400";
              return (
                <div key={s.id} className="bg-card border border-green-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                      En cours — {s.poste.nom}
                    </span>
                    {s.estBonus && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 ml-auto">
                        <Gift size={9} /> Bonus
                      </Badge>
                    )}
                  </div>
                  <div className="text-center mb-4">
                    <div className={cn("text-5xl font-mono font-bold mb-1", urgentColor)}>
                      {formatTime(tempsRestant)}
                    </div>
                    <div className="text-sm text-muted-foreground">{s.duree.libelle}</div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <div
                      className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-green-400")}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setProlongSessionId(s.id)}
                      disabled={stoppingId === s.id}
                    >
                      <Plus size={13} /> Prolonger
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      onClick={() => handleStop(s.id)}
                      disabled={stoppingId === s.id}
                    >
                      <Square size={13} /> {stoppingId === s.id ? "Arrêt..." : "Arrêter"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sessions en pause */}
        {pausedSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide flex items-center gap-1.5">
              <PauseCircle size={12} /> En pause ({pausedSessions.length})
            </p>
            {pausedSessions.map(s => (
              <div key={s.id} className="bg-card border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    {s.estBonus ? <Gift size={14} className="text-primary" /> : <PauseCircle size={14} className="text-yellow-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.duree.libelle} — {s.poste.nom}</div>
                    <div className="text-xs text-yellow-400 font-mono font-semibold mt-0.5">
                      {formatTime(s.tempsRestant)} restantes
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white flex-shrink-0"
                  onClick={() => handleReprendre(s.id)}
                  disabled={resumingId === s.id || activeSessions.length > 0}
                >
                  <PlayCircle size={13} />
                  {resumingId === s.id ? "..." : "Reprendre"}
                </Button>
              </div>
            ))}
            {activeSessions.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Arrêtez votre session active pour reprendre une session en pause
              </p>
            )}
          </div>
        )}

        {/* Historique */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Historique ({historique.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {historique.map(s => (
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
                  <Badge className={cn("text-xs",
                    s.statut === 'ARRETEE' ? "bg-yellow-500/10 text-yellow-400" : "bg-muted text-muted-foreground"
                  )}>
                    {s.statut === 'ARRETEE' ? 'En pause' : 'Terminée'}
                  </Badge>
                </div>
              </div>
            ))}
            {historique.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune session enregistrée</div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog prolonger */}
      <Dialog open={!!prolongSessionId} onOpenChange={v => { if (!v) closeProlongDialog(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={16} className="text-primary" />
              Prolonger la session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Récap soldes */}
            <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1 text-xs">
              {soldeMonetaire > 0 && (
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Wallet size={11} /> Solde : {soldeMonetaire.toLocaleString()} F
                </div>
              )}
              {credits.filter(c => c.solde > 0).map(c => (
                <div key={c.categorie.id} className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={11} /> {c.categorie.nom} : {Math.floor(c.solde / 60)} min
                </div>
              ))}
              {bonusDisponible && (
                <div className="flex items-center gap-1.5 text-orange-400 font-medium">
                  <Sparkles size={11} /> Bonus : {Math.floor(bonus!.solde / 60)} min offerts
                </div>
              )}
            </div>

            {/* Durées */}
            {prolongDurees.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {prolongDurees.sort((a, b) => a.secondes - b.secondes).map(d => {
                  const creditCat = credits.find(c => c.categorie.id === d.categorieId);
                  const peutAvecMinutes = (creditCat?.solde ?? 0) >= d.secondes;
                  const peutAvecSolde = soldeMonetaire >= d.prix;
                  const peutAvecBonus = bonusDisponible && (bonus!.solde >= d.secondes);
                  const disponible = peutAvecMinutes || peutAvecSolde || peutAvecBonus;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { if (disponible) { setProlongDureeId(String(d.id)); setUseBonusProlong(false); } }}
                      disabled={!disponible}
                      className={`p-3 rounded-xl border text-sm transition-all ${prolongDureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : disponible ? "bg-muted border-border hover:border-primary/30" : "opacity-40 cursor-not-allowed bg-muted border-border"}`}
                    >
                      <div className="font-bold">{d.libelle}</div>
                      <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Chargement des durées...</p>
            )}

            {/* Toggle bonus */}
            {bonusSuffisantProlong && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                <p className="text-xs text-orange-400 font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} /> Vous avez assez de bonus pour cette durée
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseBonusProlong(false)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                      !useBonusProlong ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    <Wallet size={11} className="inline mr-1" /> Crédit / Solde
                  </button>
                  <button
                    onClick={() => setUseBonusProlong(true)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                      useBonusProlong ? "bg-orange-500/10 border-orange-500/40 text-orange-400" : "bg-muted border-border text-muted-foreground hover:border-orange-500/20"
                    )}
                  >
                    <Sparkles size={11} className="inline mr-1" /> Utiliser mes bonus
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeProlongDialog}>Annuler</Button>
            <Button
              onClick={handleProlong}
              disabled={prolongLoading || !prolongDureeId}
              className={useBonusProlong ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            >
              {useBonusProlong ? <Sparkles size={14} className="mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
              {prolongLoading ? "En cours..." : "Prolonger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
