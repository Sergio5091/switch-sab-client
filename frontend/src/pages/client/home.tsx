import { useState, useEffect } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Link } from "wouter";
import { Gift, Clock, Play, Square, ChevronRight, Ticket, Wallet, Plus, Sparkles, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

function formatTime(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function getTempsRestant(fin: string) {
  return Math.max(0, Math.floor((new Date(fin).getTime() - Date.now()) / 1000));
}

interface Credit { solde: number; categorie: { id: number; nom: string } }
interface ActiveSession { id: number; fin: string; estBonus: boolean; posteId: number; dureeId: number; duree: { libelle: string; secondes: number; categorieId?: number }; poste?: { nom: string } }
interface PausedSession { id: number; tempsRestant: number; estBonus: boolean; duree: { libelle: string; secondes: number }; poste: { nom: string; categorieId: number; categorie?: { nom: string } } }
interface RecentSession { id: number; debut: string; estBonus: boolean; duree: { libelle: string; prix: number }; poste: { nom: string } }
interface HomeData {
  pseudo: string;
  soldeMonetaire: number;
  credits: Credit[];
  bonus: { solde: number; disponible: boolean } | null;
  activeSession: ActiveSession | null;
  pausedSession: PausedSession | null;
  recentSessions: RecentSession[];
}
interface Duree { id: number; libelle: string; secondes: number; prix: number; categorieId?: number }

export default function ClientHome() {
  const { toast } = useToast();
  const [data, setData] = useState<HomeData | null>(null);
  const [tick, setTick] = useState(0);
  const [openStart, setOpenStart] = useState(false);
  const [categories, setCategories] = useState<{ id: number; nom: string }[]>([]);
  const [catId, setCatId] = useState("");
  const [durees, setDurees] = useState<Duree[]>([]);
  const [dureeId, setDureeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBonus, setUseBonus] = useState(false);
  const [resumingId, setResumingId] = useState<number | null>(null);

  // Prolongement de session
  const [openProlong, setOpenProlong] = useState(false);
  const [prolongDurees, setProlongDurees] = useState<Duree[]>([]);
  const [prolongDureeId, setProlongDureeId] = useState("");
  const [prolongLoading, setProlongLoading] = useState(false);
  const [useBonusProlong, setUseBonusProlong] = useState(false);

  const reload = () => api.get('/client/home').then(r => setData(r.data)).catch(console.error);

  useEffect(() => { reload(); }, []);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!openStart) return;
    api.get('/client/categories').then(r => setCategories(r.data)).catch(console.error);
  }, [openStart]);

  useEffect(() => {
    if (!catId) return;
    setDureeId("");
    api.get(`/client/categories/${catId}/durees`).then(r => setDurees(r.data)).catch(console.error);
  }, [catId]);

  // Charger les durées de la catégorie de la session active pour le prolongement
  useEffect(() => {
    if (!openProlong || !data?.activeSession) return;
    const session = data.activeSession;
    // On récupère la catégorie via le poste de la session — on passe par l'API
    api.get(`/client/session/${session.id}/categorie`)
      .then(r => api.get(`/client/categories/${r.data.categorieId}/durees`))
      .then(r => setProlongDurees(r.data))
      .catch(() => {
        // Fallback : charger toutes les catégories et prendre la première
        api.get('/client/categories').then(r => {
          if (r.data.length > 0) api.get(`/client/categories/${r.data[0].id}/durees`).then(d => setProlongDurees(d.data));
        });
      });
    setProlongDureeId("");
  }, [openProlong]);

  async function handleStart() {
    if (!catId || !dureeId) return;
    setLoading(true);
    try {
      await api.post('/client/session/start', { categorieId: Number(catId), dureeId: Number(dureeId), useBonus });
      toast({ title: "Session démarrée !" });
      setOpenStart(false);
      setCatId(""); setDureeId("");
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
      setUseBonus(false);
    }
  }

  async function handleStop() {
    if (!data?.activeSession) return;
    setLoading(true);
    try {
      await api.post(`/client/session/${data.activeSession.id}/stop`);
      toast({ title: "Session mise en pause" });
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleReprendre(sessionId: number) {
    setResumingId(sessionId);
    try {
      const res = await api.post(`/client/session/${sessionId}/reprendre`);
      toast({ title: `Session reprise — ${res.data.posteNom}` });
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setResumingId(null); }
  }

  async function handleProlong() {
    if (!data?.activeSession || !prolongDureeId) return;
    setProlongLoading(true);
    try {
      await api.post(`/client/session/${data.activeSession.id}/prolonger`, { dureeId: Number(prolongDureeId), useBonus: useBonusProlong });
      toast({ title: "Session prolongée ✅" });
      setOpenProlong(false);
      setProlongDureeId("");
      setUseBonusProlong(false);
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setProlongLoading(false); }
  }

  const activeSession = data?.activeSession ?? null;
  const tempsRestant = activeSession ? getTempsRestant(activeSession.fin) : 0;
  const pct = activeSession ? (tempsRestant / activeSession.duree.secondes) * 100 : 0;
  const urgentColor = pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400";
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const creditCat = data?.credits.find(c => c.categorie.id === Number(catId));
  const bonusDisponible = (data?.bonus?.disponible === true) && (data.bonus.solde > 0);
  const bonusSuffisantStart = bonusDisponible && !!selectedDuree && (data!.bonus!.solde >= selectedDuree.secondes);
  const selectedProlongDuree = prolongDurees.find(d => d.id === Number(prolongDureeId));
  const bonusSuffisantProlong = bonusDisponible && !!selectedProlongDuree && (data!.bonus!.solde >= selectedProlongDuree.secondes);

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground">Bonjour 👋</p>
          <h1 className="text-2xl font-bold text-foreground">{data?.pseudo ?? "Client"}</h1>
        </div>

        {/* Soldes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Wallet size={11} /> Solde</div>
            <div className="text-2xl font-bold text-foreground">{(data?.soldeMonetaire ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">FCFA</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Gift size={11} /> Bonus</div>
            <div className="text-2xl font-bold text-foreground">{Math.floor((data?.bonus?.solde ?? 0))}</div>
            <div className="text-xs text-muted-foreground">minutes offertes</div>
          </div>
        </div>

        {/* Crédits par catégorie — uniquement ceux > 0 */}
        {(data?.credits ?? []).filter(c => c.solde > 0).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Votre crédit</p>
            <div className="grid grid-cols-3 gap-2">
              {data!.credits.filter(c => c.solde > 0).map(c => (
                <div key={c.categorie.id} className="bg-card border border-border rounded-xl p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium">{c.categorie.nom}</div>
                  <div className="text-lg font-bold text-foreground mt-1">{Math.floor(c.solde / 60)}<span className="text-xs font-normal text-muted-foreground ml-0.5">min</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session active */}
        {activeSession ? (
          <div className="bg-card border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Session en cours</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className={cn("font-mono text-4xl font-bold", urgentColor)}>{formatTime(tempsRestant)}</div>
              <div className="text-right">
                <div className="text-sm text-foreground font-medium">{activeSession.duree.libelle}</div>
                {activeSession.estBonus && <div className="text-xs text-primary">Session bonus</div>}
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div className={cn("h-full rounded-full transition-all", pct < 10 ? "bg-destructive" : pct < 25 ? "bg-yellow-400" : "bg-green-400")} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setOpenProlong(true)} disabled={loading}>
                <Plus size={13} /> Prolonger
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={handleStop} disabled={loading}>
                <Square size={13} /> Arrêter
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Play size={20} className="text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Pas de session active</div>
              <div className="text-xs text-muted-foreground mt-0.5">Démarrez une session ou demandez à un gérant</div>
            </div>
          </div>
        )}

        {/* Session en pause */}
        {!activeSession && data?.pausedSession && (
          <div className="bg-card border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PauseCircle size={14} className="text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Session en pause</span>
              {data.pausedSession.estBonus && (
                <span className="ml-auto text-xs text-primary flex items-center gap-1"><Gift size={10} /> Bonus</span>
              )}
            </div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-2xl font-mono font-bold text-yellow-400">
                  {formatTime(data.pausedSession.tempsRestant)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {data.pausedSession.duree.libelle} — {data.pausedSession.poste.nom}
                </div>
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => handleReprendre(data.pausedSession!.id)}
                disabled={resumingId === data.pausedSession.id}
              >
                <PlayCircle size={13} />
                {resumingId === data.pausedSession.id ? "Reprise..." : "Reprendre"}
              </Button>
            </div>
          </div>
        )}

        {/* Bouton démarrer — toujours visible */}
        <Button className="w-full gap-1.5" onClick={() => setOpenStart(true)}>
          <Play size={14} /> Démarrer une session
        </Button>

        {/* Action coupon */}
        <Link href="/client/coupon">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center"><Ticket size={16} className="text-orange-400" /></div>
              <div>
                <div className="text-sm font-medium text-foreground">Coupon de recharge</div>
                <div className="text-xs text-muted-foreground">Utilisez un code coupon</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </Link>

        {/* Sessions récentes */}
        {(data?.recentSessions ?? []).length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Sessions récentes</span>
              <Link href="/client/session">
                <span className="text-xs text-primary flex items-center gap-0.5 cursor-pointer">Tout voir <ChevronRight size={12} /></span>
              </Link>
            </div>
            <div className="divide-y divide-border">
              {data!.recentSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm text-foreground">{s.duree.libelle} — {s.poste.nom}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(s.debut), "dd MMM · HH:mm", { locale: fr })}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{s.duree.prix.toLocaleString()} F</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog prolonger session */}
      <Dialog open={openProlong} onOpenChange={v => { if (!v) { setOpenProlong(false); setProlongDureeId(""); setUseBonusProlong(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus size={16} className="text-primary" />Prolonger la session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Soldes disponibles */}
            <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1 text-xs">
              {(data?.soldeMonetaire ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Wallet size={11} /> Solde : {(data?.soldeMonetaire ?? 0).toLocaleString()} F
                </div>
              )}
              {data?.credits.filter(c => c.solde > 0).map(c => (
                <div key={c.categorie.id} className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={11} /> {c.categorie.nom} : {Math.floor(c.solde / 60)} min
                </div>
              ))}
              {bonusDisponible && (
                <div className="flex items-center gap-1.5 text-orange-400 font-medium">
                  <Sparkles size={11} /> Bonus : {Math.floor(data!.bonus!.solde / 60)} min offerts
                </div>
              )}
            </div>

            {/* Durées disponibles */}
            {prolongDurees.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {prolongDurees.sort((a, b) => a.secondes - b.secondes).map(d => {
                  const creditCatProlong = data?.credits.find(c => c.categorie.id === d.categorieId);
                  const peutAvecMinutes = (creditCatProlong?.solde ?? 0) >= d.secondes;
                  const peutAvecSolde = (data?.soldeMonetaire ?? 0) >= d.prix;
                  const peutAvecBonus = bonusDisponible && (data!.bonus!.solde >= d.secondes);
                  const disponible = peutAvecMinutes || peutAvecSolde || peutAvecBonus;
                  return (
                    <button key={d.id} onClick={() => { if (disponible) { setProlongDureeId(String(d.id)); setUseBonusProlong(false); } }}
                      disabled={!disponible}
                      className={`p-3 rounded-xl border text-sm transition-all ${prolongDureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : disponible ? "bg-muted border-border hover:border-primary/30" : "opacity-40 cursor-not-allowed bg-muted border-border"}`}>
                      <div className="font-bold">{d.libelle}</div>
                      <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Chargement des durées...</p>
            )}

            {/* Toggle bonus — visible uniquement si bonus suffisant pour la durée sélectionnée */}
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
            <Button variant="ghost" onClick={() => { setOpenProlong(false); setUseBonusProlong(false); }}>Annuler</Button>
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

      {/* Dialog démarrer session */}
      <Dialog open={openStart} onOpenChange={v => { if (!v) { setOpenStart(false); setCatId(""); setDureeId(""); setUseBonus(false); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Démarrer une session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={catId} onValueChange={v => { setCatId(v); setDureeId(""); setUseBonus(false); }}>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
            {catId && (
              <Select value={dureeId} onValueChange={v => { setDureeId(v); setUseBonus(false); }}>
                <SelectTrigger><SelectValue placeholder="Choisir une durée" /></SelectTrigger>
                <SelectContent>{durees.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.libelle} — {d.prix.toLocaleString()} F</SelectItem>)}</SelectContent>
              </Select>
            )}
            {catId && (
              <div className="text-xs bg-muted/30 rounded-lg px-3 py-2 space-y-1">
                {creditCat && creditCat.solde > 0 ? (
                  <div className="text-muted-foreground">
                    Crédit : <span className="font-semibold text-foreground">{Math.floor(creditCat.solde / 60)} min</span>
                    {selectedDuree && creditCat.solde < selectedDuree.secondes && (
                      <span className="text-destructive ml-2">— Insuffisant</span>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">Aucun crédit pour cette catégorie</div>
                )}
                {(data?.soldeMonetaire ?? 0) > 0 && (
                  <div className="text-primary font-medium">
                    Solde disponible : {(data?.soldeMonetaire ?? 0).toLocaleString()} F
                    {selectedDuree && (data?.soldeMonetaire ?? 0) >= selectedDuree.prix && (creditCat?.solde ?? 0) < selectedDuree.secondes && (
                      <span className="text-green-400 ml-2">→ Achat direct {selectedDuree.prix.toLocaleString()} F ✓</span>
                    )}
                  </div>
                )}
                {bonusDisponible && (
                  <div className="text-orange-400 font-medium flex items-center gap-1">
                    <Sparkles size={10} /> Bonus : {Math.floor(data!.bonus!.solde / 60)} min offerts
                  </div>
                )}
              </div>
            )}

            {/* Toggle bonus — visible uniquement si bonus suffisant pour la durée sélectionnée */}
            {bonusSuffisantStart && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
                <p className="text-xs text-orange-400 font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles size={12} /> Vous avez assez de bonus pour cette durée
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseBonus(false)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                      !useBonus ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/20"
                    )}
                  >
                    <Wallet size={11} className="inline mr-1" /> Crédit / Solde
                  </button>
                  <button
                    onClick={() => setUseBonus(true)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                      useBonus ? "bg-orange-500/10 border-orange-500/40 text-orange-400" : "bg-muted border-border text-muted-foreground hover:border-orange-500/20"
                    )}
                  >
                    <Sparkles size={11} className="inline mr-1" /> Utiliser mes bonus
                  </button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleStart}
              disabled={
                !catId || !dureeId || loading ||
                (!useBonus && !!selectedDuree && (creditCat?.solde ?? 0) < selectedDuree.secondes && (data?.soldeMonetaire ?? 0) < selectedDuree.prix)
              }
              className={useBonus ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
            >
              {useBonus ? <Sparkles size={14} className="mr-1.5" /> : <Play size={14} className="mr-1.5" />}
              Démarrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
