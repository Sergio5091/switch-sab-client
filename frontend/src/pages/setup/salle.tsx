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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Phone, Wifi, AlertCircle, Usb, Search, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { axiosInstance } from "@/lib/axios";

// Liste pays du monde avec code ISO et indicatif (principaux pays)
const PAYS_LISTE = [
  { nom: "Afghanistan", code: "AF", indicatif: "+93" },
  { nom: "Afrique du Sud", code: "ZA", indicatif: "+27" },
  { nom: "Albanie", code: "AL", indicatif: "+355" },
  { nom: "Algérie", code: "DZ", indicatif: "+213" },
  { nom: "Allemagne", code: "DE", indicatif: "+49" },
  { nom: "Angola", code: "AO", indicatif: "+244" },
  { nom: "Arabie Saoudite", code: "SA", indicatif: "+966" },
  { nom: "Argentine", code: "AR", indicatif: "+54" },
  { nom: "Australie", code: "AU", indicatif: "+61" },
  { nom: "Autriche", code: "AT", indicatif: "+43" },
  { nom: "Bénin", code: "BJ", indicatif: "+229" },
  { nom: "Belgique", code: "BE", indicatif: "+32" },
  { nom: "Bolivie", code: "BO", indicatif: "+591" },
  { nom: "Botswana", code: "BW", indicatif: "+267" },
  { nom: "Brésil", code: "BR", indicatif: "+55" },
  { nom: "Bulgarie", code: "BG", indicatif: "+359" },
  { nom: "Burkina Faso", code: "BF", indicatif: "+226" },
  { nom: "Burundi", code: "BI", indicatif: "+257" },
  { nom: "Cameroun", code: "CM", indicatif: "+237" },
  { nom: "Canada", code: "CA", indicatif: "+1" },
  { nom: "Cap-Vert", code: "CV", indicatif: "+238" },
  { nom: "Chili", code: "CL", indicatif: "+56" },
  { nom: "Chine", code: "CN", indicatif: "+86" },
  { nom: "Chypre", code: "CY", indicatif: "+357" },
  { nom: "Colombie", code: "CO", indicatif: "+57" },
  { nom: "Comores", code: "KM", indicatif: "+269" },
  { nom: "Congo", code: "CG", indicatif: "+242" },
  { nom: "Congo (RDC)", code: "CD", indicatif: "+243" },
  { nom: "Corée du Sud", code: "KR", indicatif: "+82" },
  { nom: "Costa Rica", code: "CR", indicatif: "+506" },
  { nom: "Côte d'Ivoire", code: "CI", indicatif: "+225" },
  { nom: "Croatie", code: "HR", indicatif: "+385" },
  { nom: "Cuba", code: "CU", indicatif: "+53" },
  { nom: "Danemark", code: "DK", indicatif: "+45" },
  { nom: "Djibouti", code: "DJ", indicatif: "+253" },
  { nom: "Égypte", code: "EG", indicatif: "+20" },
  { nom: "Émirats Arabes Unis", code: "AE", indicatif: "+971" },
  { nom: "Équateur", code: "EC", indicatif: "+593" },
  { nom: "Érythrée", code: "ER", indicatif: "+291" },
  { nom: "Espagne", code: "ES", indicatif: "+34" },
  { nom: "Estonie", code: "EE", indicatif: "+372" },
  { nom: "Éthiopie", code: "ET", indicatif: "+251" },
  { nom: "États-Unis", code: "US", indicatif: "+1" },
  { nom: "Finlande", code: "FI", indicatif: "+358" },
  { nom: "France", code: "FR", indicatif: "+33" },
  { nom: "Gabon", code: "GA", indicatif: "+241" },
  { nom: "Gambie", code: "GM", indicatif: "+220" },
  { nom: "Ghana", code: "GH", indicatif: "+233" },
  { nom: "Grèce", code: "GR", indicatif: "+30" },
  { nom: "Guatemala", code: "GT", indicatif: "+502" },
  { nom: "Guinée", code: "GN", indicatif: "+224" },
  { nom: "Guinée-Bissau", code: "GW", indicatif: "+245" },
  { nom: "Guinée équatoriale", code: "GQ", indicatif: "+240" },
  { nom: "Haïti", code: "HT", indicatif: "+509" },
  { nom: "Honduras", code: "HN", indicatif: "+504" },
  { nom: "Hongrie", code: "HU", indicatif: "+36" },
  { nom: "Inde", code: "IN", indicatif: "+91" },
  { nom: "Indonésie", code: "ID", indicatif: "+62" },
  { nom: "Irak", code: "IQ", indicatif: "+964" },
  { nom: "Iran", code: "IR", indicatif: "+98" },
  { nom: "Irlande", code: "IE", indicatif: "+353" },
  { nom: "Islande", code: "IS", indicatif: "+354" },
  { nom: "Israël", code: "IL", indicatif: "+972" },
  { nom: "Italie", code: "IT", indicatif: "+39" },
  { nom: "Jamaïque", code: "JM", indicatif: "+1876" },
  { nom: "Japon", code: "JP", indicatif: "+81" },
  { nom: "Jordanie", code: "JO", indicatif: "+962" },
  { nom: "Kenya", code: "KE", indicatif: "+254" },
  { nom: "Kirghizstan", code: "KG", indicatif: "+996" },
  { nom: "Laos", code: "LA", indicatif: "+856" },
  { nom: "Lesotho", code: "LS", indicatif: "+266" },
  { nom: "Lettonie", code: "LV", indicatif: "+371" },
  { nom: "Liban", code: "LB", indicatif: "+961" },
  { nom: "Liberia", code: "LR", indicatif: "+231" },
  { nom: "Libye", code: "LY", indicatif: "+218" },
  { nom: "Lituanie", code: "LT", indicatif: "+370" },
  { nom: "Luxembourg", code: "LU", indicatif: "+352" },
  { nom: "Madagascar", code: "MG", indicatif: "+261" },
  { nom: "Malawi", code: "MW", indicatif: "+265" },
  { nom: "Mali", code: "ML", indicatif: "+223" },
  { nom: "Malaisie", code: "MY", indicatif: "+60" },
  { nom: "Maroc", code: "MA", indicatif: "+212" },
  { nom: "Maurice", code: "MU", indicatif: "+230" },
  { nom: "Mauritanie", code: "MR", indicatif: "+222" },
  { nom: "Mexique", code: "MX", indicatif: "+52" },
  { nom: "Moldavie", code: "MD", indicatif: "+373" },
  { nom: "Mozambique", code: "MZ", indicatif: "+258" },
  { nom: "Myanmar", code: "MM", indicatif: "+95" },
  { nom: "Namibie", code: "NA", indicatif: "+264" },
  { nom: "Népal", code: "NP", indicatif: "+977" },
  { nom: "Nicaragua", code: "NI", indicatif: "+505" },
  { nom: "Niger", code: "NE", indicatif: "+227" },
  { nom: "Nigéria", code: "NG", indicatif: "+234" },
  { nom: "Norvège", code: "NO", indicatif: "+47" },
  { nom: "Nouvelle-Zélande", code: "NZ", indicatif: "+64" },
  { nom: "Ouganda", code: "UG", indicatif: "+256" },
  { nom: "Pakistan", code: "PK", indicatif: "+92" },
  { nom: "Panama", code: "PA", indicatif: "+507" },
  { nom: "Paraguay", code: "PY", indicatif: "+595" },
  { nom: "Pays-Bas", code: "NL", indicatif: "+31" },
  { nom: "Pérou", code: "PE", indicatif: "+51" },
  { nom: "Philippines", code: "PH", indicatif: "+63" },
  { nom: "Pologne", code: "PL", indicatif: "+48" },
  { nom: "Portugal", code: "PT", indicatif: "+351" },
  { nom: "Qatar", code: "QA", indicatif: "+974" },
  { nom: "Roumanie", code: "RO", indicatif: "+40" },
  { nom: "Royaume-Uni", code: "GB", indicatif: "+44" },
  { nom: "Russie", code: "RU", indicatif: "+7" },
  { nom: "Rwanda", code: "RW", indicatif: "+250" },
  { nom: "Sao Tomé-et-Principe", code: "ST", indicatif: "+239" },
  { nom: "Sénégal", code: "SN", indicatif: "+221" },
  { nom: "Sierra Leone", code: "SL", indicatif: "+232" },
  { nom: "Singapour", code: "SG", indicatif: "+65" },
  { nom: "Slovaquie", code: "SK", indicatif: "+421" },
  { nom: "Somalie", code: "SO", indicatif: "+252" },
  { nom: "Soudan", code: "SD", indicatif: "+249" },
  { nom: "Sri Lanka", code: "LK", indicatif: "+94" },
  { nom: "Suède", code: "SE", indicatif: "+46" },
  { nom: "Suisse", code: "CH", indicatif: "+41" },
  { nom: "Syrie", code: "SY", indicatif: "+963" },
  { nom: "Taïwan", code: "TW", indicatif: "+886" },
  { nom: "Tanzanie", code: "TZ", indicatif: "+255" },
  { nom: "Tchad", code: "TD", indicatif: "+235" },
  { nom: "Thaïlande", code: "TH", indicatif: "+66" },
  { nom: "Togo", code: "TG", indicatif: "+228" },
  { nom: "Tunisie", code: "TN", indicatif: "+216" },
  { nom: "Turquie", code: "TR", indicatif: "+90" },
  { nom: "Ukraine", code: "UA", indicatif: "+380" },
  { nom: "Uruguay", code: "UY", indicatif: "+598" },
  { nom: "Venezuela", code: "VE", indicatif: "+58" },
  { nom: "Vietnam", code: "VN", indicatif: "+84" },
  { nom: "Yémen", code: "YE", indicatif: "+967" },
  { nom: "Zambie", code: "ZM", indicatif: "+260" },
  { nom: "Zimbabwe", code: "ZW", indicatif: "+263" },
].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

