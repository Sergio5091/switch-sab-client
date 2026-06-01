import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Trophy, Clock } from "lucide-react";

const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-orange-600"];
const MEDAL_BG = [
  "bg-yellow-400/10 border-yellow-400/30",
  "bg-slate-400/10 border-slate-400/30",
  "bg-orange-600/10 border-orange-600/30",
];

export default function ClientLeaderboard() {
  const { currentUser, clients, sessions } = useApp();
  const client = clients.find(c => c.pseudo === currentUser?.pseudo && c.salleId === currentUser?.salleId);
  const salleId = currentUser?.salleId ?? 1;

  const salleClients = clients.filter(c => c.salleId === salleId);
  const leaderboard = salleClients.map(c => {
    const totalMinutes = sessions
      .filter(s => s.clientId === c.id && s.salleId === salleId)
      .reduce((sum, s) => sum + s.dureeMinutes, 0);
    return { ...c, totalMinutes };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const myRank = leaderboard.findIndex(c => c.id === client?.id) + 1;
  const myStats = leaderboard.find(c => c.id === client?.id);

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Top joueurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Classement de votre salle</p>
        </div>

        {/* My rank */}
        {myStats && myRank > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
              #{myRank}
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{myStats.pseudo} <span className="text-muted-foreground text-xs">(vous)</span></div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={10} /> {myStats.totalMinutes} minutes jouées
              </div>
            </div>
          </div>
        )}

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-6">
            {/* 2nd */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 ${leaderboard[1]?.id === client?.id ? "bg-primary/20 border-primary text-primary" : "bg-muted border-slate-500/30 text-foreground"}`}>
                {leaderboard[1]?.pseudo?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className={`font-bold text-xs text-center w-16 truncate ${MEDAL_COLORS[1]}`}>{leaderboard[1]?.pseudo}</span>
              <span className={`text-xs border rounded px-1.5 py-0.5 ${MEDAL_BG[1]} ${MEDAL_COLORS[1]}`}>2ème</span>
              <span className="text-[10px] text-muted-foreground">{leaderboard[1]?.totalMinutes} min</span>
            </div>

            {/* 1st */}
            <div className="flex flex-col items-center gap-2 -mt-4">
              <Trophy size={20} className="text-yellow-400" />
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 ${leaderboard[0]?.id === client?.id ? "bg-primary/20 border-primary text-primary" : "bg-yellow-400/10 border-yellow-400/40 text-foreground"}`}>
                {leaderboard[0]?.pseudo?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className={`font-bold text-sm text-center w-20 truncate ${MEDAL_COLORS[0]}`}>{leaderboard[0]?.pseudo}</span>
              <span className={`text-xs border rounded px-1.5 py-0.5 ${MEDAL_BG[0]} ${MEDAL_COLORS[0]}`}>1er</span>
              <span className="text-[10px] text-muted-foreground">{leaderboard[0]?.totalMinutes} min</span>
            </div>

            {/* 3rd */}
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 ${leaderboard[2]?.id === client?.id ? "bg-primary/20 border-primary text-primary" : "bg-muted border-orange-600/30 text-foreground"}`}>
                {leaderboard[2]?.pseudo?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className={`font-bold text-xs text-center w-16 truncate ${MEDAL_COLORS[2]}`}>{leaderboard[2]?.pseudo}</span>
              <span className={`text-xs border rounded px-1.5 py-0.5 ${MEDAL_BG[2]} ${MEDAL_COLORS[2]}`}>3ème</span>
              <span className="text-[10px] text-muted-foreground">{leaderboard[2]?.totalMinutes} min</span>
            </div>
          </div>
        )}

        {/* Full leaderboard */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {leaderboard.map((entry, i) => {
              const isMe = entry.id === client?.id;
              const rank = i + 1;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary/5" : "hover:bg-muted/20"} transition-colors`}
                  data-testid={`row-leaderboard-${entry.id}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rank <= 3 ? `${MEDAL_BG[rank - 1]} ${MEDAL_COLORS[rank - 1]}` : "bg-muted text-muted-foreground"}`}>
                    {rank <= 3 ? <Trophy size={12} /> : rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                      {entry.pseudo}{isMe ? " (vous)" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock size={10} /> {entry.totalMinutes} min
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
