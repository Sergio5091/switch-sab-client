import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Gift, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import adminService, { ConfigBonus } from "@/services/adminService";

const schema = z.object({
  bonusParHeure: z.coerce.number().min(1, "Requis"),
  seuilMinutes:  z.coerce.number().min(1, "Requis"),
  validiteJours: z.coerce.number().min(1, "Requis"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminBonus() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigBonus | null>(null);

  useEffect(() => {
    adminService.getConfigBonus()
      .then(setConfig)
      .catch(() => {
        setConfig({
          id: 0,
          salleId: 0,
          ratioSecondes: 3600,
          seuilDeblocage: 3600,
          validitejours: 30,
          reductionInvite: 0,
          bonusParrain: 0,
          bonusFilleul: 0,
        });
      });
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bonusParHeure: 10,
      seuilMinutes:  60,
      validiteJours: 30,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        bonusParHeure: Math.round(config.ratioSecondes / 60),
        seuilMinutes:  Math.round(config.seuilDeblocage / 60),
        validiteJours: config.validitejours,
      });
    }
  }, [config]);

  async function onSubmit(values: FormValues) {
    try {
      const updated = await adminService.updateConfigBonus({
        ratioSecondes:  values.bonusParHeure * 60,
        seuilDeblocage: values.seuilMinutes * 60,
        validitejours:  values.validiteJours,
      });
      setConfig(updated);
      toast({ title: "Configuration bonus sauvegardée" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  const bonus = form.watch("bonusParHeure");

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bonus de jeu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configurer les règles d'accumulation du bonus fidélité</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            <span className="font-semibold">Règle actuelle :</span>{" "}
            Pour chaque <span className="text-primary font-bold">heure jouée</span>,
            le client gagne <span className="text-primary font-bold">{bonus} minutes</span> de bonus.
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              Le bonus est crédité automatiquement à la fin de chaque session.
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Paramètres</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="bonusParHeure" render={({ field }) => (
                <FormItem>
                  <FormLabel>Minutes de bonus par heure jouée</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} data-testid="input-bonus-par-heure" /></FormControl>
                  <FormDescription className="text-xs">Ex: 10 → le client gagne 10 min gratuites pour 1h jouée</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="seuilMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Clock size={13} /> Seuil de déblocage (minutes accumulées)</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} data-testid="input-seuil" /></FormControl>
                  <FormDescription className="text-xs">Le bonus n'est utilisable qu'une fois ce seuil atteint</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="validiteJours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Validité du bonus (jours)</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} data-testid="input-validite" /></FormControl>
                  <FormDescription className="text-xs">Le bonus expire si le client n'est pas venu depuis N jours</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" data-testid="button-save-bonus">
                Sauvegarder
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AdminLayout>
  );
}
