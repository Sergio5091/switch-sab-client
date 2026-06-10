import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, AlertCircle, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  identifiant: z.string().min(1, "Pseudo ou email requis"),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: "Admin", identifiant: "admin", color: "text-blue-500 dark:text-blue-400" },
  { label: "Gérant", identifiant: "gerant1", color: "text-green-500 dark:text-green-400" },
  { label: "Client", identifiant: "kofi", color: "text-purple-500 dark:text-purple-400" },
];

function Particle({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <div
      className="absolute w-1.5 h-1.5 rounded-full bg-primary/60 animate-twinkle"
      style={{ ...style, animationDelay: `${delay}s` }}
    />
  );
}

function HeroPanel() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-[#0f1729] to-slate-900 select-none">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.4) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute left-0 right-0 h-16 animate-scanline"
          style={{
            background: "linear-gradient(transparent, rgba(249,115,22,0.04), transparent)",
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[380px] h-[380px] rounded-full border border-primary/10 animate-pulse-ring2" />
        <div className="absolute w-[260px] h-[260px] rounded-full border border-primary/20 animate-pulse-ring" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-1 h-1 animate-orbit">
          <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
        </div>
        <div className="absolute w-1 h-1 animate-orbit2" style={{ animationDuration: "10s" }}>
          <div className="w-2 h-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
        </div>
        <div className="absolute w-1 h-1 animate-orbit3" style={{ animationDuration: "7s" }}>
          <div className="w-2.5 h-2.5 rounded-full bg-orange-300 shadow-lg shadow-orange-300/50" />
        </div>
      </div>
      {[
        { top: "18%", left: "20%", delay: 0 },
        { top: "25%", left: "75%", delay: 0.8 },
        { top: "60%", left: "15%", delay: 1.6 },
        { top: "70%", left: "80%", delay: 0.4 },
        { top: "40%", left: "88%", delay: 2.1 },
        { top: "82%", left: "40%", delay: 1.2 },
        { top: "12%", left: "55%", delay: 0.6 },
        { top: "50%", left: "7%", delay: 1.9 },
        { top: "88%", left: "65%", delay: 0.3 },
      ].map((p, i) => (
        <Particle key={i} style={{ top: p.top, left: p.left }} delay={p.delay} />
      ))}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="animate-float">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full scale-150" />
            <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <path d="M30 45 C15 45 8 55 8 70 C8 90 20 108 38 108 C50 108 55 100 80 100 C105 100 110 108 122 108 C140 108 152 90 152 70 C152 55 145 45 130 45 L110 42 C100 35 90 30 80 30 C70 30 60 35 50 42 Z" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.6)" strokeWidth="2" />
              <rect x="30" y="58" width="8" height="22" rx="2" fill="rgba(249,115,22,0.7)" />
              <rect x="22" y="66" width="24" height="8" rx="2" fill="rgba(249,115,22,0.7)" />
              <circle cx="118" cy="62" r="5" fill="rgba(59,130,246,0.7)" />
              <circle cx="130" cy="70" r="5" fill="rgba(249,115,22,0.7)" />
              <circle cx="118" cy="78" r="5" fill="rgba(34,197,94,0.7)" />
              <circle cx="106" cy="70" r="5" fill="rgba(239,68,68,0.7)" />
              <circle cx="50" cy="82" r="10" fill="rgba(255,255,255,0.1)" stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" />
              <circle cx="50" cy="82" r="5" fill="rgba(249,115,22,0.4)" />
              <circle cx="110" cy="52" r="10" fill="rgba(255,255,255,0.1)" stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" />
              <circle cx="110" cy="52" r="5" fill="rgba(249,115,22,0.4)" />
              <rect x="70" y="64" width="8" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
              <rect x="82" y="64" width="8" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
              <path d="M38 44 L55 40 L55 46 L38 46 Z" fill="rgba(249,115,22,0.4)" stroke="rgba(249,115,22,0.6)" strokeWidth="1" />
              <path d="M122 44 L105 40 L105 46 L122 46 Z" fill="rgba(249,115,22,0.4)" stroke="rgba(249,115,22,0.6)" strokeWidth="1" />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="text-4xl font-black text-white tracking-wider animate-glitch">
            SWITCH <span className="text-primary">SAB</span>
          </div>
          <div className="text-sm text-slate-400 tracking-widest uppercase">
            Gaming Hall Management
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Système actif</span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2">
          {[
            { label: "Salles", value: "3" },
            { label: "Postes", value: "12" },
            { label: "Clients", value: "250+" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-bold text-primary">{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />
    </div>
  );
}

export default function LoginPage() {
  const { login, currentUser } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    const dest = currentUser.role === "admin" ? "/admin/dashboard"
      : currentUser.role === "gerant" ? "/gerant/dashboard"
      : "/client/home";
    setLocation(dest);
    return null;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifiant: "", password: "admin123" },
  });

  function onSubmit(values: FormValues) {
    setError("");
    setLoading(true);
    login(values.identifiant, values.password)
      .then((result) => {
        setLoading(false);
        if (result.success && result.licenceRequired) {
          setLocation("/admin/licence");
        } else if (result.success) {
          toast({ title: "Connexion réussie" });
          // Redirection selon le rôle (currentUser est déjà mis à jour dans login())
          const user = JSON.parse(localStorage.getItem("switch_sab_user") || "{}");
          const dest = user.role === "admin" ? "/admin/dashboard"
            : user.role === "gerant" ? "/gerant/dashboard"
            : "/client/home";
          setLocation(dest);
        }
      })
      .catch((err) => {
        setLoading(false);
        const errorMessage = err.message || "Erreur de connexion. Vérifiez que le serveur est démarré.";
        setError(errorMessage);
      });
  }

  function fillDemo(identifiant: string) {
    form.setValue("identifiant", identifiant);
    form.setValue("password", "admin123");
    setError("");
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative">
        <HeroPanel />
      </div>
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 lg:opacity-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 10h4M8 8v4"/>
                <circle cx="16" cy="10" r="1" fill="white"/>
                <circle cx="19" cy="12" r="1" fill="white"/>
                <circle cx="16" cy="14" r="1" fill="white"/>
                <circle cx="13" cy="12" r="1" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-sm text-foreground">SWITCH SAB</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            data-testid="button-toggle-theme"
            title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm space-y-7">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
              <p className="text-sm text-muted-foreground">Accédez à votre espace de gestion</p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="identifiant" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Pseudo ou Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="text"
                          placeholder="pseudo ou email@exemple.com"
                          className="pl-9 h-11"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-9 h-11"
                          data-testid="input-password"
                        />
                      </div>
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
                  className="w-full h-11 font-semibold text-base gap-2"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Connexion…
                    </span>
                  ) : "Se connecter"}
                </Button>
              </form>
            </Form>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">Comptes de démonstration</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(a => (
                <button
                  key={a.identifiant}
                  onClick={() => fillDemo(a.identifiant)}
                  className="flex flex-col items-start gap-0.5 p-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all text-left group"
                  data-testid={`button-demo-${a.label.toLowerCase().replace(" ", "-")}`}
                >
                  <span className={cn("text-xs font-semibold", a.color)}>{a.label}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full group-hover:text-foreground transition-colors">
                    {a.identifiant}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Mot de passe universel : <span className="font-mono font-semibold text-foreground">admin123</span>
            </p>
          </div>
        </div>
        <div className="text-center px-6 py-4 text-xs text-muted-foreground">
          Support : <span className="text-foreground">+229 0197691879</span>
        </div>
      </div>
    </div>
  );
}