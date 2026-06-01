import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Clock, Users, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

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
  const { currentUser, sessions, clients, recharges } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;
  const today = new Date();
  const interval = { start: startOfDay(today), end: endOfDay(today) };

  const todaySessions = sessions.filter(s =>
    s.salleId === salleId &&
    s.gerantId === currentUser?.id &&
    isWithinInterval(new Date(s.heureDebut), interval)
  );
  const todayRecharges = recharges.filter(r =>
    r.gerantValidateur === currentUser?.id &&
    isWithinInterval(new Date(r.heureCreation), interval)
  );

  const totalRevenus = todaySessions.reduce((s, r) => s + r.montant, 0);
  const totalRecharges = todayRecharges.reduce((s, r) => s + r.montant, 0);
  const clientsUniques = new Set(todaySessions.map(s => s.clientId)).size;
  const bonusSessions = todaySessions.filter(s => s.estBonus);

  function handleExport() {
    const rows = todaySessions.map(s => {
      const client = clients.find(c => c.id === s.clientId);
      return `${client?.pseudo ?? ""},${s.heureDebut},${s.heureFin ?? ""},${s.dureeAchetee},${s.montant},${s.estBonus ? "Bonus" : "Normal"}`;
    });
    const csv = ["Client,Début,Fin,Durée,Montant,Type", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_gerant_${format(today, "yyyyMMdd")}.csv`;
    a.click();
    toast({ title: "Rapport CSV exporté" });
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mon rapport</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{format(today, "EEEE dd MMMM yyyy", { locale: fr })}</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-1.5" data-testid="button-export">
            <Download size={15} /> Exporter
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Revenus" value={`${totalRevenus.toLocaleString()} F`} sub="sessions du jour" color="bg-primary/10 text-primary" />
          <StatCard icon={TrendingUp} label="Recharges" value={`${totalRecharges.toLocaleString()} F`} sub="encaissements" color="bg-green-500/10 text-green-400" />
          <StatCard icon={Users} label="Clients" value={String(clientsUniques)} sub="clients uniques" color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={Gift} label="Sessions bonus" value={String(bonusSessions.length)} sub={`sur ${todaySessions.length} sessions`} color="bg-orange-500/10 text-orange-400" />
        </div>

        {/* Sessions list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Sessions du jour ({todaySessions.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {todaySessions.slice().reverse().map(s => {
              const client = clients.find(c => c.id === s.clientId);
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3" data-testid={`row-session-${s.id}`}>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{client?.pseudo ?? "—"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock size={10} /> {format(new Date(s.heureDebut), "HH:mm")} · {s.dureeAchetee}
                      {s.estBonus && <span className="text-primary font-medium">• Bonus</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{s.montant.toLocaleString()} F</div>
                    <div className="text-xs text-muted-foreground">{s.actif ? "En cours" : "Terminée"}</div>
                  </div>
                </div>
              );
            })}
            {todaySessions.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">Aucune session aujourd'hui</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
