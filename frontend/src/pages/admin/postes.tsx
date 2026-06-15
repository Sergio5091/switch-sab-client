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
import { Plus, Pencil, Trash2, Monitor, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import adminService, { Poste, Categorie } from "@/services/adminService";

const schema = z.object({
  nom: z.string().min(1, "Nom requis"),
  categorieId: z.string().min(1, "Catégorie requise"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminPostes() {
  const { currentUser } = useApp();
  const { toast } = useToast();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Poste | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    adminService.getPostes().then(setPostes).catch(() => toast({ title: "Erreur chargement postes", variant: "destructive" }));
    adminService.getCategories().then(setCategories);
  }, []);

  const form = useForm<FormValues>({
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
        const updated = await adminService.updatePoste(editing.id, { nom: values.nom, categorieId: Number(values.categorieId) });
        setPostes(prev => prev.map(p => p.id === editing.id ? updated : p));
        toast({ title: "Poste mis à jour" });
      } else {
        const created = await adminService.createPoste({ nom: values.nom, categorieId: Number(values.categorieId) });
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
                  <span className="text-xs text-muted-foreground">({catPostes.length} poste{catPostes.length !== 1 ? "s" : ""})</span>
                </div>
                {catPostes.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-xl px-5 py-6 text-center text-muted-foreground text-xs">
                    Aucun poste dans cette catégorie
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catPostes.map(p => (
                      <div key={p.id} className="bg-card border border-border rounded-xl p-4" data-testid={`card-poste-${p.id}`}>
                        <div className="flex items-start justify-between mb-3">
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
                            <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`button-edit-poste-${p.id}`}><Pencil size={13} /></Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-poste-${p.id}`}><Trash2 size={13} /></Button>
                          </div>
                        </div>
                        <Badge className={p.statut === "LIBRE" ? "bg-muted text-muted-foreground text-xs" : "bg-green-500/10 text-green-400 border-green-500/20 text-xs"}>
                          {p.statut === "LIBRE" ? "Libre" : "Occupé"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Modifier le poste" : "Nouveau poste"}</DialogTitle></DialogHeader>
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
                      <FormControl><SelectTrigger data-testid="select-categorie"><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-poste">{editing ? "Mettre à jour" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Supprimer ce poste ?</DialogTitle></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
