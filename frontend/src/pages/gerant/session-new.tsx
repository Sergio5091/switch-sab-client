import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, User, Tag, Clock, Monitor, DollarSign, History, Zap, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import gerantService, { Client, Categorie, Duree, Poste, Session } from "@/services/gerantService";

function formatTemps(secondes: number): string {
  if (secondes <= 0) return "0min";
  const h = Math.floor(secondes / 3600);
  const m = Math.floor((secondes % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

function getTempsRestant(fin: string): number {
  return Math.max(0, Math.floor((new Date(fin).getTime() - Date.now()) / 1000));
}

export default function GerantSessionNew() {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [durees, setDurees] = useState<Duree[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  // Toutes les durées par catégorie (pour le démarrage rapide)
  const [toutesLesDurees, setToutesLesDurees] = useState<Record<number, Duree[]>>({});

  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRapide, setLoadingRapide] = useState<number | null>(null);
  const [showFormulaire, setShowFormulaire] = useState(false);

  useEffect(() => {
    Promise.all([
      gerantService.getClients(),
      gerantService.getCategories(),
      gerantService.getPostesDisponibles(),
      gerantService.getSessions(),
    ]).then(async ([c, cat, p, s]) => {
      setClients(c);
      setCategories(cat);
      setPostes(p);
      setSessions(s);

      // Charger toutes les durées pour chaque catégorie
      const dureeMap: Record<number, Duree[]> = {};
      await Promise.all(cat.map(async (cat) => {
        const d = await gerantService.getDurees(cat.id);
        dureeMap[cat.id] = d;
      }));
      setToutesLesDurees(dureeMap);
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

  const creditCategorie = selectedClient?.credits?.find(cr => cr.categorie.id === Number(categorieId));
  const creditSuffisant = creditCategorie && selectedDuree ? creditCategorie.solde >= selectedDuree.secondes : false;

  // Crédits disponibles du client sélectionné (solde > 0)
  const creditsDisponibles = selectedClient?.credits?.filter(cr => cr.solde > 0) ?? [];

  // Pour chaque crédit, trouver la durée la plus grande qui rentre dans le solde
  const getMeilleureDuree = (categorieId: number, soldeSecondes: number): Duree | null => {
    const dureesCategorie = toutesLesDurees[categorieId] ?? [];
    const compatibles = dureesCategorie
      .filter(d => d.secondes <= soldeSecondes)
      .sort((a, b) => b.secondes - a.secondes);
    return compatibles[0] ?? null;
  };

  // Démarrage rapide depuis un crédit existant
  async function handleDemarrerRapide(categorieId: number, duree: Duree) {
    if (!clientId) return;
    const poste = postes.find(p => p.categorieId === categorieId && p.statut === 'LIBRE');
    if (!poste) {
      toast({ title: "Aucun poste libre dans cette catégorie", variant: "destructive" });
      return;
    }
    setLoadingRapide(categorieId);
    try {
      await gerantService.demarrerSession({
        clientId: Number(clientId),
        categorieId,
        dureeId: duree.id,
      });
      const cat = categories.find(c => c.id === categorieId);
      toast({ title: "Session démarrée", description: `${selectedClient?.pseudo} — ${cat?.nom} — ${duree.libelle}` });
      setLocation("/gerant/dashboard");
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur démarrage session", variant: "destructive" });
    } finally {
      setLoadingRapide(null);
    }
  }

  // Démarrage manuel (formulaire complet)
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
          {/* Sélection client */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><User size={13} /> Client</Label>
            <Select value={clientId} onValueChange={v => { setClientId(v); setCategorieId(""); setDureeId(""); setShowFormulaire(false); }}>
              <SelectTrigger data-testid="select-client"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.active).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.pseudo} — {c.telephone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Démarrage rapide si le client a du crédit */}
          {selectedClient && creditsDisponibles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Crédit disponible — démarrer directement :</p>
              <div className="flex flex-wrap gap-2">
                {creditsDisponibles.map(cr => {
                  const meilleureDuree = getMeilleureDuree(cr.categorie.id, cr.solde);
                  const posteDisponible = postes.find(p => p.categorieId === cr.categorie.id && p.statut === 'LIBRE');
                  if (!meilleureDuree) return null;
                  return (
                    <button
                      key={cr.id}
                      onClick={() => handleDemarrerRapide(cr.categorie.id, meilleureDuree)}
                      disabled={!posteDisponible || loadingRapide === cr.categorie.id}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                        ${posteDisponible
                          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 active:scale-95"
                          : "bg-muted border-border text-muted-foreground opacity-50 cursor-not-allowed"
                        }`}
                      data-testid={`button-rapide-${cr.categorie.id}`}
                    >
                      {loadingRapide === cr.categorie.id
                        ? <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <Play size={13} fill="currentColor" />
                      }
                      <div className="text-left">
                        <div>{cr.categorie.nom} — {formatTemps(cr.solde)}</div>
                        <div className="text-xs opacity-60 font-normal">
                          {posteDisponible ? "Cliquer pour démarrer" : "Pas de poste libre"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bouton pour afficher le formulaire complet */}
          {selectedClient && (
            <button
              onClick={() => setShowFormulaire(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform ${showFormulaire ? "rotate-180" : ""}`} />
              {showFormulaire ? "Masquer le formulaire" : "Formulaire complet (autre catégorie / durée)"}
            </button>
          )}

          {/* Formulaire complet — affiché si client sans crédit ou si demandé */}
          {(!selectedClient || showFormulaire || creditsDisponibles.length === 0) && selectedClient && (
            <>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm"><Tag size={13} /> Catégorie</Label>
                <Select value={categorieId} onValueChange={v => { setCategorieId(v); setDureeId(""); }}>
                  <SelectTrigger data-testid="select-categorie-session"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

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
            </>
          )}

          {/* Aucun crédit et pas de formulaire ouvert */}
          {selectedClient && creditsDisponibles.length === 0 && !showFormulaire && (
            <div className="text-xs text-muted-foreground px-1">
              Ce client n'a pas encore de crédit. Rechargez son compte d'abord ou utilisez le formulaire complet.
            </div>
          )}
        </div>

        {/* Historique des sessions */}
        {sessions.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <History size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Sessions du jour ({sessions.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {sessions.map(s => {
                const tempsRestant = s.fin ? getTempsRestant(s.fin) : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{s.client?.pseudo}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Clock size={10} />
                        {format(new Date(s.debut), "HH:mm", { locale: fr })}
                        {" · "}{s.duree?.libelle}
                        {" · "}{s.poste?.nom}
                        {s.estBonus && <span className="text-primary">• Bonus</span>}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {s.statut === 'ACTIVE' && tempsRestant > 0 && (
                        <span className="text-xs font-mono font-bold text-green-400">
                          {formatTemps(tempsRestant)}
                        </span>
                      )}
                      <Badge className={
                        s.statut === 'ACTIVE'
                          ? "bg-green-500/10 text-green-400 text-xs"
                          : s.statut === 'ARRETEE'
                          ? "bg-yellow-500/10 text-yellow-400 text-xs"
                          : "bg-muted text-muted-foreground text-xs"
                      }>
                        {s.statut === 'ACTIVE' ? "En cours" : s.statut === 'ARRETEE' ? "Arrêtée" : "Terminée"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
