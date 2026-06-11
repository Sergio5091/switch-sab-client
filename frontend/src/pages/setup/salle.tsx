import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Globe, MapPin, Phone, Wifi, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { axiosInstance } from "@/lib/axios";

const schema = z.object({
  nom:         z.string().min(2, "Nom requis (min 2 caractères)"),
  pays:        z.string().min(2, "Pays requis"),
  ville:       z.string().min(2, "Ville requise"),
  quartier:    z.string().min(2, "Quartier requis"),
  telephone:   z.string().min(8, "Téléphone requis"),
  switchType:  z.enum(["WIFI", "USB"]),
  switchConfig: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SetupSallePage() {
  const [, setLocation] = useLocation();
  const { currentUser, checkSetupStatut } = useApp();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Protéger la route : seul un admin connecté peut accéder
  if (!currentUser || currentUser.role !== "admin") {
    setLocation("/login");
    return null;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom:          "",
      pays:         "",
      ville:        "",
      quartier:     "",
      telephone:    "",
      switchType:   "WIFI",
      switchConfig: "",
    },
  });

  const switchType = form.watch("switchType");

  async function onSubmit(values: FormValues) {
    setError("");
    setLoading(true);
    try {
      await axiosInstance.post("/setup/salle", {
        ...values,
        switchConfig: values.switchConfig || undefined,
      });
      await checkSetupStatut();
      toast({ title: "Salle créée avec succès" });
      // Étape suivante : activer la licence
      setLocation("/admin/licence");
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || "Erreur lors de la création de la salle");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-7">

          {/* En-tête */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Configuration de la salle</h1>
                <p className="text-sm text-muted-foreground">Première installation — étape 1/2</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Renseignez les informations de votre salle. Cette étape n'est effectuée qu'une seule fois.
            </p>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-white">1</div>
              <span className="text-xs font-medium text-foreground">Salle</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-medium text-muted-foreground">2</div>
              <span className="text-xs text-muted-foreground">Licence</span>
            </div>
          </div>

          {/* Formulaire */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField control={form.control} name="nom" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la salle</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} placeholder="Ex: Gaming Zone Cotonou" className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="pays" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="Bénin" className="pl-9 h-11" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ville" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="Cotonou" className="pl-9 h-11" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="quartier" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quartier</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} placeholder="Ex: Akpakpa" className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="telephone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} placeholder="+229 0197000000" className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Type de switch */}
              <FormField control={form.control} name="switchType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de switch réseau</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-2">
                      {(["WIFI", "USB"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            field.value === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          <Wifi size={15} />
                          {type}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="switchConfig" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {switchType === "WIFI" ? "Adresse IP du switch" : "Port COM (USB)"}
                    <span className="text-muted-foreground ml-1 font-normal">(optionnel)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={switchType === "WIFI" ? "192.168.1.100" : "COM3"}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-base"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création en cours...
                  </span>
                ) : "Créer la salle et continuer →"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
