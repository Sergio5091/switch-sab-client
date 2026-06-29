import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, Gift, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminService, { PromoConfig } from "@/services/adminService";

const schema = z.object({
  bonusParrain: z.coerce.number().min(0, "Montant requis"),
  bonusFilleul: z.coerce.number().min(0, "Montant requis"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminPromo() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PromoConfig>({ bonusParrain: 0, bonusFilleul: 0, reductionInvite: 0, salleId: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminService.getPromoConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bonusParrain: 0, bonusFilleul: 0 },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        bonusParrain: config.bonusParrain ?? 0,
        bonusFilleul: config.bonusFilleul ?? 0,
      });
    }
  }, [config]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const updated = await adminService.updatePromoConfig({
        bonusParrain: values.bonusParrain,
        bonusFilleul: values.bonusFilleul,
      });
      setConfig(updated);
      toast({ title: "Configuration parrainage sauvegardée" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const parrain = form.watch("bonusParrain") || 0;
  const filleul = form.watch("bonusFilleul") || 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Parrainage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configurer les bonus de parrainage</p>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            Quand un nouveau client s'inscrit avec le code d'un parrain :<br />
            <span className="text-blue-400 font-bold">Le parrain</span> reçoit <span className="text-primary font-bold">{parrain.toLocaleString()} F</span> de crédit.<br />
            <span className="text-blue-400 font-bold">Le filleul</span> reçoit <span className="text-primary font-bold">{filleul.toLocaleString()} F</span> de crédit.<br />
            <span className="text-muted-foreground text-xs mt-1 block">
              Les montants sont convertis automatiquement en minutes de jeu selon le taux configuré dans les paramètres bonus.
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Bonus de parrainage</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="bonusParrain" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Gift size={13} /> Bonus parrain (FCFA)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} placeholder="Ex: 500" data-testid="input-bonus-parrain" /></FormControl>
                  <FormDescription className="text-xs">Montant crédité au parrain après un parrainage réussi</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bonusFilleul" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><UserPlus size={13} /> Bonus filleul (FCFA)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} placeholder="Ex: 500" data-testid="input-bonus-filleul" /></FormControl>
                  <FormDescription className="text-xs">Montant crédité au filleul après son inscription</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-save-promo">
                {loading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AdminLayout>
  );
}

