import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Megaphone, CheckCircle2, Users, UserPlus,
  Download, Copy, Check, PhoneCall
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import adminService, { Promotion } from "@/services/adminService";

const schema = z.object({ titre: z.string().min(10, "Message trop court (min 10 caractères)") });
type FormValues = z.infer<typeof schema>;

interface StatutContacts {
  totalClients: number;
  nouveauxClients: number;
  dernierExport: string | null;
}

export default function AdminPromotions() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [statutContacts, setStatutContacts] = useState<StatutContacts | null>(null);
  const [open, setOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingNew, setExportingNew] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    adminService.getPromotions()
      .then(setPromotions)
      .catch(() => toast({ title: "Erreur chargement promotions", variant: "destructive" }));
    adminService.getStatutContacts()
      .then(setStatutContacts)
      .catch(() => {});
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const created = await adminService.createPromotion({ titre: values.titre });
      setPromotions(prev => [created, ...prev]);
      toast({ title: "Promotion créée" });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  async function handleExportTous() {
    setExportingAll(true);
    try {
      await adminService.exportContacts();
      toast({ title: `${statutContacts?.totalClients ?? ""} contacts exportés en .vcf` });
      // Rafraîchir le statut
      const s = await adminService.getStatutContacts();
      setStatutContacts(s);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur export", variant: "destructive" });
    } finally {
      setExportingAll(false);
    }
  }

  async function handleExportNouveaux() {
    setExportingNew(true);
    try {
      await adminService.exportNouveauxContacts();
      toast({ title: `${statutContacts?.nouveauxClients ?? ""} nouveaux contacts exportés en .vcf` });
      const s = await adminService.getStatutContacts();
      setStatutContacts(s);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur export", variant: "destructive" });
    } finally {
      setExportingNew(false);
    }
  }

  function handleCopyPromo(promo: Promotion) {
    navigator.clipboard.writeText(promo.titre).then(() => {
      setCopiedId(promo.id);
      toast({ title: "Message copié — collez-le dans WhatsApp" });
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Promotions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{promotions.length} promotion(s)</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-1.5" data-testid="button-add-promo">
            <Plus size={16} /> Nouvelle promotion
          </Button>
        </div>

        {/* Bloc export contacts */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Export contacts WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exportez vos clients en fichier .vcf — importez-le sur votre téléphone en un clic, puis diffusez via WhatsApp Business
              </p>
            </div>
          </div>

          {/* Compteurs */}
          {statutContacts && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-3">
                <Users size={16} className="text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="text-lg font-bold text-foreground">{statutContacts.totalClients}</div>
                  <div className="text-xs text-muted-foreground">clients au total</div>
                </div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-3">
                <UserPlus size={16} className="text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-lg font-bold text-green-400">{statutContacts.nouveauxClients}</div>
                  <div className="text-xs text-muted-foreground">
                    nouveaux{statutContacts.dernierExport
                      ? ` depuis le ${format(new Date(statutContacts.dernierExport), "dd MMM", { locale: fr })}`
                      : " (jamais exporté)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boutons export */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={handleExportTous}
              disabled={exportingAll || !statutContacts?.totalClients}
              data-testid="button-export-tous"
            >
              <Download size={14} />
              {exportingAll ? "Export en cours..." : `Tous les contacts (${statutContacts?.totalClients ?? 0})`}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={handleExportNouveaux}
              disabled={exportingNew || !statutContacts?.nouveauxClients}
              data-testid="button-export-nouveaux"
            >
              <UserPlus size={14} />
              {exportingNew ? "Export en cours..." : `Nouveaux seulement (${statutContacts?.nouveauxClients ?? 0})`}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            💡 Après import sur Android/iPhone, créez une liste de diffusion WhatsApp Business avec les contacts "Client X" et envoyez votre promo en un message.
          </p>
        </div>

        {/* Liste promotions */}
        <div className="space-y-3">
          {promotions.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4" data-testid={`card-promo-${p.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Megaphone size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{p.titre}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(p.createdAt), "dd MMM yyyy · HH:mm", { locale: fr })}
                    </span>
                    {p.envoyee && (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs gap-1">
                        <CheckCircle2 size={9} /> Diffusée
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton copier le message */}
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 w-full"
                  onClick={() => handleCopyPromo(p)}
                  data-testid={`button-copy-promo-${p.id}`}
                >
                  {copiedId === p.id
                    ? <><Check size={13} className="text-green-400" /> Message copié !</>
                    : <><Copy size={13} /> Copier le message pour WhatsApp</>
                  }
                </Button>
              </div>
            </div>
          ))}

          {promotions.length === 0 && (
            <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
              Aucune promotion. Créez-en une pour la partager avec vos clients.
            </div>
          )}
        </div>

        {/* Dialog nouvelle promotion */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouvelle promotion</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField control={form.control} name="titre" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message de promotion</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Ex: 🎮 Ce weekend : 10% de réduction sur toutes les PS4 de 14h à 18h ! Venez jouer chez Switch SAB 🔥"
                        rows={5}
                        data-testid="textarea-promo"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Ce message sera copié tel quel pour envoi WhatsApp.
                    </p>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" data-testid="button-submit-promo">Créer</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
