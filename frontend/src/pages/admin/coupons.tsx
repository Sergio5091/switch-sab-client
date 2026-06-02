import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import adminService, { Coupon } from "@/services/adminService";

const VALEURS = [500, 1000, 2000, 5000];

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [valeur, setValeur] = useState("500");
  const [count, setCount] = useState("10");

  useEffect(() => {
    adminService.getCoupons().then(setCoupons).catch(() => toast({ title: "Erreur chargement coupons", variant: "destructive" }));
  }, []);

  async function handleGenerate() {
    const n = Number(count);
    const v = Number(valeur);
    if (!n || n < 1 || n > 100) { toast({ title: "Nombre invalide (1-100)", variant: "destructive" }); return; }
    try {
      await adminService.genererCoupons({ nombre: n, valeur: v });
      toast({ title: `${n} coupon(s) de ${v}F générés` });
      // Recharger
      adminService.getCoupons().then(setCoupons);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur génération", variant: "destructive" });
    }
  }

  async function handleExportPDF() {
    try {
      const blob = await adminService.exportCouponsPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coupons-${new Date().getTime()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "PDF téléchargé" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Export PDF non disponible (Phase 7)", variant: "destructive" });
    }
  }

  const actifs = coupons.filter(c => !c.utilise);
  const utilises = coupons.filter(c => c.utilise);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{actifs.length} actifs · {utilises.length} utilisés</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Générer des coupons</h2>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label>Valeur (FCFA)</Label>
              <Select value={valeur} onValueChange={setValeur}>
                <SelectTrigger className="w-32" data-testid="select-valeur-coupon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALEURS.map(v => <SelectItem key={v} value={String(v)}>{v.toLocaleString()} F</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input value={count} onChange={e => setCount(e.target.value)} type="number" min={1} max={100} className="w-24" data-testid="input-count-coupon" />
            </div>
            <Button onClick={handleGenerate} className="gap-1.5" data-testid="button-generate-coupons">
              <Ticket size={15} /> Générer
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="gap-1.5" data-testid="button-export-pdf">
              <Download size={15} /> PDF A4 (40/page)
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Tous les coupons</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">Code</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Valeur</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.slice().reverse().map(coupon => (
                  <tr key={coupon.id} className={cn("hover:bg-muted/20 transition-colors", coupon.utilise && "opacity-60")} data-testid={`row-coupon-${coupon.id}`}>
                    <td className="px-5 py-3 font-mono text-xs text-foreground">{coupon.code}</td>
                    <td className="px-3 py-3 font-semibold text-primary">{coupon.valeur.toLocaleString()} F</td>
                    <td className="px-3 py-3">
                      <Badge className={!coupon.utilise ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs gap-1" : "bg-muted text-muted-foreground text-xs gap-1"}>
                        {!coupon.utilise ? <Ticket size={9} /> : <CheckCircle2 size={9} />}
                        {!coupon.utilise ? "Actif" : "Utilisé"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
