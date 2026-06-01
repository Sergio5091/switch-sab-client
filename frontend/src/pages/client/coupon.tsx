import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientCoupon() {
  const { currentUser, clients, coupons, utiliserCoupon } = useApp();
  const { toast } = useToast();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
  const salleId = currentUser?.salleId ?? 1;
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid" | "used">("idle");
  const [foundCoupon, setFoundCoupon] = useState<typeof coupons[0] | null>(null);

  function handleVerify() {
    const cleaned = code.trim().toUpperCase();
    const coupon = coupons.find(c => c.code === cleaned && c.salleId === salleId);
    if (!coupon) { setStatus("invalid"); setFoundCoupon(null); return; }
    if (coupon.statut !== "actif") { setStatus("used"); setFoundCoupon(coupon); return; }
    setStatus("valid");
    setFoundCoupon(coupon);
  }

  function handleApply() {
    if (!foundCoupon || !client) return;
    const ok = utiliserCoupon(foundCoupon.code, client.id);
    if (ok) {
      toast({ title: `${foundCoupon.valeur.toLocaleString()} FCFA ajoutés à votre compte !` });
    } else {
      toast({ title: "Erreur lors de l'application du coupon", variant: "destructive" });
    }
    setCode("");
    setStatus("idle");
    setFoundCoupon(null);
  }

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupon de recharge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Entrez votre code coupon pour recharger</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl p-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Ticket size={28} className="text-orange-400" />
          </div>
          <div className="text-center">
            <div className="font-bold text-foreground">Solde : {(client?.creditMonetaire ?? 0).toLocaleString()} FCFA</div>
            <div className="text-xs text-muted-foreground mt-0.5">Entrez un coupon pour recharger instantanément</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setStatus("idle"); }}
              placeholder="SW-A1B2C3"
              className="font-mono text-base h-12"
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              data-testid="input-coupon-code"
            />
            <Button variant="outline" onClick={handleVerify} className="h-12 px-5" data-testid="button-verify-coupon">
              Vérifier
            </Button>
          </div>

          {status === "valid" && foundCoupon && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-400" />
                <div>
                  <div className="font-semibold text-foreground">Coupon valide</div>
                  <div className="text-xs text-muted-foreground">Code : {foundCoupon.code}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-400">+{foundCoupon.valeur.toLocaleString()} F</div>
            </div>
          )}

          {(status === "invalid" || status === "used") && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
              <XCircle size={20} className="text-destructive" />
              <div>
                <div className="font-semibold text-foreground">Coupon invalide</div>
                <div className="text-xs text-muted-foreground">
                  {status === "used" ? "Ce coupon a déjà été utilisé." : "Ce code n'existe pas dans votre salle."}
                </div>
              </div>
            </div>
          )}

          {status === "valid" && foundCoupon && (
            <Button className="w-full h-12 text-base font-semibold gap-2" onClick={handleApply} data-testid="button-apply-coupon">
              <Ticket size={18} /> Appliquer le coupon
            </Button>
          )}
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-3 text-xs text-muted-foreground">
          💡 Codes d'essai actifs : <span className="font-mono font-bold text-foreground">SW-A1B2C3</span> (500 F) · <span className="font-mono font-bold text-foreground">SW-D4E5F6</span> (500 F) · <span className="font-mono font-bold text-foreground">SW-G7H8I9</span> (1000 F)
        </div>
      </div>
    </ClientLayout>
  );
}
