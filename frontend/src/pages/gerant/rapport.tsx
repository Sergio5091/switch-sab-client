import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Clock, Users, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import gerantService, { RapportJour } from "@/services/gerantService";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
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
    const rows = rapport.detail.map(s =>
      `${s.client},${s.debut},${s.fin ?? ""},${s.duree},${s.montant},${s.poste},${s.categorie},${s.estBonus ? "Bonus" : "Normal"}`
    );
    const csv = ["Client,Début,Fin,Durée,Montant,Poste,Catégorie,Type", ...rows].join("\n");
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mon rapport</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{format(today, "EEEE dd MMMM yyyy", { locale: fr })}</p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!rapport} className="gap-1.5" data-testid="button-export">
            <Download size={15} /> Exporter
          </Button>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : rapport ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Revenus" value={`${rapport.resume.totalMontant.toLocaleString()} F`} sub="sessions du jour" color="bg-primary/10 text-primary" />
              <StatCard icon={TrendingUp} label="Sessions" value={String(rapport.resume.totalSessions)} sub={`${rapport.resume.sessionNormale} normales`} color="bg-green-500/10 text-green-400" />
              <StatCard icon={Users} label="Clients" value={String(Object.keys(rapport.parClient).length)} sub="clients uniques" color="bg-blue-500/10 text-blue-400" />
              <StatCard icon={Gift} label="Sessions bonus" value={String(rapport.resume.sessionBonus)} sub={`sur ${rapport.resume.totalSessions} sessions`} color="bg-orange-500/10 text-orange-400" />
            </div>

            {/* Par catégorie */}
            {Object.keys(rapport.parCategorie).length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Par catégorie</h2>
                </div>
                <div className="divide-y divide-border">
                  {Object.entries(rapport.parCategorie).map(([nom, data]) => (
                    <div key={nom} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-sm font-medium text-foreground flex-1">{nom}</span>
                      <span className="text-xs text-muted-foreground">{data.nombre} sessions</span>
                      <span className="text-xs font-semibold text-primary">{data.montant.toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Détail sessions */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Sessions du jour ({rapport.detail.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {rapport.detail.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune session aujourd'hui</div>
                ) : rapport.detail.map(s => (
                  <div key={s.id} className={cn("flex items-center gap-3 px-5 py-3", s.estBonus && "bg-primary/5")} data-testid={`row-session-${s.id}`}>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{s.client}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Clock size={10} /> {format(new Date(s.debut), "HH:mm")} · {s.duree} · {s.poste}
                        {s.estBonus && <span className="text-primary font-medium">• Bonus</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">{s.montant.toLocaleString()} F</div>
                      <Badge className={s.statut === 'ACTIVE' ? "bg-green-500/10 text-green-400 text-xs" : "bg-muted text-muted-foreground text-xs"}>
                        {s.statut === 'ACTIVE' ? "En cours" : s.statut === 'ARRETEE' ? "Arrêtée" : "Terminée"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">Aucune donnée disponible</div>
        )}
      </div>
    </AdminLayout>
  );
}
