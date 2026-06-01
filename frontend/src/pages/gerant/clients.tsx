import { useState } from "react";
import { useApp, Client } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, User, Phone, Gift, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  pseudo: z.string().min(2, "Pseudo requis"),
  phone: z.string().min(8, "Téléphone requis"),
  enfant: z.boolean(),
  codeEnfant: z.string().optional(),
  creditMonetaire: z.coerce.number().min(0),
});
type FormValues = z.infer<typeof schema>;

export default function GerantClients() {
  const { currentUser, clients, addClient, updateClient } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const myClients = clients.filter(c => c.salleId === salleId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pseudo: "", phone: "", enfant: false, codeEnfant: "", creditMonetaire: 0 },
  });

  const filtered = myClients.filter(c =>
    c.pseudo.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  function openCreate() {
    setEditing(null);
    form.reset({ pseudo: "", phone: "", enfant: false, codeEnfant: "", creditMonetaire: 0 });
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    form.reset({ pseudo: c.pseudo, phone: c.phone, enfant: c.enfant, codeEnfant: c.codeEnfant ?? "", creditMonetaire: c.creditMonetaire });
    setOpen(true);
  }
  function onSubmit(values: FormValues) {
    if (editing) {
      updateClient(editing.id, values);
      toast({ title: "Client mis à jour" });
    } else {
      addClient({ ...values, bonusTempsDispo: 0, creditPromo: 0, salleId });
      toast({ title: "Client créé" });
    }
    setOpen(false);
  }

  const isEnfant = form.watch("enfant");

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{myClients.length} client(s)</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5" data-testid="button-add-client">
            <Plus size={16} /> Nouveau client
          </Button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo ou téléphone..."
            className="pl-9"
            data-testid="input-search-client"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => openEdit(c)}
                data-testid={`row-client-${c.id}`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-sm text-primary">{c.pseudo[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{c.pseudo}</span>
                    {c.enfant && <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">Enfant</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Phone size={10} /> {c.phone}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-primary font-bold">
                      <DollarSign size={10} /> {c.creditMonetaire.toLocaleString()} F
                    </div>
                    {c.bonusTempsDispo > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-400">
                        <Gift size={9} /> {c.bonusTempsDispo} min bonus
                      </div>
                    )}
                  </div>
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="pseudo" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><User size={11} />Pseudo</FormLabel>
                      <FormControl><Input {...field} data-testid="input-pseudo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Phone size={11} />Téléphone</FormLabel>
                      <FormControl><Input {...field} data-testid="input-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="creditMonetaire" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><DollarSign size={11} />Crédit initial (FCFA)</FormLabel>
                    <FormControl><Input {...field} type="number" min={0} data-testid="input-credit" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="enfant" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mt-0">Compte enfant</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-enfant" /></FormControl>
                  </FormItem>
                )} />
                {isEnfant && (
                  <FormField control={form.control} name="codeEnfant" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code parental</FormLabel>
                      <FormControl><Input {...field} placeholder="Code de contrôle parental" data-testid="input-code-enfant" /></FormControl>
                    </FormItem>
                  )} />
                )}
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-client">{editing ? "Mettre à jour" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
