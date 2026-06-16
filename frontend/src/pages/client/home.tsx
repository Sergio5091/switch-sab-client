import { useState, useEffect } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Link } from "wouter";
import { DollarSign, Gift, Clock, Play, Square, ChevronRight, Ticket, Wallet } from "lucide-react";
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
interface ActiveSession { id: number; fin: string; estBonus: boolean; duree: { libelle: string; secondes: number } }
interface RecentSession { id: number; debut: string; estBonus: boolean; duree: { libelle: string; prix: number }; poste: { nom: string } }
interface HomeData {
  pseudo: string;
  soldeMonetaire: number;
  credits: Credit[];
  bonus: { solde: number; disponible: boolean } | null;
  activeSession: ActiveSession | null;
  recentSessions: RecentSession[];
}
interface Duree { id: number; libelle: string; secondes: number; prix: number }

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

  async function handleStart() {
    if (!catId || !dureeId) return;
    setLoading(true);
    try {
      await api.post('/client/session/start', { categorieId: Number(catId), dureeId: Number(dureeId) });
      toast({ title: "Session démarrée !" });
      setOpenStart(false);
      setCatId(""); setDureeId("");
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleStop() {
    if (!data?.activeSession) return;
    setLoading(true);
    try {
      await api.post(`/client/session/${data.activeSession.id}/stop`);
      toast({ title: "Session arrêtée" });
      reload();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setLoading(false); }
  }

  const activeSession = data?.activeSession ?? null;
  const tempsRestant = activeSession ? getTempsRestant(activeSession.fin) : 0;
  const pct = activeSession ? (tempsRestant / activeSession.duree.secondes) * 100 : 0;
  const urgentColor = pct < 10 ? "text-destructive" : pct < 25 ? "text-yellow-400" : "text-green-400";
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const creditCat = data?.credits.find(c => c.categorie.id === Number(catId));

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
            <div className="text-2xl font-bold text-foreground">{Math.floor((data?.bonus?.solde ?? 0) / 60)}</div>
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
            <Button size="sm" variant="destructive" className="w-full gap-1.5" onClick={handleStop} disabled={loading}>
              <Square size={13} /> Arrêter la session
            </Button>
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
            <Button size="sm" className="gap-1.5" onClick={() => setOpenStart(true)}>
              <Play size={13} /> Démarrer une session
            </Button>
          </div>
        )}

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

      {/* Dialog démarrer session */}
      <Dialog open={openStart} onOpenChange={v => { if (!v) { setOpenStart(false); setCatId(""); setDureeId(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Démarrer une session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
            {catId && (
              <Select value={dureeId} onValueChange={setDureeId}>
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
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleStart}
              disabled={
                !catId || !dureeId || loading ||
                (!!selectedDuree && (creditCat?.solde ?? 0) < selectedDuree.secondes && (data?.soldeMonetaire ?? 0) < selectedDuree.prix)
              }
            >
              <Play size={14} className="mr-1.5" /> Démarrer
            </Button>
          </DialogFooter>        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
