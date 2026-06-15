import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Clock, Users, Gift, Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/services/api";

interface SessionRapport {
  id: number;
  client: string;
  poste: string;
  categorie: string;
  duree: string;
  montant: number;
  debut: string;
  fin?: string;
  statut: string;
  tempsRestant: number;
  estBonus: boolean;
}

interface RechargeRapport {
  id: number;
  client: string;
  telephone: string;
  montant: number;
  date: string;
  creditsActuels: { categorie: string; soldeMinutes: number }[];
}

interface Rapport {
  date: string;
  gerant: string;
  resume: {
    totalSessions: number;
    totalMontantSessions: number;
    totalMontantRecharges: number;
    totalMontantJour: number;
    totalSecondes: string;
    sessionNormale: number;
    sessionBonus: number;
  };
  parCategorie: Record<string, { nombre: number; montant: number; secondes: number }>;
  parClient: Record<string, { nombre: number; montant: number; telephone: string; estEnfant: boolean }>;
  sessions: SessionRapport[];
  recharges: RechargeRapport[];
}

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
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gerant/rapport/jour')
      .then(r => setRapport(r.data))
      .catch(() => toast({ title: "Erreur chargement rapport", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  function handleExport() {
    if (!rapport) return;
    const sessionRows = rapport.sessions.map(s =>
      `SESSION,${s.client},${format(new Date(s.debut), "HH:mm")},${s.fin ? format(new Date(s.fin), "HH:mm") : "En cours"},${s.duree},${s.montant},${s.poste},${s.categorie},${s.estBonus ? "Bonus" : "Normal"},${s.statut}`
    );
    const rechargeRows = rapport.recharges.map(r =>
      `RECHARGE,${r.client},${format(new Date(r.date), "HH:mm")},,,${r.montant},,,Normal,VALIDÉE`
    );
    const csv = [
      `Rapport du ${rapport.date} — Gérant : ${rapport.gerant}`,
      `Total jour : ${rapport.resume.totalMontantJour} F (Sessions: ${rapport.resume.totalMontantSessions} F | Recharges: ${rapport.resume.totalMontantRecharges} F)`,
      "",
      "Type,Client,Début,Fin,Durée,Montant,Poste,Catégorie,Mode,Statut",
      ...sessionRows,
      ...rechargeRows,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${rapport.date}_${rapport.gerant}.csv`;
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
            <h1 className="text-xl font-bold text-foreground">Rapport du jour</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(today, "EEEE dd MMMM yyyy", { locale: fr })}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!rapport} className="gap-1.5">
            <Download size={15} /> Exporter CSV
          </Button>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : !rapport ? (
          <div className="bg-card border border-border rounded-xl px-5 py-12 text-center text-muted-foreground text-sm">Aucune donnée disponible</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={DollarSign} label="Total du jour"
                value={`${rapport.resume.totalMontantJour.toLocaleString()} F`}
                sub={`Sessions ${rapport.resume.totalMontantSessions.toLocaleString()} F · Recharges ${rapport.resume.totalMontantRecharges.toLocaleString()} F`}
                color="bg-primary/10 text-primary"
              />
              <StatCard
                icon={TrendingUp} label="Sessions"
                value={String(rapport.resume.totalSessions)}
                sub={`${rapport.resume.sessionNormale} normales · ${rapport.resume.sessionBonus} bonus`}
                color="bg-green-500/10 text-green-400"
              />
              <StatCard
                icon={Users} label="Clients uniques"
                value={String(Object.keys(rapport.parClient).length)}
                sub="aujourd'hui"
                color="bg-blue-500/10 text-blue-400"
              />
              <StatCard
                icon={Clock} label="Temps géré"
                value={rapport.resume.totalSecondes}
                sub="temps de jeu total"
                color="bg-purple-500/10 text-purple-400"
              />
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
                      <span className="text-xs text-muted-foreground">{data.nombre} sessions · {Math.floor(data.secondes / 60)} min</span>
                      <span className="text-xs font-semibold text-primary">{data.montant.toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions du jour */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <TrendingUp size={14} className="text-green-400" />
                <h2 className="text-sm font-semibold text-foreground">Sessions ({rapport.sessions.length})</h2>
                {rapport.sessions.length > 0 && (
                  <span className="ml-auto text-xs font-semibold text-primary">
                    {rapport.resume.totalMontantSessions.toLocaleString()} F
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                {rapport.sessions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune session aujourd'hui</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Client</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Début</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Fin</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Durée</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Poste</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Catégorie</th>
                        <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Montant</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rapport.sessions.map(s => (
                        <tr key={s.id} className={cn("hover:bg-muted/20 transition-colors", s.estBonus && "bg-primary/5")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{s.client}</span>
                              {s.estBonus && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 py-0"><Gift size={9} />Bonus</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{format(new Date(s.debut), "HH:mm")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.fin ? format(new Date(s.fin), "HH:mm") : <span className="text-green-400">En cours</span>}</td>
                          <td className="px-4 py-3 text-foreground">{s.duree}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.poste}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.categorie}</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{s.montant.toLocaleString()} F</td>
                          <td className="px-4 py-3">
                            <Badge className={cn("text-xs", s.statut === "ACTIVE" ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground")}>
                              {s.statut === "ACTIVE" ? "En cours" : s.statut === "ARRETEE" ? "Arrêtée" : "Terminée"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recharges du jour */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-foreground">Recharges ({rapport.recharges.length})</h2>
                {rapport.recharges.length > 0 && (
                  <span className="ml-auto text-xs font-semibold text-primary">
                    {rapport.resume.totalMontantRecharges.toLocaleString()} F
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                {rapport.recharges.length === 0 ? (
                  <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune recharge aujourd'hui</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Client</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Début</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Téléphone</th>
                        <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium">Montant</th>
                        <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Solde après</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rapport.recharges.map(r => (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{r.client}</td>
                          <td className="px-4 py-3 text-muted-foreground">{format(new Date(r.date), "HH:mm")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.telephone}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-400">+{r.montant.toLocaleString()} F</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {r.creditsActuels.filter(c => c.soldeMinutes > 0).map(c => `${c.soldeMinutes}min ${c.categorie}`).join(", ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
