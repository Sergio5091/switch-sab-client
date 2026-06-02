import { useState } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MONTANTS = [500, 1000, 2000, 5000, 10000];

export default function ClientRecharge() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<number | null>(null);

  function handleRequest() {
    if (!selected) { toast({ title: "Sélectionner un montant", variant: "destructive" }); return; }
    toast({
      title: "Demande envoyée",
      description: `Approchez un gérant pour recharger de ${selected.toLocaleString()} FCFA.`,
    });
    setSelected(null);
  }

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recharger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Choisissez un montant et présentez-le à un gérant</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Montant à recharger</p>
          <div className="grid grid-cols-3 gap-3">
            {MONTANTS.map(m => (
              <button
                key={m}
                onClick={() => setSelected(m)}
                className={cn(
                  "p-4 rounded-2xl border font-bold text-lg transition-all",
                  selected === m ? "bg-primary/10 border-primary/50 text-primary shadow-lg shadow-primary/10" : "bg-card border-border text-foreground hover:border-primary/30"
                )}
              >
                {m >= 1000 ? `${m / 1000}k` : m}
                <div className="text-xs font-normal text-muted-foreground mt-0.5">FCFA</div>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Montant choisi</div>
            <div className="text-xl font-bold text-primary">{selected.toLocaleString()} F</div>
          </div>
        )}

        <Button className="w-full gap-2 h-12 text-base font-semibold" disabled={!selected} onClick={handleRequest}>
          <Zap size={18} /> Demander au gérant
        </Button>

        <div className="bg-muted/30 border border-border rounded-2xl p-4 text-xs text-muted-foreground text-center">
          💡 Présentez ce montant à un gérant pour effectuer la recharge sur votre compte.
        </div>
      </div>
    </ClientLayout>
  );
}
