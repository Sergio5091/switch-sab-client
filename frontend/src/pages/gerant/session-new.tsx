import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, User, Tag, Clock, Monitor, DollarSign, History, Ticket, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import gerantService, { Client, Categorie, Duree, Poste, Session } from "@/services/gerantService";
import api from "@/services/api";

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
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [durees, setDurees] = useState<Duree[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // ─── Onglet "Avec compte" ──────────────────────────────
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [posteId, setPosteId] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Onglet "Sans compte (coupon)" ────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponSolde, setCouponSolde] = useState<{ valeurInitiale: number; soldeDisponible: number; nbSessions: number } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponCategId, setCouponCategId] = useState("");
  const [couponDureeId, setCouponDureeId] = useState("");
  const [couponDurees, setCouponDurees] = useState<Duree[]>([]);
  const [couponPosteId, setCouponPosteId] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      gerantService.getClients(),
      gerantService.getCategories(),
      gerantService.getPostesDisponibles(),
      gerantService.getSessions(),
    ]).then(([c, cat, p, s]) => {
      setClients(c);
      setCategories(cat);
      setPostes(p);
      setSessions(s);
    });
  }, []);

  useEffect(() => {
    if (!categorieId) { setDurees([]); setDureeId(""); setPosteId(""); return; }
    gerantService.getDurees(Number(categorieId)).then(setDurees);
    setDureeId(""); setPosteId("");
  }, [categorieId]);

  useEffect(() => {
    if (!couponCategId) { setCouponDurees([]); setCouponDureeId(""); setCouponPosteId(""); return; }
    gerantService.getDurees(Number(couponCategId)).then(setCouponDurees);
    setCouponDureeId(""); setCouponPosteId("");
  }, [couponCategId]);

  // Filtre clients par pseudo (recherche)
  const clientsFiltres = useMemo(() => {
    if (!search.trim()) return clients.filter(c => c.active);
    const q = search.toLowerCase();
    return clients.filter(c => c.active && (
      c.pseudo.toLowerCase().includes(q) ||
      c.telephone?.includes(q)
    ));
  }, [clients, search]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = durees.find(d => d.id === Number(dureeId));
  const selectedCat = categories.find(c => c.id === Number(categorieId));
  const selectedPoste = postes.find(p => p.id === Number(posteId));
  const creditCategorie = selectedClient?.credits?.find(cr => cr.categorie.id === Number(categorieId));
  const creditSuffisant = creditCategorie && selectedDuree ? creditCategorie.solde >= selectedDuree.secondes : false;

  // Postes libres de la catégorie sélectionnée
  const postesLibresCat = postes.filter(p => p.categorieId === Number(categorieId) && p.statut === 'LIBRE');
  const postesLibresCoupon = postes.filter(p => p.categorieId === Number(couponCategId) && p.statut === 'LIBRE');

  const couponDureeSelectionnee = couponDurees.find(d => d.id === Number(couponDureeId));
  const couponSoldeSuffisant = couponSolde && couponDureeSelectionnee
    ? couponSolde.soldeDisponible >= couponDureeSelectionnee.prix
    : false;

  // ─── Vérifier solde coupon ────────────────────────────
  async function handleVerifierCoupon() {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    setCouponSolde(null);
    try {
      const res = await api.get(`/gerant/sessions/coupon/solde?code=${couponCode.trim().toUpperCase()}`);
      setCouponSolde(res.data);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Coupon introuvable", variant: "destructive" });
    } finally {
      setCouponChecking(false);
    }
  }

  // ─── Démarrer session avec compte ────────────────────
  async function handleStart() {
    if (!clientId || !categorieId || !dureeId || !posteId) {
      toast({ title: "Remplir tous les champs", variant: "destructive" });
      return;
    }
    if (!creditSuffisant) {
      toast({ title: "Crédit insuffisant", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post('/gerant/sessions', {
        clientId: Number(clientId),
        categorieId: Number(categorieId),
        dureeId: Number(dureeId),
        posteId: Number(posteId),
      });
      toast({ title: "Session démarrée", description: `${selectedClient?.pseudo} — ${selectedCat?.nom} — ${selectedDuree?.libelle} — ${selectedPoste?.nom}` });
      setLocation("/gerant/dashboard");
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur démarrage session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ─── Démarrer session coupon (sans compte) ───────────
  async function handleStartCoupon() {
    if (!couponCode || !couponCategId || !couponDureeId || !couponPosteId) {
      toast({ title: "Remplir tous les champs", variant: "destructive" });
      return;
    }
    if (!couponSoldeSuffisant) {
      toast({ title: "Solde coupon insuffisant", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      const res = await api.post('/gerant/sessions/coupon', {
        codeCoupon: couponCode.trim().toUpperCase(),
        categorieId: Number(couponCategId),
        dureeId: Number(couponDureeId),
        posteId: Number(couponPosteId),
      });
      toast({
        title: "Session démarrée",
        description: `Coupon ${couponCode} — Solde restant : ${res.data.soldeRestant.toLocaleString()} F`,
      });
      setLocation("/gerant/dashboard");
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur démarrage", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Nouvelle session</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Démarrer une session pour un client</p>
        </div>

        <Tabs defaultValue="compte">
          <TabsList className="w-full">
            <TabsTrigger value="compte" className="flex-1 gap-1.5">
              <User size={14} /> Avec compte
            </TabsTrigger>
            <TabsTrigger value="coupon" className="flex-1 gap-1.5">
              <Ticket size={14} /> Sans compte (coupon)
            </TabsTrigger>
          </TabsList>

          {/* ─── ONGLET AVEC COMPTE ─────────────────────── */}
          <TabsContent value="compte" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">

              {/* Recherche client par pseudo */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm"><User size={13} /> Client</Label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setClientId(""); }}
                    placeholder="Taper le pseudo ou téléphone..."
                    className="pl-9"
                  />
                </div>
                {/* Liste filtrée */}
                {search.trim() && !clientId && (
                  <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {clientsFiltres.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">Aucun client trouvé</div>
                    ) : clientsFiltres.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setClientId(String(c.id)); setSearch(c.pseudo); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{c.pseudo[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{c.pseudo}</div>
                          <div className="text-xs text-muted-foreground">{c.telephone}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Client sélectionné — afficher ses crédits */}
                {selectedClient && (
                  <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="text-xs font-medium text-foreground">{selectedClient.pseudo}</div>
                    {selectedClient.credits?.filter(cr => cr.solde > 0).map(cr => (
                      <span key={cr.id} className="text-xs text-primary mr-2">
                        {cr.categorie.nom}: {formatTemps(cr.solde)}
                      </span>
                    ))}
                    {!selectedClient.credits?.some(cr => cr.solde > 0) && (
                      <span className="text-xs text-muted-foreground">Aucun crédit</span>
                    )}
                  </div>
                )}
              </div>

              {/* Catégorie */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm"><Tag size={13} /> Catégorie</Label>
                <Select value={categorieId} onValueChange={v => { setCategorieId(v); }}>
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Crédit disponible */}
              {clientId && categorieId && (
                <div className={cn("text-xs px-3 py-2 rounded-lg border", creditCategorie && creditCategorie.solde > 0 ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-destructive/10 border-destructive/20 text-destructive")}>
                  Crédit {selectedCat?.nom} : {Math.floor((creditCategorie?.solde ?? 0) / 60)} min disponibles
                </div>
              )}

              {/* Durées */}
              {categorieId && durees.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Clock size={13} /> Durée</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {durees.sort((a, b) => a.secondes - b.secondes).map(d => {
                      const ok = creditCategorie ? creditCategorie.solde >= d.secondes : false;
                      return (
                        <button key={d.id} onClick={() => setDureeId(String(d.id))} disabled={!ok}
                          className={cn("p-3 rounded-xl border text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                            dureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"
                          )}>
                          <div className="font-bold">{d.libelle}</div>
                          <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Choix du poste */}
              {categorieId && dureeId && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Monitor size={13} /> Poste</Label>
                  {postesLibresCat.length === 0 ? (
                    <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle size={14} /> Aucun poste libre dans cette catégorie
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {postesLibresCat.map(p => (
                        <button key={p.id} onClick={() => setPosteId(String(p.id))}
                          className={cn("p-3 rounded-xl border text-sm transition-all",
                            posteId === String(p.id) ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-muted border-border hover:border-primary/30"
                          )}>
                          <Monitor size={16} className="mx-auto mb-1" />
                          <div className="font-bold text-center">{p.nom}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Récapitulatif */}
              {selectedClient && selectedDuree && selectedCat && selectedPoste && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Récapitulatif</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><User size={12} />{selectedClient.pseudo}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Tag size={12} />{selectedCat.nom}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Clock size={12} />{selectedDuree.libelle}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Monitor size={12} />{selectedPoste.nom}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                    <DollarSign size={14} className="text-primary" />
                    <span className="text-primary font-bold text-lg">{selectedDuree.prix.toLocaleString()} F</span>
                  </div>
                </div>
              )}

              <Button className="w-full gap-2 font-semibold"
                disabled={!clientId || !categorieId || !dureeId || !posteId || !creditSuffisant || loading}
                onClick={handleStart}>
                <Play size={16} /> {loading ? "Démarrage..." : "Démarrer la session"}
              </Button>
            </div>
          </TabsContent>

          {/* ─── ONGLET SANS COMPTE (COUPON) ────────────── */}
          <TabsContent value="coupon" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-400 leading-relaxed">
                Le joueur n'a pas de compte. Vendez-lui un coupon et démarrez une session avec le code.
                Le solde restant sera conservé pour d'autres sessions.
              </div>

              {/* Code coupon */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm"><Ticket size={13} /> Code coupon</Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponSolde(null); }}
                    placeholder="XXXX-XXXX"
                    className="font-mono flex-1"
                    onKeyDown={e => e.key === 'Enter' && handleVerifierCoupon()}
                  />
                  <Button variant="outline" onClick={handleVerifierCoupon} disabled={couponChecking || !couponCode.trim()}>
                    {couponChecking ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : "Vérifier"}
                  </Button>
                </div>
              </div>

              {/* Solde coupon */}
              {couponSolde && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                    <CheckCircle2 size={14} /> Coupon valide
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Valeur initiale : <span className="font-semibold text-foreground">{couponSolde.valeurInitiale.toLocaleString()} F</span>
                    {couponSolde.nbSessions > 0 && <span> — {couponSolde.nbSessions} session(s) passée(s)</span>}
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    Solde disponible : {couponSolde.soldeDisponible.toLocaleString()} F
                  </div>
                </div>
              )}

              {/* Catégorie */}
              {couponSolde && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Tag size={13} /> Catégorie</Label>
                  <Select value={couponCategId} onValueChange={setCouponCategId}>
                    <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Durées coupon */}
              {couponSolde && couponCategId && couponDurees.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Clock size={13} /> Durée</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {couponDurees.sort((a, b) => a.secondes - b.secondes).map(d => {
                      const ok = couponSolde.soldeDisponible >= d.prix;
                      return (
                        <button key={d.id} onClick={() => setCouponDureeId(String(d.id))} disabled={!ok}
                          className={cn("p-3 rounded-xl border text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                            couponDureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border hover:border-primary/30"
                          )}>
                          <div className="font-bold">{d.libelle}</div>
                          <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Choix du poste coupon */}
              {couponSolde && couponCategId && couponDureeId && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm"><Monitor size={13} /> Poste</Label>
                  {postesLibresCoupon.length === 0 ? (
                    <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle size={14} /> Aucun poste libre
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {postesLibresCoupon.map(p => (
                        <button key={p.id} onClick={() => setCouponPosteId(String(p.id))}
                          className={cn("p-3 rounded-xl border text-sm transition-all",
                            couponPosteId === String(p.id) ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-muted border-border hover:border-primary/30"
                          )}>
                          <Monitor size={16} className="mx-auto mb-1" />
                          <div className="font-bold text-center">{p.nom}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Récap coupon */}
              {couponSolde && couponDureeSelectionnee && couponPosteId && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Durée</span>
                    <span className="font-semibold text-foreground">{couponDureeSelectionnee.libelle}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Débité</span>
                    <span className="font-semibold text-orange-400">−{couponDureeSelectionnee.prix.toLocaleString()} F</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                    <span className="text-muted-foreground">Solde restant</span>
                    <span className="font-bold text-green-400">{(couponSolde.soldeDisponible - couponDureeSelectionnee.prix).toLocaleString()} F</span>
                  </div>
                </div>
              )}

              <Button className="w-full gap-2 font-semibold"
                disabled={!couponSolde || !couponCategId || !couponDureeId || !couponPosteId || !couponSoldeSuffisant || couponLoading}
                onClick={handleStartCoupon}>
                <Play size={16} /> {couponLoading ? "Démarrage..." : "Démarrer la session"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Historique des sessions du jour */}
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
                        {" · "}{s.duree?.libelle}{" · "}{s.poste?.nom}
                        {s.estBonus && <span className="text-primary">• Bonus</span>}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {s.statut === 'ACTIVE' && tempsRestant > 0 && (
                        <span className="text-xs font-mono font-bold text-green-400">{formatTemps(tempsRestant)}</span>
                      )}
                      <Badge className={cn("text-xs",
                        s.statut === 'ACTIVE' ? "bg-green-500/10 text-green-400" :
                        s.statut === 'ARRETEE' ? "bg-yellow-500/10 text-yellow-400" : "bg-muted text-muted-foreground"
                      )}>
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
