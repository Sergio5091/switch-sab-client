import { useState } from "react";
import { useApp, Categorie } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Tag, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  const { currentUser, categories, addCategorie, updateCategorie, deleteCategorie, dureesPrix, postes } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const myCategories = categories.filter(c => c.salleId === salleId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    form.reset({ nom: c.nom, couleur: c.couleur });
    setOpen(true);
  }
  function onSubmit(values: FormValues) {
    if (editing) { updateCategorie(editing.id, values); toast({ title: "Catégorie mise à jour" }); }
    else { addCategorie({ ...values, salleId }); toast({ title: "Catégorie créée" }); }
    setOpen(false);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Catégories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{myCategories.length} catégorie(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-categorie">
            <Plus size={16} /> Nouvelle catégorie
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {myCategories.map(cat => {
              const catDurees = dureesPrix.filter(d => d.categorieId === cat.id);
              const catPostes = postes.filter(p => p.categorieId === cat.id);
              return (
                <div key={cat.id} className="flex items-center gap-4 px-5 py-4" data-testid={`row-categorie-${cat.id}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: cat.couleur + "20", borderColor: cat.couleur + "40" }}>
                    <Tag size={18} style={{ color: cat.couleur }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground text-sm">{cat.nom}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{catPostes.length} postes · {catDurees.length} tarifs</div>
                  </div>
                  <div className="flex gap-1 items-center">
                    {catDurees.slice(0, 2).map(d => (
                      <span key={d.id} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{d.duree} = {d.prix}F</span>
                    ))}
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
              );
            })}
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
                          data-testid={`color-${opt.label.toLowerCase().replace(" ", "-")}`}
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
              <Button variant="destructive" onClick={() => { if (deleteId) { deleteCategorie(deleteId); toast({ title: "Catégorie supprimée" }); } setDeleteId(null); }}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
