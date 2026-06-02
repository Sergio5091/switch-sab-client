import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Monitor, Users, TrendingUp, Clock, Activity, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import adminService from "@/services/adminService";

type DashboardData = {
  stats: {
    sessionsAujourdhui: number;
    revenuJour: number;
    postes: { total: number; actifs: number };
    clients: number;
  };
  categories: { id: number; nom: string; nbPostes: number; nbActifs: number }[];
  gerantActivity: { gerant: { id: number; nom?: string; prenom?: string }; nbSessions: number; revenu: number }[];
};

export default function AdminDashboard() {
  const { currentUser } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aujourd'hui</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Sessions aujourd'hui", value: loading ? "…" : stats?.sessionsAujourdhui ?? 0, icon: Activity, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
            { label: "Revenu du jour", value: loading ? "…" : `${(stats?.revenuJour ?? 0).toLocaleString()} F`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { label: "Postes actifs", value: loading ? "…" : `${stats?.postes.actifs ?? 0}/${stats?.postes.total ?? 0}`, icon: Monitor, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Clients", value: loading ? "…" : stats?.clients ?? 0, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          ].map(stat => (
            <div key={stat.label} className={cn("rounded-xl border p-4", stat.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Catégories */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Catégories</h2>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-5 py-6 text-sm text-muted-foreground text-center">Chargement…</div>
              ) : (data?.categories ?? []).map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-sm font-medium text-foreground flex-1">{cat.nom}</span>
                  <span className="text-xs text-muted-foreground">{cat.nbPostes} postes</span>
                  <span className="text-xs font-medium text-green-400">{cat.nbActifs} actifs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activité gérants */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Activité des gérants</h2>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="px-5 py-6 text-sm text-muted-foreground text-center">Chargement…</div>
              ) : (data?.gerantActivity ?? []).length === 0 ? (
                <div className="px-5 py-6 text-sm text-muted-foreground text-center">Aucune activité aujourd'hui</div>
              ) : (data?.gerantActivity ?? []).map(({ gerant, nbSessions, revenu }) => (
                <div key={gerant.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {gerant.prenom?.[0] ?? "G"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{gerant.prenom} {gerant.nom}</span>
                  <span className="text-xs text-muted-foreground">{nbSessions} sessions</span>
                  <span className="text-xs font-medium text-primary">{revenu.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
