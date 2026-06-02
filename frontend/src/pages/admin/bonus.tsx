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
  ratioJeuMinutes: z.coerce.number().min(1, "Requis"),
  ratioBonusMinutes: z.coerce.number().min(1, "Requis"),
  seuilMinutes: z.coerce.number().min(1, "Requis"),
  validiteMois: z.coerce.number().min(1, "Requis"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminBonus() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigBonus | null>(null);

  useEffect(() => {
    adminService.getConfigBonus()
      .then(setConfig)
      .catch(() => {
        // Pas encore créée, valeurs par défaut
        setConfig({
          id: 0,
          salleId: 0,
          ratioSecondes: 3600,
          seuilDeblocage: 3600,
          validitejours: 30,
          reductionInvite: 0,
          bonusParrain: 0,
        });
      });
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ratioJeuMinutes: 60,
      ratioBonusMinutes: 5,
      seuilMinutes: 60,
      validiteMois: 1,
    },
  });

  // Sync avec le backend
  useEffect(() => {
    if (config) {
      form.reset({
        ratioJeuMinutes: Math.round(config.ratioSecondes / 60),
        ratioBonusMinutes: 5, // Le backend stocke ratioSecondes, pas le ratio bonus
        seuilMinutes: Math.round(config.seuilDeblocage / 60),
        validiteMois: Math.round(config.validitejours / 30),
      });
    }
  }, [config]);

  async function onSubmit(values: FormValues) {
    try {
      const updated = await adminService.updateConfigBonus({
        ratioSecondes: values.ratioJeuMinutes * 60,
        seuilDeblocage: values.seuilMinutes * 60,
        validitejours: values.validiteMois * 30,
      });
      setConfig(updated);
      toast({ title: "Configuration bonus sauvegardée" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    }
  }

  const rj = form.watch("ratioJeuMinutes");
  const rb = form.watch("ratioBonusMinutes");

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Système de bonus</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configurer les règles d'accumulation du bonus temps</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            <span className="font-semibold">Règle actuelle :</span>{" "}
            Pour chaque <span className="text-primary font-bold">{rj} minutes</span> jouées,
            le client gagne <span className="text-primary font-bold">{rb} minutes</span> de bonus.
            <br />
            <span className="text-muted-foreground text-xs mt-1 block">
              Soit {Math.round(rb / rj * 100 * 10) / 10}% de temps offert.
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="ratioJeuMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes de jeu</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-ratio-jeu" /></FormControl>
                    <FormDescription className="text-xs">Base de calcul</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ratioBonusMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes de bonus</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-ratio-bonus" /></FormControl>
                    <FormDescription className="text-xs">Temps offert</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="seuilMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Clock size={13} /> Seuil minimum (minutes cumulées)</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} data-testid="input-seuil" /></FormControl>
                  <FormDescription className="text-xs">Le bonus n'est disponible qu'une fois ce seuil atteint</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="validiteMois" render={({ field }) => (
                <FormItem>
                  <FormLabel>Validité du bonus (mois)</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} data-testid="input-validite" /></FormControl>
                  <FormDescription className="text-xs">Bonus remis à zéro si inactif depuis N mois</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" data-testid="button-save-bonus">
                Sauvegarder la configuration
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </AdminLayout>
  );
}
