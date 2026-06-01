import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientPromoCode() {
  const { currentUser, clients, promoConfigs } = useApp();
  const { toast } = useToast();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
  const salleId = currentUser?.salleId ?? 1;
  const config = promoConfigs.find(c => c.salleId === salleId);

  const code = client?.codePromo ?? `SW-${(currentUser?.pseudo ?? "USER").toUpperCase().slice(0, 4)}-XXX`;

  function handleCopy() {
    navigator.clipboard.writeText(code)
      .then(() => toast({ title: "Code copié !" }))
      .catch(() => toast({ title: "Code : " + code }));
  }

  function handleShare() {
    const text = `Rejoins-moi sur SWITCH SAB ! Utilise mon code ${code} lors de ton inscription pour obtenir une réduction. 🎮`;
    if (navigator.share) {
      navigator.share({ title: "SWITCH SAB – Code parrainage", text }).catch(() => { });
    } else {
      navigator.clipboard.writeText(text).then(() => toast({ title: "Message copié !" }));
    }
  }

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Code parrainage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Invitez vos amis et gagnez des bonus</p>
        </div>

        {/* Code card */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto">
            <Users size={24} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Votre code de parrainage</p>
            <div className="font-mono text-2xl font-bold text-foreground tracking-widest bg-muted/50 rounded-xl py-3 px-4">
              {code}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy} data-testid="button-copy-code">
              <Copy size={15} /> Copier
            </Button>
            <Button className="flex-1 gap-2" onClick={handleShare} data-testid="button-share-code">
              <Share2 size={15} /> Partager
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Comment ça marche ?</h2>
          <div className="space-y-2">
            {[
              { step: "1", text: "Partagez votre code avec un ami", icon: Share2 },
              { step: "2", text: "Votre ami s'inscrit et utilise votre code", icon: Users },
              { step: "3", text: `Vous recevez ${config?.bonusParrainPct ?? 10}% de son crédit initial`, icon: Zap },
            ].map(({ step, text, icon: Icon }) => (
              <div key={step} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {step}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Icon size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-primary">{config?.bonusParrainPct ?? 10}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Bonus parrain</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{config?.reductionInvitePct ?? 5}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">Réduction invité</div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
