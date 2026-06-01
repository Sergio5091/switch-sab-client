import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Megaphone, Bell } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ClientPromotions() {
  const { currentUser, promotions } = useApp();
  const salleId = currentUser?.salleId ?? 1;
  const myPromos = promotions.filter(p => p.salleId === salleId && p.envoye).slice().reverse();

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Offres exclusives de votre salle</p>
        </div>

        {myPromos.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Bell size={24} className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">Aucune promotion</div>
              <div className="text-xs text-muted-foreground mt-1">Revenez bientôt pour découvrir les offres</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {myPromos.map(p => (
              <div
                key={p.id}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors"
                data-testid={`card-promo-${p.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{p.texte}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(p.dateCreation), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
