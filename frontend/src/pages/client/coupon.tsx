import { useState, useEffect, useRef } from "react";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ticket, QrCode, Keyboard, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import api from "@/services/api";
import { cn } from "@/lib/utils";

type Mode = "scan" | "manuel";

export default function ClientCoupon() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("scan");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState<{ valeur: number; code: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanDivId = "qr-reader";

  // Démarrer/arrêter le scanner selon le mode
  useEffect(() => {
    if (mode === "scan") {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [mode]);

  async function startScanner() {
    if (scanning) return;
    try {
      const qr = new Html5Qrcode(scanDivId);
      scannerRef.current = qr;
      setScanning(true);
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner();
          await applyCode(decodedText.trim().toUpperCase());
        },
        undefined
      );
    } catch (err) {
      setScanning(false);
      toast({ title: "Caméra inaccessible — utilisez la saisie manuelle", variant: "destructive" });
      setMode("manuel");
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
    setScanning(false);
  }

  async function applyCode(cleaned: string) {
    if (!cleaned) { toast({ title: "Code vide", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await api.post("/client/coupon", { code: cleaned });
      setSuccess({ valeur: res.data.valeur, code: cleaned });
      setCode("");
      toast({ title: `✅ ${res.data.valeur.toLocaleString()} FCFA crédités !` });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Coupon invalide ou déjà utilisé", variant: "destructive" });
      // Redémarrer le scanner après une erreur
      if (mode === "scan") setTimeout(() => startScanner(), 1500);
    } finally {
      setLoading(false);
    }
  }

  function handleManuel() {
    applyCode(code.trim().toUpperCase());
  }

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-md mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupon de recharge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Scannez le QR code ou entrez le code manuellement</p>
        </div>

        {/* Succès */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <div className="font-bold text-green-400 text-lg">+{success.valeur.toLocaleString()} FCFA</div>
              <div className="text-xs text-muted-foreground font-mono">{success.code}</div>
              <div className="text-xs text-green-400 mt-0.5">Crédit ajouté à votre compte !</div>
            </div>
            <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => { setSuccess(null); if (mode === "scan") startScanner(); }}>
              Nouveau
            </Button>
          </div>
        )}

        {/* Onglets mode */}
        {!success && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode("scan")}
              className={cn("flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                mode === "scan" ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <QrCode size={15} /> Scanner QR
            </button>
            <button
              onClick={() => setMode("manuel")}
              className={cn("flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                mode === "manuel" ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/30"
              )}
            >
              <Keyboard size={15} /> Code manuel
            </button>
          </div>
        )}

        {/* Scanner */}
        {!success && mode === "scan" && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-square max-w-xs mx-auto">
              <div id={scanDivId} className="w-full h-full" />
              {/* Overlay viseur */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary/70 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Pointez la caméra vers le QR code du coupon
            </p>
          </div>
        )}

        {/* Saisie manuelle */}
        {!success && mode === "manuel" && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                <Ticket size={24} className="text-orange-400" />
              </div>
              <p className="text-xs text-muted-foreground text-center">Entrez le code imprimé sur votre coupon</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="font-mono text-base h-12 tracking-widest"
                onKeyDown={e => e.key === "Enter" && handleManuel()}
              />
              <Button onClick={handleManuel} disabled={loading || !code} className="h-12 px-6">
                {loading ? "..." : "OK"}
              </Button>
            </div>
          </div>
        )}

        <div className="bg-muted/30 border border-border rounded-xl p-3 text-xs text-muted-foreground">
          💡 Les coupons sont disponibles auprès de votre gérant. Chaque coupon est à usage unique.
        </div>
      </div>
    </ClientLayout>
  );
}
