import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Monitor, Users, TrendingUp, Clock, Activity, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const { currentUser, postes, clients, sessions, utilisateurs, categories } = useApp();
  const salleId = currentUser?.salleId ?? 1;

  const myPostes = postes.filter(p => p.salleId === salleId);
  const activePostes = myPostes.filter(p => sessions.some(s => s.posteId === p.id && s.actif));
  const myClients = clients.filter(c => c.salleId === salleId);
  const myGerants = utilisateurs.filter(u => u.role === "gerant" && u.salleId === salleId);
  const todaySessions = sessions.filter(s => s.salleId === salleId);
  const todayRevenue = todaySessions.reduce((sum, s) => sum + s.montant, 0);
  const myCategories = categories.filter(c => c.salleId === salleId);

  const gerantActivity = myGerants.map(g => ({
    gerant: g,
    sessions: todaySessions.filter(s => s.gerantId === g.id),
  })).sort((a, b) => b.sessions.length - a.sessions.length);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{currentUser?.salleId ? `Salle ID ${currentUser.salleId}` : ""} — Aujourd'hui</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Sessions aujourd'hui", value: todaySessions.length, icon: Activity, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
            { label: "Revenu du jour", value: `${todayRevenue.toLocaleString()} F`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
            { label: "Postes actifs", value: `${activePostes.length}/${myPostes.length}`, icon: Monitor, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Clients", value: myClients.length, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
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
          {/* Categories overview */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Catégories</h2>
            </div>
            <div className="divide-y divide-border">
              {myCategories.map(cat => {
                const catPostes = myPostes.filter(p => p.categorieId === cat.id);
                const catActive = catPostes.filter(p => sessions.some(s => s.posteId === p.id && s.actif));
                return (
                  <div key={cat.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.couleur }} />
                    <span className="text-sm font-medium text-foreground flex-1">{cat.nom}</span>
                    <span className="text-xs text-muted-foreground">{catPostes.length} postes</span>
                    <span className="text-xs font-medium text-green-400">{catActive.length} actifs</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gérant leaderboard */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Activité des gérants</h2>
            </div>
            <div className="divide-y divide-border">
              {gerantActivity.map(({ gerant, sessions: gs }) => (
                <div key={gerant.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{gerant.prenom[0]}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{gerant.prenom} {gerant.nom}</span>
                  <span className="text-xs text-muted-foreground">{gs.length} sessions</span>
                  <span className="text-xs font-medium text-primary">{gs.reduce((s, x) => s + x.montant, 0).toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
