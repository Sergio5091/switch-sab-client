import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Tag, ChevronRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import adminService, { Categorie } from "@/services/adminService";

const schema = z.object({ nom: z.string().min(1, "Nom requis"), couleur: z.string().min(4, "Couleur requise") });
type FormValues = z.infer<typeof schema>;

const COLOR_OPTIONS = [
  { label: "PS4 Blue", value: "#3B82F6" },
  { label: "PS5 Orange", value: "#F97316" },
  { label: "PC Green", value: "#22C55E" },
  { label: "XBOX Purple", value: "#A855F7" },
  { label: "Red", value: "#EF4444" },
  { label: "Yellow", value: "#EAB308" },
];

export default function AdminCategories() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [promptTarifsId, setPromptTarifsId] = useState<number | null>(null);

  useEffect(() => {
    adminService.getCategories().then(setCategories).catch(() => toast({ title: "Erreur chargement catégories", variant: "destructive" }));
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", couleur: "#3B82F6" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nom: "", couleur: "#3B82F6" });
    setOpen(true);
  }
  function openEdit(c: Categorie) {
    setEditing(c);
    form.reset({ nom: c.nom, couleur: (c as any).couleur ?? "#3B82F6" });
    setOpen(true);
  }
  async function onSubmit(values: FormValues) {
    try {
      if (editing) {
        const updated = await adminService.updateCategorie(editing.id, { nom: values.nom });
        setCategories(prev => prev.map(c => c.id === editing.id ? { ...updated, couleur: values.couleur } : c));
        toast({ title: "Catégorie mise à jour" });
      } else {
        const created = await adminService.createCategorie({ nom: values.nom });
        setCategories(prev => [...prev, { ...created, couleur: values.couleur }]);
        toast({ title: "Catégorie créée" });
        setOpen(false);
        // Proposer d'ajouter les tarifs immédiatement
        setPromptTarifsId(created.id);
        return;
      }
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }
  async function handleDelete(id: number) {
    try {
      await adminService.deleteCategorie(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast({ title: "Catégorie supprimée" });
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
            <h1 className="text-xl font-bold text-foreground">Catégories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{categories.length} catégorie(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-categorie">
            <Plus size={16} /> Nouvelle catégorie
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-4" data-testid={`row-categorie-${cat.id}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: ((cat as any).couleur ?? "#3B82F6") + "20", borderColor: ((cat as any).couleur ?? "#3B82F6") + "40" }}>
                  <Tag size={18} style={{ color: (cat as any).couleur ?? "#3B82F6" }} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground text-sm">{cat.nom}</div>
                </div>
                <div className="flex gap-1 items-center">
                  <Link href={`/admin/categories/${cat.id}/durees`}>
                    <a className="flex items-center gap-1 text-xs text-primary hover:underline ml-1" data-testid={`link-durees-${cat.id}`}>
                      Tarifs <ChevronRight size={12} />
                    </a>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(cat)} data-testid={`button-edit-cat-${cat.id}`}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)} data-testid={`button-delete-cat-${cat.id}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle catégorie"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom (ex: PS4, XBOX, PC)</FormLabel>
                    <FormControl><Input {...field} data-testid="input-nom-cat" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="couleur" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" onClick={() => field.onChange(opt.value)}
                          className="w-8 h-8 rounded-lg border-2 transition-all"
                          style={{ backgroundColor: opt.value, borderColor: field.value === opt.value ? "white" : "transparent" }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-cat">{editing ? "Mettre à jour" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Supprimer cette catégorie ?</DialogTitle></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog prompt tarifs après création */}
        <Dialog open={!!promptTarifsId} onOpenChange={() => setPromptTarifsId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={18} className="text-yellow-400" />
                <DialogTitle>Ajouter les tarifs</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              La catégorie a été créée. Pour que les gérants puissent l'utiliser, vous devez ajouter au moins un tarif (durée + prix).
            </p>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="ghost" onClick={() => setPromptTarifsId(null)}>Plus tard</Button>
              <Button onClick={() => { navigate(`/admin/categories/${promptTarifsId}/durees`); setPromptTarifsId(null); }}>
                Ajouter les tarifs <ChevronRight size={14} />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