const schema = z.object({
  nom:          z.string().min(2, "Nom requis (min 2 caractères)"),
  paysCode:     z.string().min(2, "Pays requis"),
  ville:        z.string().min(2, "Ville requise"),
  quartier:     z.string().min(2, "Quartier requis"),
  telephone:    z.string().min(8, "Téléphone requis"),
  switchType:   z.enum(["WIFI", "USB", "ZIGBEE"]),
  switchConfig: z.string().optional(),
}).refine(
  (data) => data.switchType !== "WIFI" || (!!data.switchConfig && data.switchConfig.trim().length > 0),
  { message: "L'adresse IP est requise pour le mode WIFI", path: ["switchConfig"] }
);

type FormValues = z.infer<typeof schema>;

export default function SetupSallePage() {
  const [, setLocation] = useLocation();
  const { currentUser, checkSetupStatut, logout } = useApp();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── USB : état de la détection ──────────────────────────────────────────────
  const [usbDetecting, setUsbDetecting] = useState(false);
  const [usbCandidats, setUsbCandidats] = useState<
    { path: string; vendorId: string; manufacturer: string | null }[]
  >([]);
  const [usbPortChoisi, setUsbPortChoisi] = useState<string>('');
  const [usbNbRelais, setUsbNbRelais] = useState<string>('');

  if (!currentUser || currentUser.role !== "admin") {
    setLocation("/login");
    return null;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom:          "",
      paysCode:     "",
      ville:        "",
      quartier:     "",
      telephone:    "",
      switchType:   "WIFI" as const,
      switchConfig: "",
    },
  });

  const switchType = form.watch("switchType");
  const paysCode = form.watch("paysCode");
  const paysSelectionne = PAYS_LISTE.find(p => p.code === paysCode);

  // ── Détection automatique du switch USB ────────────────────────────────────
  async function handleUsbDetecter() {
    setUsbDetecting(true);
    setUsbCandidats([]);
    setUsbPortChoisi('');
    try {
      const res = await axiosInstance.get('/admin/usb/detecter');
      const data = res.data;
      if (data.detecte && data.port) {
        setUsbPortChoisi(data.port);
        setUsbCandidats(data.candidats ?? [{ path: data.port, vendorId: data.vendorId, manufacturer: data.manufacturer }]);
        toast({ title: `Switch détecté : ${data.port}` });
      } else {
        setUsbCandidats(data.candidats ?? []);
        if ((data.candidats ?? []).length > 1) {
          toast({ title: `${data.candidats.length} périphériques trouvés — choisissez le bon` });
        }
      }
    } catch (err: any) {
      toast({
        title: err.response?.data?.message ?? "Erreur de détection",
        variant: "destructive"
      });
    } finally {
      setUsbDetecting(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setError("");
    setLoading(true);
    const pays = PAYS_LISTE.find(p => p.code === values.paysCode);
    try {
      const response = await axiosInstance.post("/setup/salle", {
        nom:           values.nom,
        pays:          pays?.nom ?? values.paysCode,
        indicatifPays: values.paysCode,
        ville:         values.ville,
        quartier:      values.quartier,
        telephone:     values.telephone,
        switchType:    values.switchType,
        switchConfig:  values.switchConfig || undefined,
      });

      // Si mode USB et port+nbRelais renseignés, configurer immédiatement
      if (values.switchType === 'USB' && usbPortChoisi && usbNbRelais) {
        try {
          await axiosInstance.post('/admin/usb/configurer', {
            portPath: usbPortChoisi,
            nbRelais: Number(usbNbRelais),
          });
        } catch (_) {
          // Non bloquant — peut être reconfigurée depuis Admin → Paramètres
        }
      }

      await checkSetupStatut();

      if (response.data.requireReconnect) {
        toast({
          title: "Salle créée avec succès !",
          description: "Reconnectez-vous pour finaliser la configuration."
        });
        setTimeout(() => { logout(); setLocation("/login"); }, 1500);
      } else {
        toast({ title: "Salle créée avec succès" });
        setLocation("/admin/licence");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || "Erreur lors de la création de la salle");
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-7">

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

          {/* Étapes */}
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

              {/* Pays — select avec indicatif */}
              <FormField control={form.control} name="paysCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pays</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Sélectionner un pays…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {PAYS_LISTE.map(p => (
                          <SelectItem key={p.code} value={p.code}>
                            {p.nom} ({p.indicatif})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {paysSelectionne && (
                    <p className="text-xs text-muted-foreground">
                      Indicatif téléphonique : <span className="font-mono font-semibold text-foreground">{paysSelectionne.indicatif}</span> — les numéros locaux seront automatiquement préfixés
                    </p>
                  )}
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
                        <Input {...field} placeholder="Cotonou" className="pl-9 h-11" />
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
                        <Input {...field} placeholder="Akpakpa" className="pl-9 h-11" />
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
                      <Input {...field} placeholder={paysSelectionne ? `${paysSelectionne.indicatif} 97000000` : "+229 97000000"} className="pl-9 h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Switch */}
              <FormField control={form.control} name="switchType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de switch réseau</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-2">
                      {(["WIFI", "USB", "ZIGBEE"] as const).map((type) => (
                        <button key={type} type="button" onClick={() => field.onChange(type)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                            field.value === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/30"
                          }`}>
                          <Wifi size={15} /> {type}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {switchType === "ZIGBEE" && (
                    <p className="text-xs text-muted-foreground">
                      Les prises Zigbee seront appairées depuis Admin → Postes après la configuration.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── Zone WIFI : champ IP ── */}
              {switchType === "WIFI" && (
                <FormField control={form.control} name="switchConfig" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Adresse IP du switch
                      <span className="text-destructive ml-1 text-xs">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="192.168.1.100" className="h-11" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Adresse IP locale du switch sur le réseau de la salle
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* ── Zone USB : modèle + détection ── */}
              {switchType === "USB" && (
                <div className="space-y-3 border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Usb size={15} className="text-primary" />
                    Configuration du switch USB
                  </div>

                  {/* Nombre de relais du modèle */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Modèle de switch (nombre de relais)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {([2, 4, 8, 16, 32] as const).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setUsbNbRelais(String(n))}
                          className={`p-2.5 rounded-lg border text-sm font-mono font-semibold transition-all ${
                            usbNbRelais === String(n)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sélectionnez le nombre de relais de votre modèle Arduino
                    </p>
                  </div>

                  {/* Détection du port */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Port série
                      <span className="text-muted-foreground ml-1 font-normal text-xs">(détection automatique recommandée)</span>
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5 text-sm h-10 w-full"
                      disabled={usbDetecting}
                      onClick={handleUsbDetecter}
                    >
                      {usbDetecting
                        ? <><Loader2 size={14} className="animate-spin" /> Détection en cours…</>
                        : <><Search size={14} /> Détecter le switch USB</>
                      }
                    </Button>

                    {/* Un seul candidat — confirmation automatique */}
                    {usbCandidats.length === 1 && usbPortChoisi && (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                        <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-500 font-mono font-semibold">{usbPortChoisi}</span>
                        {usbCandidats[0].manufacturer && (
                          <span className="text-xs text-muted-foreground ml-1">({usbCandidats[0].manufacturer})</span>
                        )}
                      </div>
                    )}

                    {/* Plusieurs candidats — liste de sélection */}
                    {usbCandidats.length > 1 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-amber-500">
                          Plusieurs périphériques détectés — choisissez le switch :
                        </p>
                        {usbCandidats.map(c => (
                          <button
                            key={c.path}
                            type="button"
                            onClick={() => setUsbPortChoisi(c.path)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                              usbPortChoisi === c.path
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            <span className="font-mono font-semibold">{c.path}</span>
                            {c.manufacturer && <span className="text-muted-foreground">— {c.manufacturer}</span>}
                            <span className="ml-auto text-[10px] font-mono text-muted-foreground">VID:{c.vendorId}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Saisie manuelle si la détection ne trouve rien */}
                    {usbCandidats.length === 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Ou saisissez manuellement le port (ex: COM3, /dev/ttyUSB0)
                        </p>
                        <Input
                          value={usbPortChoisi}
                          onChange={e => setUsbPortChoisi(e.target.value)}
                          placeholder="COM3"
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground border-t border-border pt-2">
                    Le port et le modèle peuvent être modifiés depuis Admin → Paramètres → Switch après l'installation.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-3 py-2.5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-semibold text-base" disabled={loading}>
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
