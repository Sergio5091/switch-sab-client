import { useState } from "react";
import { useApp, Poste } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Monitor, Wifi, Usb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  numero: z.coerce.number().min(1),
  categorieId: z.string().min(1, "Catégorie requise"),
  typeSwitch: z.enum(["USB", "WIFI"]),
  actif: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function AdminPostes() {
  const { currentUser, postes, addPoste, updatePoste, deletePoste, categories, sessions } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const myPostes = postes.filter(p => p.salleId === salleId);
  const myCategories = categories.filter(c => c.salleId === salleId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Poste | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { numero: 1, categorieId: "", typeSwitch: "WIFI", actif: true },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ numero: myPostes.length + 1, categorieId: "", typeSwitch: "WIFI", actif: true });
    setOpen(true);
  }
  function openEdit(p: Poste) {
    setEditing(p);
    form.reset({ numero: p.numero, categorieId: String(p.categorieId), typeSwitch: p.typeSwitch, actif: p.actif });
    setOpen(true);
  }
  function onSubmit(values: FormValues) {
    const data = { ...values, categorieId: Number(values.categorieId), salleId };
    if (editing) { updatePoste(editing.id, data); toast({ title: "Poste mis à jour" }); }
    else { addPoste(data); toast({ title: "Poste créé" }); }
    setOpen(false);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Postes TV</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{myPostes.length} poste(s) configuré(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-poste">
            <Plus size={16} /> Nouveau poste
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myPostes.sort((a, b) => a.numero - b.numero).map(p => {
            const cat = myCategories.find(c => c.id === p.categorieId);
            const activeSession = sessions.find(s => s.posteId === p.id && s.actif);
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4" data-testid={`card-poste-${p.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Monitor size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground">Poste {p.numero}</div>
                      <div className="text-xs" style={{ color: cat?.couleur ?? "#94A3B8" }}>{cat?.nom ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} data-testid={`button-edit-poste-${p.id}`}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-poste-${p.id}`}><Trash2 size={13} /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-muted text-muted-foreground border-border text-xs gap-1">
                    {p.typeSwitch === "WIFI" ? <Wifi size={10} /> : <Usb size={10} />} {p.typeSwitch}
                  </Badge>
                  <Badge className={activeSession ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs" : p.actif ? "bg-muted text-muted-foreground text-xs" : "bg-destructive/10 text-destructive border-destructive/20 text-xs"}>
                    {activeSession ? "En session" : p.actif ? "Libre" : "Inactif"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Modifier le poste" : "Nouveau poste"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de poste</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-numero" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="categorieId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-categorie"><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {myCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="typeSwitch" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de switch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-type-switch"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="WIFI">WIFI</SelectItem>
                        <SelectItem value="USB">USB</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="actif" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Poste actif</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-actif" /></FormControl>
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
              <Button variant="destructive" onClick={() => { if (deleteId) { deletePoste(deleteId); toast({ title: "Poste supprimé" }); } setDeleteId(null); }}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
