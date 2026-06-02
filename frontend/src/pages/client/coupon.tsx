import { useState } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

export default function ClientCoupon() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) { toast({ title: "Entrez un code", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await api.post('/client/coupon', { code: cleaned });
      toast({ title: `✅ ${res.data.valeur.toLocaleString()} FCFA crédités !` });
      setCode("");
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Coupon invalide", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupon de recharge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Entrez votre code pour recharger</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Ticket size={28} className="text-orange-400" />
          </div>
          <div className="text-center text-xs text-muted-foreground">Entrez un coupon pour recharger instantanément</div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="font-mono text-base h-12"
              onKeyDown={e => e.key === "Enter" && handleApply()}
            />
            <Button onClick={handleApply} disabled={loading} className="h-12 px-6">
              Appliquer
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-3 text-xs text-muted-foreground">
          💡 Les coupons sont disponibles auprès de votre gérant.
        </div>
      </div>
    </ClientLayout>
  );
}
