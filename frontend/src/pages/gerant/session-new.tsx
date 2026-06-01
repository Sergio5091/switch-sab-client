import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, User, Tag, Clock, Monitor, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function GerantSessionNew() {
  const { currentUser, postes, clients, categories, dureesPrix, sessions, addSession } = useApp();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const salleId = currentUser?.salleId ?? 1;

  const [clientId, setClientId] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [dureeId, setDureeId] = useState("");
  const [posteId, setPosteId] = useState("");

  const myClients = clients.filter(c => c.salleId === salleId);
  const myCategories = categories.filter(c => c.salleId === salleId);
  const myPostes = postes.filter(p => p.salleId === salleId && p.actif);

  const catDurees = dureesPrix.filter(d => d.categorieId === Number(categorieId));

  const freePostes = myPostes.filter(p =>
    p.categorieId === Number(categorieId) &&
    !sessions.some(s => s.posteId === p.id && s.actif)
  );

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const selectedDuree = dureesPrix.find(d => d.id === Number(dureeId));
  const selectedPoste = postes.find(p => p.id === Number(posteId));
  const selectedCat = categories.find(c => c.id === Number(categorieId));

  function handleStart() {
    if (!clientId || !categorieId || !dureeId || !posteId) {
      toast({ title: "Remplir tous les champs", variant: "destructive" });
      return;
    }
    if (!selectedClient || !selectedDuree) return;

    addSession({
      clientId: Number(clientId),
      posteId: Number(posteId),
      gerantId: currentUser!.id,
      dureeAchetee: selectedDuree.duree,
      dureeMinutes: selectedDuree.dureeMinutes,
      heureDebut: new Date().toISOString(),
      heureFin: null,
      montant: selectedDuree.prix,
      estBonus: false,
      salleId,
      actif: true,
      secondsRemaining: selectedDuree.dureeMinutes * 60,
    });

    toast({
      title: "Session démarrée",
      description: `${selectedClient.pseudo} — Poste ${selectedPoste?.numero} — ${selectedDuree.duree}`,
    });
    setLocation("/gerant/dashboard");
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-foreground">Nouvelle session</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Démarrer une session pour un client</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><User size={13} /> Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-client">
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {myClients.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.pseudo} — {c.creditMonetaire.toLocaleString()} F
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm"><Tag size={13} /> Catégorie</Label>
            <Select value={categorieId} onValueChange={v => { setCategorieId(v); setDureeId(""); setPosteId(""); }}>
              <SelectTrigger data-testid="select-categorie-session">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {myCategories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.couleur }} />
                      {c.nom}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {categorieId && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Clock size={13} /> Durée</Label>
              <div className="grid grid-cols-3 gap-2">
                {catDurees.sort((a, b) => a.dureeMinutes - b.dureeMinutes).map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDureeId(String(d.id))}
                    className={`p-3 rounded-xl border text-sm transition-all ${dureeId === String(d.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-foreground hover:border-primary/30"}`}
                    data-testid={`button-duree-${d.id}`}
                  >
                    <div className="font-bold">{d.duree}</div>
                    <div className="text-xs mt-0.5 opacity-70">{d.prix.toLocaleString()} F</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {categorieId && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Monitor size={13} /> Poste disponible ({freePostes.length})</Label>
              <div className="grid grid-cols-4 gap-2">
                {freePostes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPosteId(String(p.id))}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${posteId === String(p.id) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-foreground hover:border-primary/30"}`}
                    data-testid={`button-poste-${p.id}`}
                  >
                    {p.numero}
                  </button>
                ))}
                {freePostes.length === 0 && (
                  <div className="col-span-4 text-xs text-muted-foreground text-center py-2">Aucun poste libre dans cette catégorie</div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedClient && selectedDuree && selectedPoste && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Récapitulatif</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground"><User size={12} />{selectedClient.pseudo}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Tag size={12} />{selectedCat?.nom}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Clock size={12} />{selectedDuree.duree}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Monitor size={12} />Poste {selectedPoste.numero}</div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                <DollarSign size={14} className="text-primary" />
                <span className="text-primary font-bold text-lg">{selectedDuree.prix.toLocaleString()} F</span>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2 font-semibold"
            disabled={!clientId || !categorieId || !dureeId || !posteId}
            onClick={handleStart}
            data-testid="button-start-session"
          >
            <Play size={16} /> Démarrer la session
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
