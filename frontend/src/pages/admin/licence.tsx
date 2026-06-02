import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { axiosInstance } from "@/lib/axios";

export default function LicencePage() {
  const [, setLocation] = useLocation();
  const { checkLicenceStatut, licenceStatut, currentUser } = useApp();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jsonContent, setJsonContent] = useState<any>(null);

  // Rediriger vers le dashboard si la licence est déjà valide
  useEffect(() => {
    if (licenceStatut?.statut === "ACTIVE" && currentUser) {
      const dest = currentUser.role === "admin" ? "/admin/dashboard"
        : currentUser.role === "gerant" ? "/gerant/dashboard"
        : "/client/home";
      setLocation(dest);
    }
  }, [licenceStatut, currentUser, setLocation]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      setError("Le fichier doit être au format JSON");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setJsonContent(json);
        setError("");
      } catch (err) {
        setError("Fichier JSON invalide");
        setJsonContent(null);
      }
    };
    reader.readAsText(file);
  };

  const onSubmit = async () => {
    if (!jsonContent) {
      setError("Veuillez importer un fichier de licence");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await axiosInstance.post("/licence/activer", jsonContent);
      await checkLicenceStatut();
      toast({ title: "Licence activée avec succès" });
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setLoading(false);
      const message = err.response?.data?.message || "Erreur lors de l'activation de la licence";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">Activation de licence</h1>
            <p className="text-sm text-muted-foreground">
              Importez le fichier JSON de licence généré par le Super Admin.
            </p>
          </div>

          {licenceStatut && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Statut actuel</span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    licenceStatut.statut === "ACTIVE"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {licenceStatut.statut}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Machine ID: <span className="font-mono">{licenceStatut.machineId}</span>
              </div>
              {licenceStatut.joursRestants > 0 && (
                <div className="text-xs text-muted-foreground">
                  {licenceStatut.joursRestants} jour(s) restant(s)
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-3">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="licence-file"
                data-testid="input-licence-file"
              />
              <label
                htmlFor="licence-file"
                className="flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="text-primary" size={20} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {jsonContent ? "Fichier chargé" : "Importer le fichier JSON"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cliquez pour sélectionner ou glissez le fichier
                  </div>
                </div>
              </label>
            </div>

            {jsonContent && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileJson size={16} className="text-primary" />
                  Aperçu de la licence
                </div>
                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                  <div>ID: {jsonContent.licenceId}</div>
                  <div>Salle: {jsonContent.salleId}</div>
                  <div>Machine: {jsonContent.machineId}</div>
                  <div>Expire: {new Date(jsonContent.expiresAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-3 py-2.5 text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={onSubmit}
              className="w-full h-11 font-semibold text-base gap-2"
              disabled={loading || !jsonContent}
              data-testid="button-activer-licence"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Activation...
                </span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Activer la licence
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}