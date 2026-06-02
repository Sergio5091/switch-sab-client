import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, User, Phone, Gift, Clock, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import gerantService, { Client } from "@/services/gerantService";

const schemaCreate = z.object({
  pseudo: z.string().min(2, "Pseudo requis"),
  motDePasse: z.string().min(6, "Mot de passe requis (min 6 caractères)"),
  telephone: z.string().optional(),
  estEnfant: z.boolean(),
  codeParental: z.string().optional(),
});
const schemaEdit = z.object({
  pseudo: z.string().min(2, "Pseudo requis"),
  telephone: z.string().optional(),
  nom: z.string().optional(),
  prenom: z.string().optional(),
  estEnfant: z.boolean(),
  codeParental: z.string().optional(),
  active: z.boolean(),
});
type CreateValues = z.infer<typeof schemaCreate>;
type EditValues = z.infer<typeof schemaEdit>;

export default function GerantClients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  useEffect(() => {
    gerantService.getClients().then(setClients).catch(() => toast({ title: "Erreur chargement clients", variant: "destructive" }));
  }, []);

  const formCreate = useForm<CreateValues>({
    resolver: zodResolver(schemaCreate),
    defaultValues: { pseudo: "", motDePasse: "", telephone: "", estEnfant: false, codeParental: "" },
  });
  const formEdit = useForm<EditValues>({
    resolver: zodResolver(schemaEdit),
    defaultValues: { pseudo: "", telephone: "", nom: "", prenom: "", estEnfant: false, codeParental: "", active: true },
  });

  const filtered = clients.filter(c =>
    c.pseudo.toLowerCase().includes(search.toLowerCase()) ||
    c.telephone?.includes(search)
  );

  function openCreate() {
    setEditing(null);
    formCreate.reset({ pseudo: "", motDePasse: "", telephone: "", estEnfant: false, codeParental: "" });
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    formEdit.reset({ pseudo: c.pseudo, telephone: c.telephone ?? "", nom: c.nom ?? "", prenom: c.prenom ?? "", estEnfant: c.estEnfant, codeParental: c.codeParental ?? "", active: c.active });
    setOpen(true);
  }

  async function onSubmitCreate(values: CreateValues) {
    try {
      await gerantService.createClient({
        pseudo: values.pseudo,
        motDePasse: values.motDePasse,
        telephone: values.telephone || undefined,
        estEnfant: values.estEnfant,
        codeParental: values.codeParental || undefined,
      });
      toast({ title: "Client créé", description: `Pseudo : ${values.pseudo} — Mot de passe : ${values.motDePasse}` });
      gerantService.getClients().then(setClients);
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  async function onSubmitEdit(values: EditValues) {
    if (!editing) return;
    try {
      const updated = await gerantService.updateClient(editing.id, values);
      setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...updated } : c));
      toast({ title: "Client mis à jour" });
      setOpen(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  const isEnfantCreate = formCreate.watch("estEnfant");
  const isEnfantEdit = formEdit.watch("estEnfant");

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clients.length} client(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-client">
            <Plus size={16} /> Nouveau client
          </Button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par pseudo ou téléphone..." className="pl-9" data-testid="input-search-client" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openEdit(c)} data-testid={`row-client-${c.id}`}>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-sm text-primary">{c.pseudo[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{c.pseudo}</span>
                    {c.estEnfant && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">Enfant</Badge>}
                    {!c.active && <Badge className="bg-muted text-muted-foreground text-xs">Inactif</Badge>}
                  </div>
                  {c.telephone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone size={10} /> {c.telephone}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                  {c.credits?.filter(cr => cr.solde > 0).map(cr => (
                    <div key={cr.id} className="text-right">
                      <div className="font-medium text-foreground">{cr.categorie.nom}</div>
                      <div className="flex items-center gap-1 text-primary"><Clock size={9} /> {Math.floor(cr.solde / 60)}min</div>
                    </div>
                  ))}
                  {c.bonus?.disponible && (
                    <div className="flex items-center gap-1 text-orange-400"><Gift size={10} /> {Math.floor(c.bonus.solde / 60)}min bonus</div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-muted-foreground text-sm">
                {search ? "Aucun client trouvé" : "Aucun client enregistré"}
              </div>
            )}
          </div>
        </div>

        {/* Dialog Création */}
        <Dialog open={open && !editing} onOpenChange={v => { if (!v) setOpen(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
            <Form {...formCreate}>
              <form onSubmit={formCreate.handleSubmit(onSubmitCreate)} className="space-y-3">
                <FormField control={formCreate.control} name="pseudo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><User size={11} />Pseudo</FormLabel>
                    <FormControl><Input {...field} placeholder="pseudo unique" data-testid="input-pseudo" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formCreate.control} name="motDePasse" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Lock size={11} />Mot de passe</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="min 6 caractères" data-testid="input-mdp" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={formCreate.control} name="telephone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Phone size={11} />WhatsApp</FormLabel>
                    <FormControl><Input {...field} placeholder="+229 07XXXXXXXX" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={formCreate.control} name="estEnfant" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Compte enfant</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                {isEnfantCreate && (
                  <FormField control={formCreate.control} name="codeParental" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code parental</FormLabel>
                      <FormControl><Input {...field} placeholder="Code de contrôle parental" /></FormControl>
                    </FormItem>
                  )} />
                )}
                <DialogFooter><Button type="submit">Créer</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Dialog Édition */}
        <Dialog open={open && !!editing} onOpenChange={v => { if (!v) setOpen(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Modifier le client</DialogTitle></DialogHeader>
            <Form {...formEdit}>
              <form onSubmit={formEdit.handleSubmit(onSubmitEdit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={formEdit.control} name="pseudo" render={({ field }) => (
                    <FormItem><FormLabel>Pseudo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={formEdit.control} name="telephone" render={({ field }) => (
                    <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={formEdit.control} name="prenom" render={({ field }) => (
                    <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={formEdit.control} name="nom" render={({ field }) => (
                    <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={formEdit.control} name="estEnfant" render={({ field }) => (
                  <FormItem className="flex items-center gap-3"><FormLabel className="mt-0">Compte enfant</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                {isEnfantEdit && (
                  <FormField control={formEdit.control} name="codeParental" render={({ field }) => (
                    <FormItem><FormLabel>Code parental</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                )}
                <FormField control={formEdit.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-3"><FormLabel className="mt-0">Compte actif</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <DialogFooter><Button type="submit">Mettre à jour</Button></DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
