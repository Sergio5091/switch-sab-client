import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Megaphone, MessageCircle, CheckCircle2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import adminService, { Promotion } from "@/services/adminService";

const schema = z.object({ titre: z.string().min(10, "Message trop court") });
type FormValues = z.infer<typeof schema>;

export default function AdminPromotions() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    adminService.getPromotions().then(setPromotions).catch(() => toast({ title: "Erreur chargement promotions", variant: "destructive" }));
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

  async function handleSend(id: number, canal: "sms" | "whatsapp") {
    try {
      await adminService.envoyerPromotion(id);
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, envoyee: true } : p));
      toast({ title: `Promotion envoyée via ${canal === "sms" ? "SMS" : "WhatsApp"}` });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur envoi", variant: "destructive" });
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Promotions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{promotions.length} promotion(s)</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-1.5" data-testid="button-add-promo">
            <Plus size={16} /> Nouvelle promotion
          </Button>
        </div>

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
                        <CheckCircle2 size={9} /> Envoyée
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {!p.envoyee && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10"
                    onClick={() => handleSend(p.id, "whatsapp")}
                    data-testid={`button-send-whatsapp-${p.id}`}
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    onClick={() => handleSend(p.id, "sms")}
                    data-testid={`button-send-sms-${p.id}`}
                  >
                    <Send size={13} /> SMS
                  </Button>
                </div>
              )}
            </div>
          ))}

          {promotions.length === 0 && (
            <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-muted-foreground text-sm">
              Aucune promotion. Créez-en une pour la partager avec vos clients.
            </div>
          )}
        </div>

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
                        placeholder="Ex: Ce weekend : 2H achetées = 30 min offertes..."
                        rows={4}
                        data-testid="textarea-promo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
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
