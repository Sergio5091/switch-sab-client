import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Gift, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  ratioJeu: z.coerce.number().min(1, "Requis"),
  ratioBonus: z.coerce.number().min(1, "Requis"),
  seuilMinutes: z.coerce.number().min(1, "Requis"),
  validiteMois: z.coerce.number().min(1, "Requis"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminBonus() {
  const { currentUser, bonusConfigs, updateBonusConfig } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const config = bonusConfigs.find(c => c.salleId === salleId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ratioJeu: config?.ratioJeu ?? 60,
      ratioBonus: config?.ratioBonus ?? 5,
      seuilMinutes: config?.seuilMinutes ?? 60,
      validiteMois: config?.validiteMois ?? 1,
    },
  });

  function onSubmit(values: FormValues) {
    updateBonusConfig(salleId, values);
    toast({ title: "Configuration bonus sauvegardée" });
  }

  const rj = form.watch("ratioJeu");
  const rb = form.watch("ratioBonus");

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Système de bonus</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configurer les règles d'accumulation du bonus temps</p>
        </div>

        {/* Preview card */}
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
                <FormField control={form.control} name="ratioJeu" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes de jeu</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} data-testid="input-ratio-jeu" /></FormControl>
                    <FormDescription className="text-xs">Base de calcul</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ratioBonus" render={({ field }) => (
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
