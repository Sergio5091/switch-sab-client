import { useState, useEffect } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, Wifi, Usb, Save, AlertCircle, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

// Même liste que setup/salle.tsx
const PAYS_LISTE = [
  { nom: "Afghanistan", code: "AF" }, { nom: "Afrique du Sud", code: "ZA" },
  { nom: "Algérie", code: "DZ" }, { nom: "Allemagne", code: "DE" },
  { nom: "Angola", code: "AO" }, { nom: "Arabie Saoudite", code: "SA" },
  { nom: "Argentine", code: "AR" }, { nom: "Australie", code: "AU" },
  { nom: "Autriche", code: "AT" }, { nom: "Belgique", code: "BE" },
  { nom: "Bénin", code: "BJ" }, { nom: "Bolivie", code: "BO" },
  { nom: "Botswana", code: "BW" }, { nom: "Brésil", code: "BR" },
  { nom: "Burkina Faso", code: "BF" }, { nom: "Burundi", code: "BI" },
  { nom: "Cameroun", code: "CM" }, { nom: "Canada", code: "CA" },
  { nom: "Cap-Vert", code: "CV" }, { nom: "Chili", code: "CL" },
  { nom: "Chine", code: "CN" }, { nom: "Colombie", code: "CO" },
  { nom: "Comores", code: "KM" }, { nom: "Congo", code: "CG" },
  { nom: "Congo (RDC)", code: "CD" }, { nom: "Corée du Sud", code: "KR" },
  { nom: "Costa Rica", code: "CR" }, { nom: "Côte d'Ivoire", code: "CI" },
  { nom: "Danemark", code: "DK" }, { nom: "Djibouti", code: "DJ" },
  { nom: "Égypte", code: "EG" }, { nom: "Émirats Arabes Unis", code: "AE" },
  { nom: "Espagne", code: "ES" }, { nom: "États-Unis", code: "US" },
  { nom: "Éthiopie", code: "ET" }, { nom: "Finlande", code: "FI" },
  { nom: "France", code: "FR" }, { nom: "Gabon", code: "GA" },
  { nom: "Gambie", code: "GM" }, { nom: "Ghana", code: "GH" },
  { nom: "Grèce", code: "GR" }, { nom: "Guinée", code: "GN" },
  { nom: "Guinée-Bissau", code: "GW" }, { nom: "Guinée équatoriale", code: "GQ" },
  { nom: "Haïti", code: "HT" }, { nom: "Inde", code: "IN" },
  { nom: "Indonésie", code: "ID" }, { nom: "Irlande", code: "IE" },
  { nom: "Italie", code: "IT" }, { nom: "Japon", code: "JP" },
  { nom: "Kenya", code: "KE" }, { nom: "Liban", code: "LB" },
  { nom: "Liberia", code: "LR" }, { nom: "Libye", code: "LY" },
  { nom: "Madagascar", code: "MG" }, { nom: "Malawi", code: "MW" },
  { nom: "Mali", code: "ML" }, { nom: "Malaisie", code: "MY" },
  { nom: "Maroc", code: "MA" }, { nom: "Maurice", code: "MU" },
  { nom: "Mauritanie", code: "MR" }, { nom: "Mexique", code: "MX" },
  { nom: "Mozambique", code: "MZ" }, { nom: "Namibie", code: "NA" },
  { nom: "Niger", code: "NE" }, { nom: "Nigéria", code: "NG" },
  { nom: "Norvège", code: "NO" }, { nom: "Nouvelle-Zélande", code: "NZ" },
  { nom: "Ouganda", code: "UG" }, { nom: "Pakistan", code: "PK" },
  { nom: "Pays-Bas", code: "NL" }, { nom: "Pérou", code: "PE" },
  { nom: "Philippines", code: "PH" }, { nom: "Pologne", code: "PL" },
  { nom: "Portugal", code: "PT" }, { nom: "Qatar", code: "QA" },
  { nom: "Roumanie", code: "RO" }, { nom: "Royaume-Uni", code: "GB" },
  { nom: "Russie", code: "RU" }, { nom: "Rwanda", code: "RW" },
  { nom: "Sénégal", code: "SN" }, { nom: "Sierra Leone", code: "SL" },
  { nom: "Singapour", code: "SG" }, { nom: "Somalie", code: "SO" },
  { nom: "Soudan", code: "SD" }, { nom: "Suède", code: "SE" },
  { nom: "Suisse", code: "CH" }, { nom: "Tanzanie", code: "TZ" },
  { nom: "Tchad", code: "TD" }, { nom: "Thaïlande", code: "TH" },
  { nom: "Togo", code: "TG" }, { nom: "Tunisie", code: "TN" },
  { nom: "Turquie", code: "TR" }, { nom: "Ukraine", code: "UA" },
  { nom: "Venezuela", code: "VE" }, { nom: "Vietnam", code: "VN" },
  { nom: "Zambie", code: "ZM" }, { nom: "Zimbabwe", code: "ZW" },
].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

