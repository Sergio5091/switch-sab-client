import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Gift, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import api from "@/services/api";

interface Session {
  id: number;
  debut: string;
  fin?: string;
  tempsRestant: number;
  statut: string;
  estBonus: boolean;
  client: { id: number; pseudo: string };
  gerant: { id: number; nom?: string; prenom?: string };
  poste: { id: number; nom: string };
  duree: { id: number; libelle: string; secondes: number; prix: number };
}

interface Recharge {
  id: number;
  montant: number;
  date: string;
  client: { id: number; pseudo: string; telephone: string };
}

interface Gerant { id: number; nom?: string; prenom?: string }
interface Poste  { id: number; nom: string }

export default function AdminRapports() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [total, setTotal] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [gerants, setGerants] = useState<Gerant[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(false);

  const [filtreGerant, setFiltreGerant] = useState("all");
  const [filtrePoste, setFiltrePoste] = useState("all");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Charger gérants et postes une seule fois au montage
  useEffect(() => {
    api.get('/rapports?_init=1').then(res => {
      setGerants(res.data.gerants ?? []);
      setPostes(res.data.postes ?? []);
      setSessions(res.data.sessions ?? []);
      setRecharges(res.data.recharges ?? []);
      setTotal(res.data.total ?? 0);
      setTotalSessions(res.data.totalSessions ?? 0);
    }).catch(() => toast({ title: "Erreur chargement rapports", variant: "destructive" }));
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtreGerant !== "all") params.set("gerantId", filtreGerant);
    if (filtrePoste  !== "all") params.set("posteId",  filtrePoste);
    if (dateDebut) params.set("debut", dateDebut);
    if (dateFin)   params.set("fin",   dateFin);

    try {
      const res = await api.get(`/rapports?${params.toString()}`);
      setSessions(res.data.sessions ?? []);
      setRecharges(res.data.recharges ?? []);
      setTotal(res.data.total ?? 0);
      setTotalSessions(res.data.totalSessions ?? 0);
      if (res.data.gerants?.length) setGerants(res.data.gerants);
      if (res.data.postes?.length)  setPostes(res.data.postes);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur chargement rapports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filtreGerant, filtrePoste, dateDebut, dateFin]);

  // Re-fetch uniquement quand les filtres changent (pas au montage initial)
  useEffect(() => {
    if (filtreGerant === "all" && filtrePoste === "all" && !dateDebut && !dateFin) return;
    fetchSessions();
  }, [filtreGerant, filtrePoste, dateDebut, dateFin]);

  function handleExport() {
    const rows = sessions.map(s =>
      `${s.client.pseudo},${s.debut},${s.fin ?? ""},${s.duree.libelle},${s.duree.prix},${s.poste.nom},${s.gerant.prenom ?? ""} ${s.gerant.nom ?? ""},${s.estBonus ? "Bonus" : "Normal"}`
    );
    const csv = ["Client,Début,Fin,Durée,Montant,Poste,Gérant,Type", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "rapport_switch_sab.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV téléchargé" });
  }

  async function handleEnvoyerEmail() {
    setSendingEmail(true);
    try {
      await api.post('/rapports/envoyer-email', {
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
      toast({ title: "Rapport envoyé par email au propriétaire" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur envoi email", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Rapports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {recharges.length} recharge(s) · <span className="text-green-400 font-semibold">{total.toLocaleString()} F encaissés</span>
              <span className="mx-1">·</span>
              {sessions.length} session(s)
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-1.5" data-testid="button-export-csv">
            <Download size={15} /> Exporter CSV
          </Button>
          <Button variant="outline" onClick={handleEnvoyerEmail} disabled={sendingEmail} className="gap-1.5" data-testid="button-send-email">
            <Mail size={15} /> {sendingEmail ? "Envoi…" : "Envoyer au propriétaire"}
          </Button>
        </div>

        {/* Filtres */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Gérant</label>
              <Select value={filtreGerant} onValueChange={setFiltreGerant}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-filtre-gerant"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les gérants</SelectItem>
                  {gerants.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.prenom} {g.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Poste</label>
              <Select value={filtrePoste} onValueChange={setFiltrePoste}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-filtre-poste"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les postes</SelectItem>
                  {postes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>)}
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
          {(filtreGerant !== "all" || filtrePoste !== "all" || dateDebut || dateFin) && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                setFiltreGerant("all");
                setFiltrePoste("all");
                setDateDebut("");
                setDateFin("");
              }}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>

        {/* Table Sessions */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Sessions ({sessions.length})</h2>
            <span className="ml-auto text-xs text-muted-foreground">Indicateur d'activité — non financier</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Client", "Début", "Durée", "Poste", "Gérant", "Statut", "Type"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Chargement…</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune session trouvée</td></tr>
                ) : sessions.map(s => (
                  <tr key={s.id} className={cn("hover:bg-muted/20 transition-colors", s.estBonus && "bg-primary/5")} data-testid={`row-session-${s.id}`}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.client.pseudo}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.debut), "dd MMM · HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-xs">{s.duree.libelle}</td>
                    <td className="px-4 py-3 text-xs">{s.poste.nom}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.gerant.prenom} {s.gerant.nom}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs",
                        s.statut === "ACTIVE"   ? "bg-green-500/10 text-green-400" :
                        s.statut === "ARRETEE"  ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {s.statut === "ACTIVE" ? "En cours" : s.statut === "ARRETEE" ? "En pause" : "Terminée"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.estBonus
                        ? <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1"><Gift size={9} /> Bonus</Badge>
                        : <Badge className="bg-muted text-muted-foreground text-xs">Normal</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Recharges */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Recharges ({recharges.length})</h2>
            <span className="ml-auto text-sm font-bold text-green-400">{total.toLocaleString()} F encaissés</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Client", "Téléphone", "Date", "Montant"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Chargement…</td></tr>
                ) : recharges.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune recharge trouvée</td></tr>
                ) : recharges.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.client.pseudo}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.client.telephone}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(r.date), "dd MMM · HH:mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-400">+{r.montant.toLocaleString()} F</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-muted-foreground">TOTAL ENCAISSÉ</td>
                  <td className="px-4 py-3 text-base font-bold text-green-400">{total.toLocaleString()} F</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
