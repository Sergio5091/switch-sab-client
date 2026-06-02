import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, UserCheck, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import adminService, { Gerant } from "@/services/adminService";

const schemaCreate = z.object({
  pseudo: z.string().min(2, "Pseudo requis"),
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().min(8, "Téléphone requis"),
  motDePasse: z.string().min(6, "Mot de passe requis (min 6 caractères)"),
  telUrgence: z.string().optional(),
});
const schemaEdit = z.object({
  pseudo: z.string().min(2, "Pseudo requis"),
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().min(8, "Téléphone requis"),
  telUrgence: z.string().optional(),
  active: z.boolean(),
});
type CreateValues = z.infer<typeof schemaCreate>;
type EditValues = z.infer<typeof schemaEdit>;

export default function AdminGerants() {
  const { toast } = useToast();
  const [gerants, setGerants] = useState<Gerant[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gerant | null>(null);

  useEffect(() => {
    adminService.getGerants().then(setGerants).catch(() => toast({ title: "Erreur chargement gérants", variant: "destructive" }));
  }, []);

  const formCreate = useForm<CreateValues>({
    resolver: zodResolver(schemaCreate),
    defaultValues: { pseudo: "", nom: "", prenom: "", email: "", telephone: "", motDePasse: "admin123", telUrgence: "" },
  });
  const formEdit = useForm<EditValues>({
    resolver: zodResolver(schemaEdit),
    defaultValues: { pseudo: "", nom: "", prenom: "", email: "", telephone: "", telUrgence: "", active: true },
  });

  function openCreate() {
    setEditing(null);
    formCreate.reset({ pseudo: "", nom: "", prenom: "", email: "", telephone: "", motDePasse: "admin123", telUrgence: "" });
    setOpen(true);
  }
  function openEdit(g: Gerant) {
    setEditing(g);
    formEdit.reset({ pseudo: g.pseudo, nom: g.nom ?? "", prenom: g.prenom ?? "", email: g.email ?? "", telephone: g.telephone, telUrgence: g.telUrgence ?? "", active: g.active });
    setOpen(true);
  }

  async function onSubmitCreate(values: CreateValues) {
    try {
      const created = await adminService.createGerant({
        pseudo: values.pseudo,
        telephone: values.telephone,
        motDePasse: values.motDePasse,
        nom: values.nom,
        prenom: values.prenom,
        email: values.email || undefined,
        telUrgence: values.telUrgence || undefined,
      });
      setGerants(prev => [created, ...prev]);
      toast({ title: "Gérant créé", description: `Mot de passe : ${values.motDePasse}` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  async function onSubmitEdit(values: EditValues) {
    if (!editing) return;
    try {
      const updated = await adminService.updateGerant(editing.id, {
        pseudo: values.pseudo,
        nom: values.nom,
        prenom: values.prenom,
        email: values.email || undefined,
        telephone: values.telephone,
        telUrgence: values.telUrgence || undefined,
        active: values.active,
      });
      setGerants(prev => prev.map(g => g.id === editing.id ? updated : g));
      toast({ title: "Gérant mis à jour" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
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
                    <span className="text-xs text-muted-foreground">{g.pseudo}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={10} />{g.telephone}</span>
                  </div>
                </div>
                <Badge className={g.active ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs" : "bg-muted text-muted-foreground text-xs"}>
                  {g.active ? "Actif" : "Inactif"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(g)} data-testid={`button-edit-gerant-${g.id}`}><Pencil size={14} /></Button>
              </div>
            ))}
          </div>
        </div>

        {/* Dialog Création */}
        <Dialog open={open && !editing} onOpenChange={v => { if (!v) setOpen(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouveau gérant</DialogTitle></DialogHeader>
            <Form {...formCreate}>
              <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(["prenom", "nom"] as const).map(name => (
                    <FormField key={name} control={formCreate.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name === "prenom" ? "Prénom" : "Nom"}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
                <FormField control={formCreate.control} name="pseudo" render={({ field }) => (
                  <FormItem><FormLabel>Pseudo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formCreate.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formCreate.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email (optionnel)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formCreate.control} name="motDePasse" render={({ field }) => (
                  <FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input {...field} type="password" /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">Créer</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Dialog Édition */}
        <Dialog open={open && !!editing} onOpenChange={v => { if (!v) setOpen(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Modifier le gérant</DialogTitle></DialogHeader>
            <Form {...formEdit}>
              <form onSubmit={formEdit.handleSubmit(onSubmitEdit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(["prenom", "nom"] as const).map(name => (
                    <FormField key={name} control={formEdit.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name === "prenom" ? "Prénom" : "Nom"}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
                <FormField control={formEdit.control} name="pseudo" render={({ field }) => (
                  <FormItem><FormLabel>Pseudo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formEdit.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formEdit.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email (optionnel)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formEdit.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Compte actif</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit">Mettre à jour</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
