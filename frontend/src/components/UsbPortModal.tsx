/**
 * UsbPortModal — Modal de détection et sélection du port USB du switch
 *
 * Utilisé par :
 *  - Admin → Salle : bouton "Redétecter"
 *  - Gérant → Dashboard : déclenché automatiquement sur usb:deconnecte
 *
 * Props :
 *  open        — contrôle l'ouverture
 *  onClose     — appelé quand le modal se ferme (annulation ou succès)
 *  onSuccess   — appelé après une configuration réussie avec le nouveau port
 *  nbRelais    — nombre de relais actuel (nécessaire pour POST /usb/configurer)
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Loader2, Usb, AlertTriangle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface Candidat {
  path: string;
  vendorId: string;
  manufacturer: string | null;
  serialNumber?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (portPath: string) => void;
  nbRelais: number | null;
  portActuel?: string | null;
  /** Préfixe de route à utiliser. Admin = '/admin', Gérant = '/gerant' */
  routePrefix?: string;
}

export default function UsbPortModal({ open, onClose, onSuccess, nbRelais, portActuel, routePrefix = '/admin' }: Props) {
  const { toast } = useToast();
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [portChoisi, setPortChoisi] = useState<string>('');
  const [saisieManuelle, setSaisieManuelle] = useState<string>('');
  const [detectDone, setDetectDone] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset à la fermeture
      setCandidats([]);
      setPortChoisi('');
      setSaisieManuelle('');
      setDetectDone(false);
      onClose();
    }
  }

  async function handleDetecter() {
    setDetecting(true);
    setCandidats([]);
    setPortChoisi('');
    setDetectDone(false);
    try {
      const res = await api.get(`${routePrefix}/usb/detecter`);
      const data = res.data;
      setDetectDone(true);
      if (data.detecte && data.port) {
        setPortChoisi(data.port);
        setCandidats(data.candidats ?? [{ path: data.port, vendorId: data.vendorId, manufacturer: data.manufacturer }]);
      } else {
        setCandidats(data.candidats ?? []);
      }
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Aucun périphérique détecté", variant: "destructive" });
      setDetectDone(true);
    } finally {
      setDetecting(false);
    }
  }

  async function handleSauvegarder() {
    const port = portChoisi || saisieManuelle;
    if (!port) return;

    setSaving(true);
    try {
      await api.post(`${routePrefix}/usb/configurer`, {
        portPath: port,
        nbRelais: nbRelais ?? 4,
      });
      toast({ title: `Switch configuré sur ${port} ✅` });
      onSuccess(port);
      handleOpenChange(false);
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const portFinal = portChoisi || saisieManuelle;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Usb size={18} className="text-primary" />
            Configurer le port du switch USB
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Port actuel */}
          {portActuel && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs">
              <span className="text-muted-foreground">Port actuel :</span>
              <span className="font-mono font-semibold text-foreground">{portActuel}</span>
            </div>
          )}

          {/* Bouton détecter */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={detecting}
            onClick={handleDetecter}
          >
            {detecting
              ? <><Loader2 size={15} className="animate-spin" /> Détection en cours…</>
              : <><Search size={15} /> Détecter le switch USB</>
            }
          </Button>

          {/* 1 seul candidat — confirmation automatique */}
          {detectDone && candidats.length === 1 && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
              <div>
                <span className="text-sm font-mono font-semibold text-green-500">{candidats[0].path}</span>
                {candidats[0].manufacturer && (
                  <span className="text-xs text-muted-foreground ml-2">({candidats[0].manufacturer})</span>
                )}
              </div>
            </div>
          )}

          {/* Plusieurs candidats */}
          {detectDone && candidats.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Plusieurs périphériques détectés — choisissez le switch :
              </p>
              {candidats.map(c => (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => setPortChoisi(c.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    portChoisi === c.path
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="font-mono font-semibold">{c.path}</span>
                  {c.manufacturer && <span className="text-xs">— {c.manufacturer}</span>}
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">VID:{c.vendorId}</span>
                </button>
              ))}
            </div>
          )}

          {/* Aucun détecté — saisie manuelle */}
          {detectDone && candidats.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-500" />
                Aucun périphérique USB-série détecté. Vérifiez le branchement ou saisissez le port manuellement :
              </p>
              <Input
                value={saisieManuelle}
                onChange={e => setSaisieManuelle(e.target.value)}
                placeholder="ex: COM3 ou /dev/ttyUSB0"
                className="h-9 font-mono text-sm"
              />
            </div>
          )}

          {/* Bouton confirmer — visible quand un port est sélectionné */}
          {portFinal && (
            <Button
              type="button"
              className="w-full gap-2"
              disabled={saving}
              onClick={handleSauvegarder}
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                : <><Save size={15} /> Utiliser le port {portFinal}</>
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