const schema = z.object({
  nom:          z.string().min(2, "Nom requis"),
  indicatifPays: z.string().min(2, "Pays requis"),
  ville:        z.string().min(2, "Ville requise"),
  quartier:     z.string().min(2, "Quartier requis"),
  telephone:    z.string().min(6, "Téléphone requis"),
  switchType:   z.enum(["WIFI", "USB", "ZIGBEE", "MOCK"]),
  switchConfig: z.string().optional(),
}).refine(
  (data) => data.switchType !== "WIFI" || (!!data.switchConfig && data.switchConfig.trim().length > 0),
  { message: "L'adresse IP est requise pour le mode WIFI", path: ["switchConfig"] }
);

type FormValues = z.infer<typeof schema>;

export default function AdminSalle() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "", indicatifPays: "", ville: "", quartier: "",
      telephone: "", switchType: "WIFI", switchConfig: "",
    },
  });

  const switchType = form.watch("switchType");

  useEffect(() => {
    api.get('/admin/salle').then(r => {
      const s = r.data;
      form.reset({
        nom:          s.nom          ?? "",
        indicatifPays: s.indicatifPays ?? "",
        ville:        s.ville         ?? "",
        quartier:     s.quartier      ?? "",
        telephone:    s.telephone     ?? "",
        switchType:   s.switchType    ?? "WIFI",
        switchConfig: s.switchConfig  ?? "",
      });
    }).catch(() => toast({ title: "Erreur chargement config salle", variant: "destructive" }))
      .finally(() => setFetching(false));
  }, []);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await api.patch('/admin/salle', {
        ...values,
        pays: PAYS_LISTE.find(p => p.code === values.indicatifPays)?.nom ?? values.indicatifPays,
        switchConfig: values.switchType === "USB" ? (values.switchConfig || null) : values.switchConfig,
      });
      toast({ title: "Configuration mise à jour ✅" });
    } catch (err: any) {
      toast({ title: err.response?.data?.message ?? "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <AdminLayout>
        <div className="p-6 text-center text-muted-foreground text-sm">Chargement…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configuration de la salle</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Modifiez les informations et la configuration du switch réseau
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField control={form.control} name="nom" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la salle</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input {...field} className="pl-9 h-11" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="indicatifPays" render={({ field }) => (
              <FormItem>
                <FormLabel>Pays</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Sélectionner un pays…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {PAYS_LISTE.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="ville" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quartier" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quartier</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="telephone" render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone de la salle</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input {...field} className="pl-9 h-11" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Switch type */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Configuration du switch réseau</p>
              <FormField control={form.control} name="switchType" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { type: "WIFI",   label: "WIFI",   icon: <Wifi size={15} /> },
                        { type: "USB",    label: "USB",    icon: <Usb size={15} /> },
                        { type: "ZIGBEE", label: "Zigbee", icon: <Radio size={15} /> },
                      ] as const).map(({ type, label, icon }) => (
                        <button key={type} type="button" onClick={() => field.onChange(type)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            field.value === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/30"
                          }`}>
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* switchConfig — masqué pour Zigbee (pas besoin d'IP, tout passe par MQTT) */}
              {switchType !== "ZIGBEE" && (
                <FormField control={form.control} name="switchConfig" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      {switchType === "WIFI" ? "Adresse IP du switch" : "Port COM (USB)"}
                      {switchType === "WIFI" && <span className="text-destructive text-xs">*</span>}
                      {switchType === "USB"  && <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={switchType === "WIFI" ? "192.168.1.100" : "COM3"}
                        className="h-11"
                      />
                    </FormControl>
                    {switchType === "WIFI" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle size={11} />
                        Adresse IP locale du switch sur le réseau de la salle
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* Info Zigbee */}
              {switchType === "ZIGBEE" && (
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                  <Radio size={14} className="text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Mode Zigbee — les prises sont pilotées via{" "}
                    <span className="font-medium text-foreground">Zigbee2MQTT + MQTT</span>.
                    Aucune adresse IP requise. Appairez les prises depuis{" "}
                    <span className="font-medium text-foreground">Admin → Postes</span>.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
              <Save size={15} />
              {loading ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
