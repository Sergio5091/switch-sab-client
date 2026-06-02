import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, User, Tag, Clock, Monitor, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import gerantService, { Client, Categorie, Duree, Poste } from "@/services/gerantService";

export default function GerantSessionNew() {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [durees, setDurees] = useState<Duree[]>([]);

  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      gerantService.getClients(),
      gerantService.getCategories(),
      gerantService.getPostesDisponibles(),
    ]).then(([c, cat, p]) => {
      setClients(c);
      setCategories(cat);
      setPostes(p);
    });
  }, []);

  useEffect(() => {
    if (!categorieId) { setDurees([]); setDureeId(""); return; }
    gerantService.getDurees(Number(categorieId)).then(setDurees);
    setDureeId("");
  }, [categorieId]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const selectedCat = categories.find(c => c.id === Number(categorieId));
  const posteLibre = postes.find(p => p.categorieId === Number(categorieId) && p.statut === 'LIBRE');

  // Crédit disponible pour la catégorie sélectionnée
  const creditCategorie = selectedClient?.credits?.find(cr => cr.categorie.id === Number(categorieId));
  const creditSuffisant = creditCategorie && selectedDuree ? creditCategorie.solde >= selectedDuree.secondes : false;

  async function handleStart() {
    if (!clientId || !categorieId || !dureeId) {
      toast({ title: "Remplir tous les champs", variant: "destructive" });
      return;
    }
    if (!creditSuffisant) {
      toast({ title: "Crédit insuffisant pour cette catégorie", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await gerantService.demarrerSession({
        clientId: Number(clientId),
        categorieId: Number(categorieId),
        dureeId: Number(dureeId),
      });
      toast({ title: "Session démarrée", description: `${selectedClient?.pseudo} — ${selectedCat?.nom} — ${selectedDuree?.libelle}` });
      setLocation("/gerant/dashboard");
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur démarrage session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Nouvelle session</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Démarrer une session pour un client</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><User size={13} /> Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-client"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.active).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.pseudo} — {c.telephone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><Tag size={13} /> Catégorie</Label>
            <Select value={categorieId} onValueChange={v => { setCategorieId(v); setDureeId(""); }}>
              <SelectTrigger data-testid="select-categorie-session"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Crédit disponible */}
          {clientId && categorieId && creditCategorie !== undefined && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${creditSuffisant || !selectedDuree ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
              Crédit {selectedCat?.nom} : {Math.floor((creditCategorie?.solde ?? 0) / 60)} min disponibles
            </div>
          )}

          {categorieId && durees.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Clock size={13} /> Durée</Label>
              <div className="grid grid-cols-3 gap-2">
                {durees.sort((a, b) => a.secondes - b.secondes).map(d => {
                  const suffisant = creditCategorie ? creditCategorie.solde >= d.secondes : false;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDureeId(String(d.id))}
                      disabled={!suffisant}
                      className={`p-3 rounded-xl border text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${dureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-foreground hover:border-primary/30"}`}
                      data-testid={`button-duree-${d.id}`}
                    >
                      <div className="font-bold">{d.libelle}</div>
                      <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Poste disponible */}
          {categorieId && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Monitor size={13} /> Poste disponible</Label>
              {posteLibre ? (
                <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/10 text-sm text-green-400 font-medium">
                  {posteLibre.nom} — sera assigné automatiquement
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-sm text-destructive">
                  Aucun poste libre dans cette catégorie
                </div>
              )}
            </div>
          )}

          {/* Récapitulatif */}
          {selectedClient && selectedDuree && selectedCat && posteLibre && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Récapitulatif</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground"><User size={12} />{selectedClient.pseudo}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Tag size={12} />{selectedCat.nom}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Clock size={12} />{selectedDuree.libelle}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Monitor size={12} />{posteLibre.nom}</div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                <DollarSign size={14} className="text-primary" />
                <span className="text-primary font-bold text-lg">{selectedDuree.prix.toLocaleString()} F</span>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2 font-semibold"
            disabled={!clientId || !categorieId || !dureeId || !posteLibre || loading}
            onClick={handleStart}
            data-testid="button-start-session"
          >
            <Play size={16} /> {loading ? "Démarrage..." : "Démarrer la session"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
