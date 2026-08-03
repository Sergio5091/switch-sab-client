import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Monitor, Tag, Wifi, WifiOff, Loader2, X, MapPin, Lock, Unlock, Usb, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import adminService, { Poste, Categorie } from "@/services/adminService";

const schema = z.object({
  nom: z.string().min(1, "Nom requis"),
  categorieId: z.string().min(1, "Catégorie requise"),
});
type FormValues = z.infer<typeof schema>;

// ─── État d'appairage d'un poste ──────────────────────────────────────────────
type PairingState =
  | { status: 'idle' }
  | { status: 'waiting' }   // appairage en cours — attend la prise
  | { status: 'success'; zigbeeName: string }
  | { status: 'error'; message: string };

export default function AdminPostes() {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Poste | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Map posteId → état d'appairage
  const [pairingStates, setPairingStates] = useState<Record<number, PairingState>>({});
  const [switchType, setSwitchType] = useState<string>('MOCK');
  // Map posteId → état child_lock (null = pas encore chargé, true = LOCK, false = UNLOCK)
  const [lockStates, setLockStates] = useState<Record<number, boolean | null>>({});

  // ── USB ──────────────────────────────────────────────────────────────────
  // Map posteId → valeur du champ "numéro de relais" en cours d'édition
  const [usbRelaisEditing, setUsbRelaisEditing] = useState<Record<number, string>>({});
  // Map posteId → true si sauvegarde en cours
  const [usbSaving, setUsbSaving] = useState<Record<number, boolean>>({});
  // Map posteId → true si test en cours
  const [usbTesting, setUsbTesting] = useState<Record<number, boolean>>({});
  // Nb de relais du modèle installé (pour validation)
  const [usbNbRelais, setUsbNbRelais] = useState<number | null>(null);

  useEffect(() => {
    adminService.getPostes().then((data) => {
      setPostes(data);
      // Charger l'état child_lock pour chaque poste appairé (switchType ZIGBEE)
      data.forEach((p) => {
        if (p.zigbeeName) {
          adminService.statutPrise(p.id)
            .then((s) => setLockStates(prev => ({ ...prev, [p.id]: s.childLock })))
            .catch(() => setLockStates(prev => ({ ...prev, [p.id]: null })));
        }
      });
    }).catch(() =>
      toast({ title: "Erreur chargement postes", variant: "destructive" })
    );
    adminService.getCategories().then(setCategories);
    adminService.getSalle().then(s => {
      setSwitchType(s.switchType);
      setUsbNbRelais(s.usbNbRelais ?? null);
    }).catch(() => {});
  }, []);  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", categorieId: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nom: `Poste ${postes.length + 1}`, categorieId: "" });
    setOpen(true);
  }

  function openEdit(p: Poste) {
    setEditing(p);
    form.reset({ nom: p.nom, categorieId: String(p.categorieId) });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editing) {
        const updated = await adminService.updatePoste(editing.id, {
          nom: values.nom,
          categorieId: Number(values.categorieId),
        });
        setPostes(prev => prev.map(p => p.id === editing.id ? updated : p));
        toast({ title: "Poste mis à jour" });
      } else {
        const created = await adminService.createPoste({
          nom: values.nom,
          categorieId: Number(values.categorieId),
        });
        setPostes(prev => [...prev, created]);
        toast({ title: "Poste créé" });
      }
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await adminService.deletePoste(id);
      setPostes(prev => prev.filter(p => p.id !== id));
      toast({ title: "Poste supprimé" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur suppression", variant: "destructive" });
    }
    setDeleteId(null);
  }

  // ─── Lancer l'appairage d'une prise ────────────────────────────────────────
  async function handleAppairer(poste: Poste) {
    setPairingStates(prev => ({ ...prev, [poste.id]: { status: 'waiting' } }));

    try {
      const result = await adminService.appairerPrise(poste.id);
      // Met à jour le poste localement avec le zigbeeName reçu
      setPostes(prev => prev.map(p =>
        p.id === poste.id ? { ...p, zigbeeName: result.zigbeeName } : p
      ));
      setPairingStates(prev => ({
        ...prev,
        [poste.id]: { status: 'success', zigbeeName: result.zigbeeName }
      }));
      toast({ title: `✅ Prise liée à "${poste.nom}"` });
    } catch (err: any) {
      const message = err.response?.data?.message ?? err.message ?? "Erreur d'appairage";
      setPairingStates(prev => ({ ...prev, [poste.id]: { status: 'error', message } }));
      toast({ title: message, variant: "destructive" });
    }
  }

  // ─── Délier la prise d'un poste ────────────────────────────────────────────
  async function handleDesappairer(poste: Poste) {
    try {
      await adminService.desappairerPrise(poste.id);
      setPostes(prev => prev.map(p =>
        p.id === poste.id ? { ...p, zigbeeName: null } : p
      ));
      setPairingStates(prev => ({ ...prev, [poste.id]: { status: 'idle' } }));
      toast({ title: `Prise déliée de "${poste.nom}"` });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  // ─── USB : sauvegarder le numéro de relais ──────────────────────────────────
  async function handleUsbSaveRelais(poste: Poste) {
    const valStr = usbRelaisEditing[poste.id];
    const numero = (valStr === '' || valStr === undefined) ? null : Number(valStr);

    if (numero !== null && (isNaN(numero) || numero < 1 || numero > 32)) {
      toast({ title: "Numéro de relais invalide (1–32)", variant: "destructive" });
      return;
    }
    if (numero !== null && usbNbRelais && numero > usbNbRelais) {
      toast({ title: `Ce modèle ne possède que ${usbNbRelais} relais`, variant: "destructive" });
      return;
    }

    setUsbSaving(prev => ({ ...prev, [poste.id]: true }));
    try {
      await adminService.usbAssocierRelais(poste.id, numero);
      setPostes(prev => prev.map(p =>
        p.id === poste.id ? { ...p, usbRelaisNumero: numero } : p
      ));
      // Nettoyer la valeur d'édition locale
      setUsbRelaisEditing(prev => {
        const next = { ...prev };
        delete next[poste.id];
        return next;
      });
      toast({ title: numero ? `Relais ${numero} associé à "${poste.nom}"` : `Relais dissocié de "${poste.nom}"` });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setUsbSaving(prev => ({ ...prev, [poste.id]: false }));
    }
  }

  // ─── USB : tester l'impulsion d'un relais ───────────────────────────────────
  async function handleUsbTester(poste: Poste) {
    const relais = poste.usbRelaisNumero;
    if (!relais) {
      toast({ title: "Assignez d'abord un numéro de relais", variant: "destructive" });
      return;
    }
    setUsbTesting(prev => ({ ...prev, [poste.id]: true }));
    try {
      await adminService.usbTester(relais);
      toast({ title: `⚡ Relais ${relais} testé — impulsion 2s envoyée` });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur test relais", variant: "destructive" });
    } finally {
      setUsbTesting(prev => ({ ...prev, [poste.id]: false }));
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Postes TV</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{postes.length} poste(s) configuré(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-poste">
            <Plus size={16} /> Nouveau poste
          </Button>
        </div>

        <div className="space-y-6">
          {categories.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
              Aucune catégorie. Créez d'abord une catégorie.
            </div>
          ) : categories.map(cat => {
            const catPostes = postes.filter(p => p.categorieId === cat.id);
            return (
              <div key={cat.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">{cat.nom}</h2>
                  <span className="text-xs text-muted-foreground">
                    ({catPostes.length} poste{catPostes.length !== 1 ? "s" : ""})
                  </span>
                </div>

                {catPostes.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-xl px-5 py-6 text-center text-muted-foreground text-xs">
                    Aucun poste dans cette catégorie
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catPostes.map(p => {
                      const pairing = pairingStates[p.id] ?? { status: 'idle' };
                      const estLie = !!p.zigbeeName;

                      return (
                        <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid={`card-poste-${p.id}`}>

                          {/* En-tête du poste */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Monitor size={18} className="text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-bold text-foreground">{p.nom}</div>
                                <div className="text-xs text-muted-foreground">{cat.nom}</div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`button-edit-poste-${p.id}`}>
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(p.id)}
                                data-testid={`button-delete-poste-${p.id}`}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>

                          {/* Statut occupé/libre */}
                          <Badge className={p.statut === "LIBRE"
                            ? "bg-muted text-muted-foreground text-xs"
                            : "bg-green-500/10 text-green-400 border-green-500/20 text-xs"
                          }>
                            {p.statut === "LIBRE" ? "Libre" : "Occupé"}
                          </Badge>

                          {/* ── Zone Zigbee ─────────────────────────────── */}
                          {switchType === 'ZIGBEE' && <div className="border-t border-border pt-3">

                            {/* Prise déjà liée */}
                            {estLie && pairing.status !== 'waiting' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-green-500 text-xs">
                                    <Wifi size={13} />
                                    <span className="font-mono">{p.zigbeeName}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-muted-foreground h-6 px-1.5 text-xs cursor-default opacity-50"
                                      title="Ce modèle de prise ne supporte pas l'identification par clignotement"
                                      onClick={() => toast({ title: "Non supporté par ce modèle de prise" })}
                                    >
                                      <MapPin size={11} className="mr-1" /> Localiser
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-destructive h-6 px-1.5 text-xs"
                                      onClick={() => handleDesappairer(p)}
                                    >
                                      <X size={11} className="mr-1" /> Délier
                                    </Button>
                                  </div>
                                </div>
                                {/* Contrôle manuel du bouton physique — 1 bouton toggle */}
                                <div className="mt-1">
                                  {lockStates[p.id] === null || lockStates[p.id] === undefined ? (
                                    <Button variant="outline" size="sm" className="w-full text-xs h-7" disabled>
                                      <Loader2 size={11} className="mr-1 animate-spin" /> Chargement…
                                    </Button>
                                  ) : lockStates[p.id] ? (
                                    // État actuel : LOCK → bouton pour déverrouiller
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-1 text-xs h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                      title="Déverrouille le bouton physique — la prise répond à nouveau aux appuis manuels"
                                      onClick={async () => {
                                        try {
                                          await adminService.deverrouillerPrise(p.id)
                                          setLockStates(prev => ({ ...prev, [p.id]: false }))
                                          toast({ title: `🔓 Bouton déverrouillé — "${p.zigbeeName}"` })
                                        } catch (err: any) {
                                          toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" })
                                        }
                                      }}
                                    >
                                      <Unlock size={11} /> Déverrouiller bouton
                                    </Button>
                                  ) : (
                                    // État actuel : UNLOCK → bouton pour verrouiller
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-1 text-xs h-7 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                      title="Verrouille le bouton physique — plus aucun appui manuel possible"
                                      onClick={async () => {
                                        try {
                                          await adminService.verrouillerPrise(p.id)
                                          setLockStates(prev => ({ ...prev, [p.id]: true }))
                                          toast({ title: `🔒 Bouton verrouillé — "${p.zigbeeName}"` })
                                        } catch (err: any) {
                                          toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" })
                                        }
                                      }}
                                    >
                                      <Lock size={11} /> Verrouiller bouton
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Prise non liée — bouton appairer */}
                            {!estLie && pairing.status === 'idle' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-1.5 text-xs"
                                onClick={() => handleAppairer(p)}
                              >
                                <WifiOff size={13} />
                                Appairer une prise
                              </Button>
                            )}

                            {/* Appairage en cours */}
                            {pairing.status === 'waiting' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-amber-500">
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>En attente de la prise... (120s)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Maintenez le bouton de la prise <strong>5 secondes</strong> jusqu'au clignotement bleu.
                                </p>
                              </div>
                            )}

                            {/* Succès */}
                            {pairing.status === 'success' && (
                              <div className="text-xs text-green-500 flex items-center gap-1.5">
                                <Wifi size={13} />
                                Liée — <span className="font-mono">{pairing.zigbeeName}</span>
                              </div>
                            )}

                            {/* Erreur */}
                            {pairing.status === 'error' && (
                              <div className="space-y-1.5">
                                <p className="text-xs text-destructive">{pairing.message}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-1.5 text-xs"
                                  onClick={() => handleAppairer(p)}
                                >
                                  <WifiOff size={13} /> Réessayer
                                </Button>
                              </div>
                            )}
                          </div>}

                          {/* ── Zone USB ────────────────────────────────── */}
                          {switchType === 'USB' && (
                            <div className="border-t border-border pt-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                                <Usb size={12} />
                                <span>Relais USB</span>
                                {p.usbRelaisNumero && (
                                  <span className="ml-auto font-mono text-foreground">Port {p.usbRelaisNumero}</span>
                                )}
                              </div>

                              {/* Select port + bouton sauvegarder */}
                              <div className="flex gap-1.5">
                                <Select
                                  value={
                                    usbRelaisEditing[p.id] !== undefined
                                      ? usbRelaisEditing[p.id]
                                      : (p.usbRelaisNumero ? String(p.usbRelaisNumero) : '')
                                  }
                                  onValueChange={val =>
                                    setUsbRelaisEditing(prev => ({ ...prev, [p.id]: val }))
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue placeholder="Choisir un port…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from(
                                      { length: usbNbRelais ?? 32 },
                                      (_, i) => i + 1
                                    ).map(n => (
                                      <SelectItem key={n} value={String(n)} className="text-xs font-mono">
                                        Port {n}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={usbSaving[p.id] || usbRelaisEditing[p.id] === undefined}
                                  onClick={() => handleUsbSaveRelais(p)}
                                >
                                  {usbSaving[p.id]
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : 'OK'}
                                </Button>
                              </div>

                              {/* Bouton tester — seulement si un port est assigné */}
                              {p.usbRelaisNumero && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full gap-1.5 text-xs h-7 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                  disabled={!!usbTesting[p.id]}
                                  onClick={() => handleUsbTester(p)}
                                  title="Envoie une impulsion ON/OFF de 2s pour vérifier la correspondance physique"
                                >
                                  {usbTesting[p.id]
                                    ? <><Loader2 size={11} className="animate-spin" /> Test en cours…</>
                                    : <><Zap size={11} /> Tester port {p.usbRelaisNumero}</>
                                  }
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Dialog création / édition ─────────────────────────────────── */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le poste" : "Nouveau poste"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du poste</FormLabel>
                    <FormControl><Input {...field} data-testid="input-nom" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="categorieId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-categorie">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-poste">
                    {editing ? "Mettre à jour" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* ── Dialog confirmation suppression ───────────────────────────── */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Supprimer ce poste ?</DialogTitle></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
