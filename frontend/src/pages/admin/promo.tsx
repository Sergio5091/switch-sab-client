import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Users, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  bonusParrainPct: z.coerce.number().min(0).max(100),
  reductionInvitePct: z.coerce.number().min(0).max(100),
});
type FormValues = z.infer<typeof schema>;

export default function AdminPromo() {
  const { currentUser, promoConfigs, updatePromoConfig } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const config = promoConfigs.find(c => c.salleId === salleId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bonusParrainPct: config?.bonusParrainPct ?? 10,
      reductionInvitePct: config?.reductionInvitePct ?? 5,
    },
  });

  function onSubmit(values: FormValues) {
    updatePromoConfig(salleId, values);
    toast({ title: "Configuration parrainage sauvegardée" });
  }

  const parrain = form.watch("bonusParrainPct");
  const invite = form.watch("reductionInvitePct");

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Parrainage & Codes promo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configurer les récompenses de parrainage</p>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            Quand un nouveau client s'inscrit avec le code d'un parrain :<br />
            <span className="text-blue-400 font-bold">Le parrain</span> reçoit <span className="text-primary font-bold">{parrain}%</span> de bonus sur son compte.<br />
            <span className="text-blue-400 font-bold">L'invité</span> bénéficie d'une réduction de <span className="text-primary font-bold">{invite}%</span>.
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Paramètres</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="bonusParrainPct" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Users size={13} /> Bonus parrain (%)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} max={100} data-testid="input-bonus-parrain" /></FormControl>
                  <FormDescription className="text-xs">Pourcentage du crédit de l'invité offert au parrain</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="reductionInvitePct" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Zap size={13} /> Réduction invité (%)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} max={100} data-testid="input-reduction-invite" /></FormControl>
                  <FormDescription className="text-xs">Réduction sur la première recharge de l'invité</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" data-testid="button-save-promo">
                Sauvegarder
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AdminLayout>
  );
}
