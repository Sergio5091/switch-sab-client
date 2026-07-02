import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, CheckCircle2, QrCode, Printer, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/services/api";

interface Coupon {
  id: number;
  code: string;
  valeur: number;
  utilise: boolean;
  createdAt: string;
}

function CouponQRModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handlePrint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Coupon ${coupon.code}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: monospace; background: #fff; }
        .coupon { border: 2px dashed #f97316; border-radius: 12px; padding: 20px; text-align: center; width: 240px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .valeur { font-size: 22px; font-weight: bold; color: #f97316; }
        .qr img { width: 180px; height: 180px; display: block; }
        .code { font-size: 14px; font-weight: bold; letter-spacing: 3px; color: #111; }
        .label { font-size: 11px; color: #666; }
      </style></head>
      <body>
        <div class="coupon">
          <div class="valeur">${coupon.valeur.toLocaleString()} FCFA</div>
          <div class="qr"><img src="${dataUrl}" /></div>
          <div class="code">${coupon.code}</div>
          <div class="label">SWITCH SAB — Coupon de recharge</div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.print();
    win.close();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={16} className="text-primary" /> QR Code — Coupon
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-primary/40 rounded-xl">
          <div className="text-xl font-bold text-primary">{coupon.valeur.toLocaleString()} FCFA</div>
          <QRCodeCanvas ref={canvasRef} value={coupon.code} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
          <div className="font-mono text-sm font-semibold text-foreground tracking-widest">{coupon.code}</div>
          <div className="text-xs text-muted-foreground">SWITCH SAB — Coupon de recharge</div>
        </div>
        <Button onClick={handlePrint} className="w-full gap-2" variant="outline">
          <Printer size={15} /> Imprimer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

const VALEURS = [500, 1000, 2000, 5000];

export default function GerantCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [valeur, setValeur] = useState("500");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [printCount, setPrintCount] = useState("40");

  useEffect(() => {
    api.get('/gerant/coupons')
      .then(r => setCoupons(r.data))
      .catch(() => toast({ title: "Erreur chargement coupons", variant: "destructive" }));
  }, []);

  async function handleGenerate() {
    const n = Number(count);
    const v = Number(valeur);
    if (!n || n < 1 || n > 50) { toast({ title: "Nombre invalide (1-50)", variant: "destructive" }); return; }
    setLoading(true);
    try {
      await api.post('/gerant/coupons/generer', { nombre: n, valeur: v });
      toast({ title: `${n} coupon(s) de ${v.toLocaleString()} F générés` });
      const res = await api.get('/gerant/coupons');
      setCoupons(res.data);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur génération", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handlePrintBatch(nb: number) {
    const liste = coupons.filter(c => !c.utilise).slice(0, nb);
    if (liste.length === 0) {
      toast({ title: "Aucun coupon actif à imprimer", variant: "destructive" });
      return;
    }

    // Générer les QR en SVG inline (pas besoin de chargement d'image)
    const QRCode = (await import('qrcode')).default;
    const rows = await Promise.all(
      liste.map(async c => {
        const svgString = await QRCode.toString(c.code, {
          type: 'svg',
          width: 100,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        return `
          <div class="coupon">
            <div class="valeur">${c.valeur.toLocaleString()} FCFA</div>
            <div class="qr">${svgString}</div>
            <div class="code">${c.code}</div>
            <div class="label">Switch SAB</div>
          </div>`;
      })
    );

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Coupons Switch SAB</title>
      <style>
        @page { size: A4; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: monospace; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; width: 100%; }
        .coupon { border: 1.5px dashed #f97316; border-radius: 6px; padding: 6px 4px; text-align: center; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .valeur { font-size: 12px; font-weight: bold; color: #f97316; }
        .qr svg { width: 90px; height: 90px; display: block; }
        .code { font-size: 10px; font-weight: bold; letter-spacing: 1.5px; }
        .label { font-size: 8px; color: #888; }
      </style></head>
      <body><div class="grid">${rows.join("")}</div>
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body></html>`);
    win.document.close();
    toast({ title: `${liste.length} coupons avec QR envoyés à l'imprimante` });
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
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VALEURS.map(v => <SelectItem key={v} value={String(v)}>{v.toLocaleString()} F</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantité (max 50)</Label>
              <Input value={count} onChange={e => setCount(e.target.value)} type="number" min={1} max={50} className="w-24" />
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="gap-1.5">
              <Ticket size={15} /> {loading ? "Génération..." : "Générer"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Les coupons générés ne peuvent pas être modifiés ni supprimés.
          </p>
          {coupons.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
              <span className="text-xs text-muted-foreground">Imprimer :</span>
              <Input
                type="number"
                min={1}
                max={actifs.length}
                value={printCount}
                onChange={e => setPrintCount(e.target.value)}
                className="w-20 h-8 text-xs"
                placeholder="Qté"
              />
              <Button variant="outline" size="sm" onClick={() => handlePrintBatch(Number(printCount) || actifs.length)} className="gap-1.5 text-xs">
                <Printer size={13} /> Imprimer
              </Button>
              <span className="text-xs text-muted-foreground">({actifs.length} actifs disponibles)</span>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Tous les coupons</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-2.5 text-xs text-muted-foreground font-medium">Code</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Valeur</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Statut</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">Aucun coupon généré</td></tr>
                )}
                {[...actifs, ...utilises].map(coupon => (
                  <tr key={coupon.id} className={cn("hover:bg-muted/20 transition-colors", coupon.utilise && "opacity-50")}>
                    <td className="px-5 py-3 font-mono text-xs text-foreground tracking-widest">
                      <div className="flex items-center gap-2">
                        {coupon.code}
                        <button
                          onClick={() => navigator.clipboard.writeText(coupon.code).then(() => toast({ title: "Code copié !" }))}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Copier le code"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-primary">{coupon.valeur.toLocaleString()} F</td>
                    <td className="px-3 py-3">
                      <Badge className={!coupon.utilise ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs gap-1" : "bg-muted text-muted-foreground text-xs gap-1"}>
                        {!coupon.utilise ? <Ticket size={9} /> : <CheckCircle2 size={9} />}
                        {!coupon.utilise ? "Actif" : "Utilisé"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      {!coupon.utilise && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary hover:text-primary" onClick={() => setSelectedCoupon(coupon)}>
                          <QrCode size={14} /> Voir QR
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCoupon && <CouponQRModal coupon={selectedCoupon} onClose={() => setSelectedCoupon(null)} />}
      </div>
    </AdminLayout>
  );
}
