import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Search, Ticket, Zap, CheckCircle2, History, Clock, Monitor, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import gerantService, { Client, Categorie, Duree, Recharge, Poste } from "@/services/gerantService";
import api from "@/services/api";

const TYPE_LABELS: Record<string, string> = {
  RECHARGE_GERANT: "Gérant",
  RECHARGE_CLIENT: "Client",
  RECHARGE_COUPON: "Coupon",
};

export default function GerantRecharges() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [durees, setDurees] = useState<Duree[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [rechargesAttente, setRechargesAttente] = useState<Recharge[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);

  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [search, setSearch] = useState("");
  const [searchHisto, setSearchHisto] = useState("");
  const [loading, setLoading] = useState(false);

  // Après recharge : afficher postes dispo + complément temps
  const [showPostes, setShowPostes] = useState(false);
  const [lastRechargeClientId, setLastRechargeClientId] = useState<number | null>(null);
  const [lastRechargeCategId, setLastRechargeCategId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponClientId, setCouponClientId] = useState("");
  const [couponCategorieId, setCouponCategorieId] = useState("all");
  const [couponLoading, setCouponLoading] = useState(false);

  // Complément de temps sur session active
  const [complementDialog, setComplementDialog] = useState(false);
  const [complementClientId, setComplementClientId] = useState("");
  const [complementDureeId, setComplementDureeId] = useState("");
  const [complementCategId, setComplementCategId] = useState("");
  const [complementDurees, setComplementDurees] = useState<Duree[]>([]);
  const [complementLoading, setComplementLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  function loadData() {
    Promise.all([
      gerantService.getClients(),
      gerantService.getCategories(),
      gerantService.getPostesDisponibles(),
      gerantService.getRechargesEnAttente(),
      gerantService.getHistoriqueRecharges(),
      gerantService.getSessions(),
    ]).then(([c, cat, p, r, h, s]) => {
      setClients(c);
      setCategories(cat);
      setPostes(p);
      setRechargesAttente(r);
      setHistorique(h);
      setActiveSessions(s.filter((sess: any) => sess.statut === 'ACTIVE'));
    });
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!categorieId) { setDurees([]); setDureeId(""); return; }
    gerantService.getDurees(Number(categorieId)).then(setDurees);
    setDureeId("");
  }, [categorieId]);

  useEffect(() => {
    if (!complementCategId) { setComplementDurees([]); setComplementDureeId(""); return; }
    gerantService.getDurees(Number(complementCategId)).then(setComplementDurees);
    setComplementDureeId("");
  }, [complementCategId]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const postesDispo = postes.filter(p => p.categorieId === lastRechargeCategId && p.statut === 'LIBRE');

  async function handleRecharge() {
    if (!clientId || !categorieId || !dureeId) {
      toast({ title: "Sélectionner client, catégorie et durée", variant: "destructive" });
      return;
    }
    const m = selectedDuree?.prix || 0;
    if (!m) { toast({ title: "Durée sans prix", variant: "destructive" }); return; }

    setLoading(true);
    try {
      await gerantService.creerRecharge({
        clientId: Number(clientId),
        categorieId: Number(categorieId),
        dureeId: Number(dureeId),
        montant: m,
      });
      toast({ title: `Compte de ${selectedClient?.pseudo} rechargé — +${selectedDuree?.libelle}` });
      setLastRechargeClientId(Number(clientId));
      setLastRechargeCategId(Number(categorieId));
      setShowPostes(true);
      setClientId(""); setCategorieId(""); setDureeId("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur recharge", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleLancerCoupon() {
    if (!couponCode || !couponClientId) {
      toast({ title: "Saisissez le code coupon et sélectionnez le client", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      const payload: any = { code: couponCode, clientId: Number(couponClientId) };
      if (couponCategorieId && couponCategorieId !== "all") {
        payload.categorieId = Number(couponCategorieId);
      }
      const res = await api.post('/gerant/recharges/coupon', payload);
      const credits = res.data.credits as { minutesAjoutees: number; categorieId: number }[];
      const detail = credits?.map(c => {
        const cat = categories.find(cat => cat.id === c.categorieId);
        return `+${c.minutesAjoutees}min ${cat?.nom ?? ''}`;
      }).join(' | ') ?? '';
      toast({ title: "Coupon appliqué ✅", description: detail });
      setCouponCode(""); setCouponClientId(""); setCouponCategorieId("all");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur coupon", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleComplement() {
    if (!complementClientId || !complementDureeId) {
      toast({ title: "Sélectionner client et durée", variant: "destructive" });
      return;
    }
    setComplementLoading(true);
    try {
      // Trouver la session active du client
      const sessionActive = activeSessions.find(
        (s: any) => !s.estCoupon && s.clientId === Number(complementClientId)
      );

      if (sessionActive) {
        // Prolonger la session en cours (modifie session.fin en temps réel)
        await api.post(`/gerant/sessions/${sessionActive.id}/prolonger`, {
          dureeId: Number(complementDureeId),
        });
        toast({ title: "Session prolongée ✅", description: "Le timer a été mis à jour en temps réel" });
      } else {
        // Pas de session active → simple recharge sur le compte
        await gerantService.creerRecharge({
          clientId: Number(complementClientId),
          categorieId: Number(complementCategId),
          dureeId: Number(complementDureeId),
          montant: complementDurees.find(d => d.id === Number(complementDureeId))?.prix ?? 0,
        });
        toast({ title: "Crédit ajouté au compte du client" });
      }

      setComplementDialog(false);
      setComplementClientId(""); setComplementDureeId(""); setComplementCategId("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setComplementLoading(false);
    }
  }

  async function handleValider(id: number) {
    try {
      await gerantService.validerRecharge(id);
      toast({ title: "Recharge validée" });
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur validation", variant: "destructive" });
    }
  }

  const filteredAttente = rechargesAttente.filter(r =>
    !search || r.client?.pseudo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistorique = historique.filter(r =>
    !searchHisto || r.client?.pseudo?.toLowerCase().includes(searchHisto.toLowerCase())
  );

  return (
    <>
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Recharges</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Recharger le compte d'un client</p>
          </div>
          <Button variant="outline" onClick={() => setComplementDialog(true)} className="gap-1.5" data-testid="button-complement">
            <Plus size={15} /> Compléter le temps
          </Button>
        </div>

        {/* Formulaire de recharge */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-client-recharge"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.active).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.pseudo} — {c.telephone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Select value={categorieId} onValueChange={setCategorieId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {durees.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Ticket size={12} /> Durée à créditer</Label>
              <div className="grid grid-cols-3 gap-2">
                {durees.sort((a, b) => a.secondes - b.secondes).map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDureeId(String(d.id))}
                    className={`p-3 rounded-xl border text-sm transition-all ${dureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-foreground hover:border-primary/30"}`}
                    data-testid={`button-duree-${d.id}`}
                  >
                    <div className="font-bold">{d.libelle}</div>
                    <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full gap-2" onClick={handleRecharge} disabled={loading} data-testid="button-recharge">
            <Zap size={15} /> {loading ? "Recharge en cours..." : "Recharger"}
          </Button>
        </div>

        {/* Postes dispo après recharge */}
        {showPostes && (
          <div className="bg-card border border-green-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-green-400" />
                <h2 className="text-sm font-semibold text-foreground">Postes disponibles — choisir un poste</h2>
              </div>
              <button onClick={() => setShowPostes(false)} className="text-xs text-muted-foreground hover:text-foreground">Fermer</button>
            </div>
            {postesDispo.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun poste libre dans cette catégorie</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {postesDispo.map(p => (
                  <div key={p.id} className="p-3 rounded-xl border border-green-500/20 bg-green-500/5 text-center">
                    <Monitor size={18} className="text-green-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-foreground">{p.nom}</div>
                    <div className="text-xs text-green-400 mt-0.5">Libre</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lancer un coupon */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-foreground">Appliquer un coupon client</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={couponClientId} onValueChange={setCouponClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.active).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.pseudo} — {c.telephone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Code coupon</Label>
              <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" className="font-mono" data-testid="input-coupon-code" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie à créditer</Label>
            <Select value={couponCategorieId} onValueChange={setCouponCategorieId}>
              <SelectTrigger><SelectValue placeholder="Toutes les catégories (proportionnel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Si non spécifié, le crédit est réparti sur toutes les catégories selon leurs tarifs</p>
          </div>
          <Button variant="outline" onClick={handleLancerCoupon} disabled={couponLoading} className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" data-testid="button-apply-coupon">
            <Ticket size={14} /> {couponLoading ? "Application..." : "Appliquer le coupon"}
          </Button>
        </div>

        {/* Recharges clients en attente */}
        {filteredAttente.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground flex-1">Recharges clients en attente ({rechargesAttente.length})</h2>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher..." className="pl-8 h-7 text-xs w-40" />
              </div>
            </div>
            <div className="divide-y divide-border">
              {filteredAttente.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3" data-testid={`row-recharge-attente-${r.id}`}>
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={12} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{r.client?.pseudo ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(r.date), "dd MMM · HH:mm", { locale: fr })}</div>
                  </div>
                  <div className="text-right mr-2">
                    <div className="text-sm font-bold text-green-400">+{r.montant.toLocaleString()} F</div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleValider(r.id)}>
                    <CheckCircle2 size={12} /> Valider
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique des recharges */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <History size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground flex-1">Historique des recharges ({historique.length})</h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchHisto} onChange={e => setSearchHisto(e.target.value)} placeholder="Chercher..." className="pl-8 h-7 text-xs w-40" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {filteredHistorique.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune recharge enregistrée</div>
            ) : filteredHistorique.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3" data-testid={`row-historique-${r.id}`}>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={12} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{r.client?.pseudo ?? "—"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock size={10} /> {format(new Date(r.date), "dd MMM yyyy · HH:mm", { locale: fr })}
                    {r.creditsClient && r.creditsClient.filter((c: any) => c.soldMinutes > 0).length > 0 && (
                      <span className="text-muted-foreground">
                        · Solde : {r.creditsClient.filter((c: any) => c.soldMinutes > 0).map((c: any) => `${c.soldMinutes}min (${c.categorie})`).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-sm font-bold text-primary">+{r.montant.toLocaleString()} F</div>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {TYPE_LABELS[r.type] ?? r.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>

    {/* Dialog compléter le temps */}
    <Dialog open={complementDialog} onOpenChange={v => { if (!v) { setComplementDialog(false); setComplementClientId(""); setComplementCategId(""); setComplementDureeId(""); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus size={16} className="text-primary" />Compléter le temps d'un client</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Client en cours de jeu</Label>
            <Select value={complementClientId} onValueChange={setComplementClientId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {activeSessions.map(s => (
                  <SelectItem key={s.clientId} value={String(s.clientId)}>
                    {s.client?.pseudo} — {s.poste?.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {complementClientId && (
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={complementCategId} onValueChange={setComplementCategId}>
                <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {complementDurees.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {complementDurees.sort((a, b) => a.secondes - b.secondes).map(d => (
                <button key={d.id} onClick={() => setComplementDureeId(String(d.id))}
                  className={`p-3 rounded-xl border text-sm transition-all ${complementDureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"}`}>
                  <div className="font-bold">{d.libelle}</div>
                  <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setComplementDialog(false)}>Annuler</Button>
          <Button onClick={handleComplement} disabled={complementLoading || !complementClientId || !complementDureeId}>
            <Plus size={14} className="mr-1.5" /> {complementLoading ? "En cours..." : "Ajouter le temps"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
