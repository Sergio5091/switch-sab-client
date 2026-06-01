import { useState } from "react";
import { useApp, Utilisateur } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, UserCheck, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Téléphone requis"),
  actif: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function AdminGerants() {
  const { currentUser, utilisateurs, addUtilisateur, updateUtilisateur, deleteUtilisateur } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const gerants = utilisateurs.filter(u => u.role === "gerant" && u.salleId === salleId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Utilisateur | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", prenom: "", email: "", phone: "", actif: true },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nom: "", prenom: "", email: "", phone: "", actif: true });
    setOpen(true);
  }
  function openEdit(u: Utilisateur) {
    setEditing(u);
    form.reset({ nom: u.nom, prenom: u.prenom, email: u.email, phone: u.phone, actif: u.actif });
    setOpen(true);
  }
  function onSubmit(values: FormValues) {
    if (editing) {
      updateUtilisateur(editing.id, values);
      toast({ title: "Gérant mis à jour" });
    } else {
      addUtilisateur({ ...values, salleId, role: "gerant", pseudo: values.email.split("@")[0], password: "admin123" });
      toast({ title: "Gérant créé", description: "Mot de passe : admin123" });
    }
    setOpen(false);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gérants</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{gerants.length} gérant(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-gerant">
            <Plus size={16} /> Nouveau gérant
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {gerants.map(g => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-4" data-testid={`row-gerant-${g.id}`}>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={18} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{g.prenom} {g.nom}</div>
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    <span className="text-xs text-muted-foreground">{g.email}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} />{g.phone}</span>
                  </div>
                </div>
                <Badge className={g.actif ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs" : "bg-muted text-muted-foreground text-xs"}>
                  {g.actif ? "Actif" : "Inactif"}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(g)} data-testid={`button-edit-gerant-${g.id}`}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(g.id)} data-testid={`button-delete-gerant-${g.id}`}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Modifier le gérant" : "Nouveau gérant"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {["prenom", "nom"].map(name => (
                    <FormField key={name} control={form.control} name={name as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{name === "prenom" ? "Prénom" : "Nom"}</FormLabel>
                          <FormControl><Input {...field} value={typeof field.value === "boolean" ? "" : field.value} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  ))}
                </div>
                {["email", "phone"].map(name => (
                  <FormField key={name} control={form.control} name={name as keyof FormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name === "phone" ? "Téléphone" : "Email"}</FormLabel>
                        <FormControl><Input {...field} value={typeof field.value === "boolean" ? "" : field.value} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                ))}
                <FormField control={form.control} name="actif" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Compte actif</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Supprimer ce gérant ?</DialogTitle></DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => { if (deleteId) { deleteUtilisateur(deleteId); toast({ title: "Gérant supprimé" }); } setDeleteId(null); }}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
