import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, AlertCircle, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { axiosInstance } from "@/lib/axios";

const schema = z.object({
  licenceCode: z.string().min(1, "Code de licence requis"),
});
type FormValues = z.infer<typeof schema>;

export default function LicencePage() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { licenceCode: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setError("");
    setLoading(true);
    
    try {
      const response = await axiosInstance.post("/licence/activer", {
        licenceCode: values.licenceCode,
      });

      toast({ title: "Licence activée avec succès" });
      setLocation("/admin/dashboard");
    } catch (err: any) {
      setLoading(false);
      const message = err.response?.data?.message || "Erreur lors de l'activation de la licence";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">Renouvellement de licence</h1>
            <p className="text-sm text-muted-foreground">
              Votre licence est invalide ou expirée. Entrez un nouveau code de licence pour continuer.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="licenceCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">Code de licence</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="XXXX-XXXX-XXXX"
                          className="pl-9 h-11 font-mono"
                          data-testid="input-licence-code"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                data-testid="button-activer-licence"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4z"/>
                    </svg>
                    Activation...
                  </span>
                ) : "Activer la licence"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}