import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DollarSign, Search, Ticket, Zap, CheckCircle2, History, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import gerantService, { Client, Categorie, Duree, Recharge } from "@/services/gerantService";

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
  const [rechargesAttente, setRechargesAttente] = useState<Recharge[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);

  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [montant, setMontant] = useState("");
  const [search, setSearch] = useState("");
  const [searchHisto, setSearchHisto] = useState("");
  const [loading, setLoading] = useState(false);

  function loadData() {
    Promise.all([
      gerantService.getClients(),
      gerantService.getCategories(),
      gerantService.getRechargesEnAttente(),
      gerantService.getHistoriqueRecharges(),
    ]).then(([c, cat, r, h]) => {
      setClients(c);
      setCategories(cat);
      setRechargesAttente(r);
      setHistorique(h);
    });
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!categorieId) { setDurees([]); setDureeId(""); return; }
    gerantService.getDurees(Number(categorieId)).then(setDurees);
    setDureeId("");
  }, [categorieId]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = durees.find(d => d.id === Number(dureeId));

  async function handleRecharge() {
    if (!clientId || !categorieId || !dureeId) {
      toast({ title: "Sélectionner client, catégorie et durée", variant: "destructive" });
      return;
    }
    const m = Number(montant) || selectedDuree?.prix || 0;
    if (!m) { toast({ title: "Montant invalide", variant: "destructive" }); return; }

    setLoading(true);
    try {
      await gerantService.creerRecharge({
        clientId: Number(clientId),
        categorieId: Number(categorieId),
        dureeId: Number(dureeId),
        montant: m,
      });
      toast({ title: `Compte de ${selectedClient?.pseudo} rechargé — +${selectedDuree?.libelle}` });
      setClientId(""); setCategorieId(""); setDureeId(""); setMontant("");
      loadData();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur recharge", variant: "destructive" });
    } finally {
      setLoading(false);
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
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recharges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Recharger le compte d'un client</p>
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
                    onClick={() => { setDureeId(String(d.id)); setMontant(String(d.prix)); }}
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

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><DollarSign size={12} /> Montant encaissé (FCFA)</Label>
            <Input value={montant} onChange={e => setMontant(e.target.value)} type="number" placeholder="Montant payé par le client" data-testid="input-montant" />
          </div>

          <Button className="w-full gap-2" onClick={handleRecharge} disabled={loading} data-testid="button-recharge">
            <Zap size={15} /> {loading ? "Recharge en cours..." : "Recharger"}
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
  );
}
