import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import ClientLayout from "@/layouts/ClientLayout";
import { Trophy, Clock } from "lucide-react";
import api from "@/services/api";

const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-orange-500"];
const MEDAL_BG = ["bg-yellow-400/10 border-yellow-400/30", "bg-slate-400/10 border-slate-400/30", "bg-orange-500/10 border-orange-500/30"];

interface LeaderboardEntry { id: number; pseudo: string; totalSecondes: number; }

export default function ClientLeaderboard() {
  const { currentUser } = useApp();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/client/leaderboard').then(r => {
      setLeaderboard(r.data.leaderboard);
      setMyId(r.data.myId);
    }).catch(console.error);
  }, []);

  const myRank = leaderboard.findIndex(c => c.id === myId) + 1;
  const myStats = leaderboard.find(c => c.id === myId);

  return (
    <ClientLayout>
      <div className="px-4 pt-6 pb-4 space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Top joueurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Classement de votre salle</p>
        </div>

        {myStats && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
              #{myRank}
            </div>
            <div className="flex-1">
              <div className="font-bold text-foreground">{myStats.pseudo} <span className="text-muted-foreground text-xs">(vous)</span></div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={10} /> {Math.floor(myStats.totalSecondes / 60)} minutes jouées
              </div>
            </div>
          </div>
        )}

        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-6 py-6">
            {[1, 0, 2].map((pos) => {
              const entry = leaderboard[pos];
              const rank = pos + 1;
              const isMe = entry?.id === myId;
              const sizes = pos === 0 ? "w-14 h-14 text-xl" : "w-12 h-12 text-base";
              const mt = pos === 0 ? "-mt-4" : pos === 2 ? "mt-2" : "";
              return (
                <div key={pos} className={`flex flex-col items-center gap-2 ${mt}`}>
                  {pos === 0 && <Trophy size={20} className="text-yellow-400" />}
                  <div className={`${sizes} rounded-full flex items-center justify-center font-bold border-2 ${isMe ? "bg-primary/20 border-primary text-primary" : `${MEDAL_BG[pos]} ${MEDAL_COLORS[pos]}`}`}>
                    {entry?.pseudo?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className={`font-bold text-xs text-center w-16 truncate ${MEDAL_COLORS[pos]}`}>{entry?.pseudo}</span>
                  <span className={`text-xs border rounded px-1.5 py-0.5 ${MEDAL_BG[pos]} ${MEDAL_COLORS[pos]}`}>{rank === 1 ? "1er" : `${rank}ème`}</span>
                  <span className="text-[10px] text-muted-foreground">{Math.floor((entry?.totalSecondes ?? 0) / 60)} min</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {leaderboard.map((entry, i) => {
              const isMe = entry.id === myId;
              const rank = i + 1;
              return (
                <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-primary/5" : "hover:bg-muted/20"} transition-colors`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rank <= 3 ? `${MEDAL_BG[rank - 1]} ${MEDAL_COLORS[rank - 1]}` : "bg-muted text-muted-foreground"}`}>
                    {rank <= 3 ? <Trophy size={12} /> : rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                      {entry.pseudo}{isMe ? " (vous)" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={10} /> {Math.floor(entry.totalSecondes / 60)} min
                  </div>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Aucune donnée</div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
