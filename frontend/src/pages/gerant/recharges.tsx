import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Search, Ticket, Zap, CheckCircle2, History, Clock, Monitor, Plus, User, X } from "lucide-react";
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

// ─── Composant recherche client réutilisable ──────────────────────────────
function ClientSearch({
  clients,
  value,
  onChange,
  placeholder = "Rechercher un client...",
  testId,
}: {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clients.find(c => String(c.id) === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = clients.filter(c =>
    c.active && (
      !query ||
      c.pseudo.toLowerCase().includes(query.toLowerCase()) ||
      c.telephone?.includes(query)
    )
  ).slice(0, 20);

  function select(c: Client) {
    onChange(String(c.id));
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/30 rounded-lg">
          <User size={13} className="text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1">{selected.pseudo}</span>
          {selected.telephone && <span className="text-xs text-muted-foreground">{selected.telephone}</span>}
          <button onClick={clear} className="text-muted-foreground hover:text-foreground ml-1"><X size={13} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-8"
            data-testid={testId}
          />
        </div>
      )}
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Aucun client trouvé</div>
          ) : filtered.map(c => (
            <button key={c.id} onClick={() => select(c)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{c.pseudo[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{c.pseudo}</div>
                {c.telephone && <div className="text-xs text-muted-foreground">{c.telephone}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GerantRecharges() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [durees, setDurees] = useState<Duree[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [rechargesAttente, setRechargesAttente] = useState<Recharge[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Recharge simple
  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPostes, setShowPostes] = useState(false);
  const [lastRechargeClientId, setLastRechargeClientId] = useState<number | null>(null);
  const [lastRechargeCategId, setLastRechargeCategId] = useState<number | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponClientId, setCouponClientId] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Complément de temps
  const [complementDialog, setComplementDialog] = useState(false);
  const [complementClientId, setComplementClientId] = useState("");
  const [complementSessionId, setComplementSessionId] = useState("");
  const [complementDureeId, setComplementDureeId] = useState("");
  const [complementDurees, setComplementDurees] = useState<Duree[]>([]);
  const [complementLoading, setComplementLoading] = useState(false);

  // Filtres historique
  const [search, setSearch] = useState("");
  const [searchHisto, setSearchHisto] = useState("");
  const [filtreType, setFiltreType] = useState("all");
  const [pageHisto, setPageHisto] = useState(1);
  const PAGE_SIZE = 10;

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

  // Quand on choisit un client dans "compléter le temps", charger les durées de sa catégorie de session active
  useEffect(() => {
    if (!complementClientId) { setComplementDurees([]); setComplementDureeId(""); setComplementSessionId(""); return; }
    const sessions = activeSessions.filter((s: any) => String(s.clientId) === complementClientId);
    if (!sessions.length) { setComplementDurees([]); setComplementDureeId(""); setComplementSessionId(""); return; }
    // Si le joueur n'a qu'une session, la sélectionner auto et charger ses durées
    if (sessions.length === 1) {
      setComplementSessionId(String(sessions[0].id));
      const catId = sessions[0].poste?.categorieId;
      if (catId) gerantService.getDurees(Number(catId)).then(setComplementDurees);
    } else {
      // Plusieurs sessions → attendre que l'utilisateur choisisse
      setComplementSessionId("");
      setComplementDurees([]);
    }
    setComplementDureeId("");
  }, [complementClientId, activeSessions]);

  // Quand on choisit une session spécifique (cas multi-session)
  useEffect(() => {
    if (!complementSessionId) return;
    const session = activeSessions.find((s: any) => String(s.id) === complementSessionId);
    if (!session) return;
    const catId = session.poste?.categorieId;
    if (catId) gerantService.getDurees(Number(catId)).then(setComplementDurees);
    setComplementDureeId("");
  }, [complementSessionId]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const postesDispo = postes.filter(p => p.categorieId === lastRechargeCategId && p.statut === 'LIBRE');

  // Clients avec session active (pour le complément)
  const clientsAvecSession = clients.filter(c =>
    activeSessions.some((s: any) => s.clientId === c.id)
  );

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
        clientId: Number(clientId), categorieId: Number(categorieId),
        dureeId: Number(dureeId), montant: m,
      });
      toast({ title: `Compte de ${selectedClient?.pseudo} rechargé — +${selectedDuree?.libelle}` });
      setLastRechargeClientId(Number(clientId));
      setLastRechargeCategId(Number(categorieId));
      setShowPostes(true);
      setClientId(""); setCategorieId(""); setDureeId("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur recharge", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleLancerCoupon() {
    if (!couponCode || !couponClientId) {
      toast({ title: "Saisissez le code coupon et sélectionnez le client", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      const res = await api.post('/gerant/recharges/coupon', { code: couponCode, clientId: Number(couponClientId) });
      toast({ title: "Coupon appliqué ✅", description: res.data.message });
      setCouponCode(""); setCouponClientId("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur coupon", variant: "destructive" });
    } finally { setCouponLoading(false); }
  }

  async function handleComplement() {
    if (!complementClientId || !complementDureeId) {
      toast({ title: "Sélectionner client et durée", variant: "destructive" });
      return;
    }
    setComplementLoading(true);
    try {
      const sessionId = complementSessionId ||
        String(activeSessions.find((s: any) => String(s.clientId) === complementClientId)?.id);

      if (sessionId) {
        await api.post(`/gerant/sessions/${sessionId}/prolonger`, {
          dureeId: Number(complementDureeId),
        });
        toast({ title: "Session prolongée ✅", description: "Le timer a été mis à jour en temps réel" });
      } else {
        const catId = complementDurees.find(d => d.id === Number(complementDureeId))?.categorieId;
        await gerantService.creerRecharge({
          clientId: Number(complementClientId),
          categorieId: Number(catId),
          dureeId: Number(complementDureeId),
          montant: complementDurees.find(d => d.id === Number(complementDureeId))?.prix ?? 0,
        });
        toast({ title: "Crédit ajouté au compte du client" });
      }
      setComplementDialog(false);
      setComplementClientId(""); setComplementSessionId(""); setComplementDureeId("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally { setComplementLoading(false); }
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
    (!searchHisto || r.client?.pseudo?.toLowerCase().includes(searchHisto.toLowerCase())) &&
    (filtreType === "all" || r.type === filtreType)
  );
  const totalPages = Math.max(1, Math.ceil(filteredHistorique.length / PAGE_SIZE));
  // Remettre à la page 1 si les filtres changent (géré via les setters)
  const histoPage = filteredHistorique.slice((pageHisto - 1) * PAGE_SIZE, pageHisto * PAGE_SIZE);

  // Session active du client sélectionné pour le complément
  const sessionsActiveComplement = activeSessions.filter(
    (s: any) => String(s.clientId) === complementClientId && !s.estCoupon
  );
  const sessionActiveComplement = complementSessionId
    ? activeSessions.find((s: any) => String(s.id) === complementSessionId)
    : sessionsActiveComplement[0];

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

        {/* ── Formulaire recharge simple ── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <ClientSearch clients={clients} value={clientId} onChange={id => { setClientId(id); setCategorieId(""); setDureeId(""); }} placeholder="Rechercher par pseudo ou téléphone..." testId="search-client-recharge" />
          </div>

          {clientId && (
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategorieId(String(c.id))}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${categorieId === String(c.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"}`}>
                    {c.nom}
                  </button>
                ))}
              </div>
            </div>
          )}

          {durees.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Ticket size={12} /> Durée à créditer</Label>
              <div className="grid grid-cols-3 gap-2">
                {durees.sort((a, b) => a.secondes - b.secondes).map(d => (
                  <button key={d.id} onClick={() => setDureeId(String(d.id))}
                    className={`p-3 rounded-xl border text-sm transition-all ${dureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"}`}
                    data-testid={`button-duree-${d.id}`}>
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
                <h2 className="text-sm font-semibold text-foreground">Postes disponibles</h2>
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

        {/* ── Formulaire coupon ── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-foreground">Appliquer un coupon client</h2>
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <ClientSearch clients={clients} value={couponClientId} onChange={setCouponClientId} placeholder="Rechercher par pseudo ou téléphone..." testId="search-client-coupon" />
          </div>
          <div className="space-y-1.5">
            <Label>Code coupon</Label>
            <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" className="font-mono" data-testid="input-coupon-code" />
          </div>
          <Button variant="outline" onClick={handleLancerCoupon} disabled={couponLoading || !couponClientId || !couponCode} className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" data-testid="button-apply-coupon">
            <Ticket size={14} /> {couponLoading ? "Application..." : "Appliquer le coupon"}
          </Button>
        </div>

        {/* ── Recharges en attente ── */}
        {filteredAttente.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground flex-1">Recharges en attente ({rechargesAttente.length})</h2>
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
                  <div className="text-sm font-bold text-green-400 mr-2">+{r.montant.toLocaleString()} F</div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => handleValider(r.id)}>
                    <CheckCircle2 size={12} /> Valider
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Historique ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header avec recherche */}
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <History size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground flex-1">
              Historique
              <span className="text-muted-foreground font-normal ml-1">
                ({filteredHistorique.length}{filteredHistorique.length !== historique.length ? `/${historique.length}` : ""})
              </span>
            </h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchHisto}
                onChange={e => { setSearchHisto(e.target.value); setPageHisto(1); }}
                placeholder="Pseudo..."
                className="pl-8 h-7 text-xs w-36"
              />
            </div>
          </div>

          {/* Filtres par type */}
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {[
              { value: "all", label: "Tous" },
              { value: "RECHARGE_GERANT", label: "Gérant" },
              { value: "RECHARGE_COUPON", label: "Coupon" },
              { value: "RECHARGE_CLIENT", label: "Client" },
            ].map(f => (
              <button key={f.value}
                onClick={() => { setFiltreType(f.value); setPageHisto(1); }}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${filtreType === f.value ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/30"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="divide-y divide-border">
            {histoPage.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune recharge enregistrée</div>
            ) : histoPage.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3" data-testid={`row-historique-${r.id}`}>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={12} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{r.client?.pseudo ?? "—"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock size={10} /> {format(new Date(r.date), "dd MMM yyyy · HH:mm", { locale: fr })}
                    {r.creditsClient && r.creditsClient.filter((c: any) => c.soldMinutes > 0).length > 0 && (
                      <span>· {r.creditsClient.filter((c: any) => c.soldMinutes > 0).map((c: any) => `${c.soldMinutes}min (${c.categorie})`).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="text-sm font-bold text-primary">+{r.montant.toLocaleString()} F</div>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{TYPE_LABELS[r.type] ?? r.type}</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {pageHisto} / {totalPages} · {filteredHistorique.length} résultat{filteredHistorique.length > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pageHisto === 1} onClick={() => setPageHisto(1)}>«</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pageHisto === 1} onClick={() => setPageHisto(p => p - 1)}>‹</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(pageHisto - 2, totalPages - 4));
                  const page = start + i;
                  return (
                    <Button key={page} size="sm" variant={pageHisto === page ? "default" : "outline"}
                      className="h-7 w-7 p-0 text-xs" onClick={() => setPageHisto(page)}>
                      {page}
                    </Button>
                  );
                })}
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pageHisto === totalPages} onClick={() => setPageHisto(p => p + 1)}>›</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={pageHisto === totalPages} onClick={() => setPageHisto(totalPages)}>»</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>

    <Dialog open={complementDialog} onOpenChange={v => { if (!v) { setComplementDialog(false); setComplementClientId(""); setComplementSessionId(""); setComplementDureeId(""); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus size={16} className="text-primary" />Compléter le temps d'un client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client en cours de jeu</Label>
            <ClientSearch
              clients={clientsAvecSession}
              value={complementClientId}
              onChange={id => { setComplementClientId(id); setComplementSessionId(""); setComplementDureeId(""); }}
              placeholder="Rechercher un joueur actif..."
              testId="search-client-complement"
            />
            {clientsAvecSession.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune session active en ce moment</p>
            )}
          </div>

          {/* Sélection de session si le joueur en a plusieurs */}
          {complementClientId && sessionsActiveComplement.length > 1 && (
            <div className="space-y-1.5">
              <Label>Session à prolonger</Label>
              <div className="space-y-1.5">
                {sessionsActiveComplement.map((s: any) => (
                  <button key={s.id} onClick={() => setComplementSessionId(String(s.id))}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${complementSessionId === String(s.id) ? "bg-primary/10 border-primary/40" : "bg-muted border-border hover:border-primary/30"}`}>
                    <Monitor size={13} className="text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground">{s.poste?.nom}</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0 ml-auto">{s.duree?.libelle}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Infos session sélectionnée */}
          {sessionActiveComplement && sessionsActiveComplement.length === 1 && (
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Monitor size={12} className="text-primary" />
              <span>Session sur <span className="font-semibold text-foreground">{sessionActiveComplement.poste?.nom}</span></span>
              <Badge variant="outline" className="text-xs px-1.5 py-0 ml-auto">{sessionActiveComplement.duree?.libelle}</Badge>
            </div>
          )}

          {/* Durées */}
          {complementDurees.length > 0 && (
            <div className="space-y-1.5">
              <Label>Temps à ajouter</Label>
              <div className="grid grid-cols-3 gap-2">
                {complementDurees.sort((a, b) => a.secondes - b.secondes).map(d => (
                  <button key={d.id} onClick={() => setComplementDureeId(String(d.id))}
                    className={`p-3 rounded-xl border text-sm transition-all ${complementDureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"}`}>
                    <div className="font-bold">{d.libelle}</div>
                    <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {complementClientId && (sessionsActiveComplement.length <= 1 || complementSessionId) && complementDurees.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Chargement des durées...</p>
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
