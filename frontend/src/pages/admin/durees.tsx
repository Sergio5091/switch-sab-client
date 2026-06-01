import { useState } from "react";
import { useApp, DureePrix } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";

const schema = z.object({
  duree: z.string().min(1, "Durée requise"),
  dureeMinutes: z.coerce.number().min(1, "Minutes requises"),
  prix: z.coerce.number().min(1, "Prix requis"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminDurees() {
  const params = useParams<{ id: string }>();
  const catId = Number(params.id);
  const { categories, dureesPrix, addDureePrix, updateDureePrix, deleteDureePrix } = useApp();
  const { toast } = useToast();
  const cat = categories.find(c => c.id === catId);
  const myDurees = dureesPrix.filter(d => d.categorieId === catId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DureePrix | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { duree: "", dureeMinutes: 60, prix: 500 },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ duree: "", dureeMinutes: 60, prix: 500 });
    setOpen(true);
  }
  function openEdit(d: DureePrix) {
    setEditing(d);
    form.reset({ duree: d.duree, dureeMinutes: d.dureeMinutes, prix: d.prix });
    setOpen(true);
  }
  function onSubmit(values: FormValues) {
    if (editing) { updateDureePrix(editing.id, values); toast({ title: "Tarif mis à jour" }); }
    else { addDureePrix({ ...values, categorieId: catId }); toast({ title: "Tarif ajouté" }); }
    setOpen(false);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/categories">
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </a>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Tarifs — {cat?.nom ?? "Catégorie"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{myDurees.length} tarif(s) définis</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5 ml-auto" data-testid="button-add-duree">
            <Plus size={16} /> Nouveau tarif
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {myDurees.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">Aucun tarif. Créez-en un.</div>
          ) : (
            <div className="divide-y divide-border">
              {myDurees.sort((a, b) => a.dureeMinutes - b.dureeMinutes).map(d => (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4" data-testid={`row-duree-${d.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground text-sm">{d.duree}</div>
                    <div className="text-xs text-muted-foreground">{d.dureeMinutes} minutes</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{d.prix.toLocaleString()} F</div>
                    <div className="text-xs text-muted-foreground">{Math.round(d.prix / d.dureeMinutes * 60)} F/h</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(d)} data-testid={`button-edit-duree-${d.id}`}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)} data-testid={`button-delete-duree-${d.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="duree" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé (ex: 1H, 30 min, 2H)</FormLabel>
                    <FormControl><Input {...field} placeholder="1H" data-testid="input-duree" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dureeMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée en minutes</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-duree-minutes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="prix" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (FCFA)</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-prix" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-duree">{editing ? "Mettre à jour" : "Ajouter"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Supprimer ce tarif ?</DialogTitle></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => { if (deleteId) { deleteDureePrix(deleteId); toast({ title: "Tarif supprimé" }); } setDeleteId(null); }}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
