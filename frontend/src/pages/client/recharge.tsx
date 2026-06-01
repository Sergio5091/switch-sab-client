import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { DollarSign, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MONTANTS = [500, 1000, 2000, 5000, 10000];

export default function ClientRecharge() {
  const { currentUser, clients } = useApp();
  const { toast } = useToast();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
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
      <div className="px-4 pt-6 pb-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recharger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Choisissez un montant</p>
        </div>

        {/* Balance */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <DollarSign size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Solde actuel</div>
            <div className="text-2xl font-bold text-foreground">{(client?.creditMonetaire ?? 0).toLocaleString()} <span className="text-sm text-muted-foreground">FCFA</span></div>
          </div>
        </div>

        {/* Amount grid */}
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
                data-testid={`button-montant-${m}`}
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

        <Button
          className="w-full gap-2 h-12 text-base font-semibold"
          disabled={!selected}
          onClick={handleRequest}
          data-testid="button-request-recharge"
        >
          <Zap size={18} /> Demander au gérant
        </Button>

        <div className="bg-muted/30 border border-border rounded-2xl p-4 text-xs text-muted-foreground text-center">
          💡 Présentez ce montant à un gérant pour effectuer la recharge sur votre compte.
        </div>
      </div>
    </ClientLayout>
  );
}
