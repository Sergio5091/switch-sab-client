import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, BarChart2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminRapports() {
  const { currentUser, sessions, clients, postes, utilisateurs } = useApp();
  const { toast } = useToast();
  const salleId = currentUser?.salleId ?? 1;

  const [filtreGerant, setFiltreGerant] = useState("all");
  const [filtrePoste, setFiltrePoste] = useState("all");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const myGerants = utilisateurs.filter(u => u.role === "gerant" && u.salleId === salleId);
  const myPostes = postes.filter(p => p.salleId === salleId);

  let filtered = sessions.filter(s => s.salleId === salleId);
  if (filtreGerant !== "all") filtered = filtered.filter(s => s.gerantId === Number(filtreGerant));
  if (filtrePoste !== "all") filtered = filtered.filter(s => s.posteId === Number(filtrePoste));
  if (dateDebut) filtered = filtered.filter(s => new Date(s.heureDebut) >= new Date(dateDebut));
  if (dateFin) filtered = filtered.filter(s => new Date(s.heureDebut) <= new Date(dateFin + "T23:59:59"));

  const total = filtered.reduce((sum, s) => sum + s.montant, 0);

  function handleExport() {
    const rows = filtered.map(s => {
      const client = clients.find(c => c.id === s.clientId);
      const poste = myPostes.find(p => p.id === s.posteId);
      const gerant = myGerants.find(g => g.id === s.gerantId);
      return `${client?.pseudo ?? ""},${s.heureDebut},${s.heureFin ?? ""},${s.dureeAchetee},${s.montant},${poste?.numero ?? ""},${gerant?.prenom ?? ""},${s.estBonus ? "Bonus" : "Normal"}`;
    });
    const csv = ["Client,Début,Fin,Durée,Montant,Poste,Gérant,Type", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rapport_switch_sab.csv"; a.click();
    toast({ title: "Export CSV téléchargé" });
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Rapports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} session(s)</p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-1.5" data-testid="button-export-csv">
            <Download size={15} /> Exporter CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Gérant</label>
              <Select value={filtreGerant} onValueChange={setFiltreGerant}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-filtre-gerant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {myGerants.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.prenom} {g.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Poste</label>
              <Select value={filtrePoste} onValueChange={setFiltrePoste}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-filtre-poste">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {myPostes.map(p => <SelectItem key={p.id} value={String(p.id)}>Poste {p.numero}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date début</label>
              <Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="h-8 text-xs" data-testid="input-date-debut" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Date fin</label>
              <Input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="h-8 text-xs" data-testid="input-date-fin" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Client", "Début", "Durée", "Montant", "Poste", "Gérant", "Type"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice().reverse().map(s => {
                  const client = clients.find(c => c.id === s.clientId);
                  const poste = myPostes.find(p => p.id === s.posteId);
                  const gerant = myGerants.find(g => g.id === s.gerantId);
                  return (
                    <tr key={s.id} className={cn("hover:bg-muted/20 transition-colors", s.estBonus && "bg-primary/5")} data-testid={`row-session-${s.id}`}>
                      <td className="px-4 py-3 font-medium text-foreground">{client?.pseudo ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(s.heureDebut), "dd MMM · HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-xs">{s.dureeAchetee}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{s.montant.toLocaleString()} F</td>
                      <td className="px-4 py-3 text-xs">P{poste?.numero ?? "?"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{gerant?.prenom ?? "—"}</td>
                      <td className="px-4 py-3">
                        {s.estBonus
                          ? <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1"><Gift size={9} /> Bonus</Badge>
                          : <Badge className="bg-muted text-muted-foreground text-xs">Normal</Badge>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground">TOTAL</td>
                  <td className="px-4 py-3 text-base font-bold text-primary">{total.toLocaleString()} F</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
