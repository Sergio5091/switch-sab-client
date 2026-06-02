import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Clock, Users, Gift, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import gerantService, { RapportJour } from "@/services/gerantService";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function GerantRapport() {
  const { toast } = useToast();
  const [rapport, setRapport] = useState<RapportJour | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gerantService.getRapportJour()
      .then(setRapport)
      .catch(() => toast({ title: "Erreur chargement rapport", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  function handleExport() {
    if (!rapport) return;
    const rechargeRows = (rapport.recharges ?? []).map((r: any) =>
      `${r.client},${r.date},,Recharge,${r.montant},,,Normal,RECHARGE`
    );
    const csv = ["Client,Date,Fin,Type,Montant,Poste,Catégorie,TypePaiement,Statut", ...rechargeRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_gerant_${rapport.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Rapport CSV exporté" });
  }

  const today = new Date();
  const recharges = rapport?.recharges ?? [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mon rapport</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(today, "EEEE dd MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!rapport} className="gap-1.5" data-testid="button-export">
            <Download size={15} /> Exporter
          </Button>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">
            Chargement…
          </div>
        ) : rapport ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={DollarSign}
                label="Total du jour"
                value={`${(rapport.resume.totalMontantJour ?? rapport.resume.totalMontantSessions ?? (rapport.resume as any).totalMontant ?? 0).toLocaleString()} F`}
                sub={`Sessions: ${(rapport.resume.totalMontantSessions ?? (rapport.resume as any).totalMontant ?? 0).toLocaleString()} F · Recharges: ${(rapport.resume.totalMontantRecharges ?? 0).toLocaleString()} F`}
                color="bg-primary/10 text-primary"
              />
              <StatCard
                icon={TrendingUp}
                label="Sessions"
                value={String(rapport.resume.totalSessions)}
                sub={`${rapport.resume.sessionNormale} normales`}
                color="bg-green-500/10 text-green-400"
              />
              <StatCard
                icon={Users}
                label="Clients"
                value={String(Object.keys(rapport.parClient).length)}
                sub="clients uniques"
                color="bg-blue-500/10 text-blue-400"
              />
              <StatCard
                icon={Gift}
                label="Sessions bonus"
                value={String(rapport.resume.sessionBonus)}
                sub={`sur ${rapport.resume.totalSessions} sessions`}
                color="bg-orange-500/10 text-orange-400"
              />
            </div>

            {/* Par catégorie */}
            {Object.keys(rapport.parCategorie).length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Par catégorie</h2>
                </div>
                <div className="divide-y divide-border">
                  {Object.entries(rapport.parCategorie).map(([nom, data]) => {
                    const d = data as { nombre: number; montant: number; secondes: number };
                    return (
                      <div key={nom} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-sm font-medium text-foreground flex-1">{nom}</span>
                        <span className="text-xs text-muted-foreground">{d.nombre} sessions</span>
                        <span className="text-xs font-semibold text-primary">{d.montant.toLocaleString()} F</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recharges du jour */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-foreground">
                  Recharges du jour ({recharges.length})
                </h2>
                {recharges.length > 0 && (
                  <span className="ml-auto text-xs font-semibold text-primary">
                    Total : {(recharges as any[]).reduce((s: number, r: any) => s + r.montant, 0).toLocaleString()} F
                  </span>
                )}
              </div>
              <div className="divide-y divide-border">
                {recharges.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                    Aucune recharge aujourd'hui
                  </div>
                ) : (recharges as any[]).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3" data-testid={`row-recharge-rapport-${r.id}`}>
                    <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign size={12} className="text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{r.client}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} /> {format(new Date(r.date), "HH:mm")}
                        {r.creditsActuels && r.creditsActuels.filter((c: any) => c.soldeMinutes > 0).length > 0 && (
                          <span>
                            · Temps restant : {r.creditsActuels
                              .filter((c: any) => c.soldeMinutes > 0)
                              .map((c: any) => `${c.soldeMinutes}min (${c.categorie})`)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">+{r.montant.toLocaleString()} F</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
