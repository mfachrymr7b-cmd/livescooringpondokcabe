import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Crown, Medal, Award, Users } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-zinc-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-zinc-500">{rank}</span>;
}

function rankBg(rank: number) {
  if (rank === 1) return "bg-amber-900/30 border-amber-600/40";
  if (rank === 2) return "bg-emerald-800/30 border-emerald-600/40";
  if (rank === 3) return "bg-orange-900/20 border-orange-700/30";
  return "bg-emerald-800/20 border-emerald-700/30";
}

export function BestPlayer() {
  const players = useQuery(api.queries.dashboard.topPlayers, { limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-600" />
          Player Terbaik
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {players === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-emerald-700/30" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada data player</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Data muncul setelah turnamen selesai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((player, idx) => (
              <div
                key={player.playerId}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md",
                  rankBg(player.rank)
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800/60 shadow-sm">
                  <RankIcon rank={player.rank} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#ECFDF5] truncate">
                    {player.displayName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#A7F3D0] mt-0.5">
                    <span className="font-medium text-emerald-300">{player.wins} menang</span>
                    <span>·</span>
                    <span>{player.rounds} ronde</span>
                    {player.averageScore > 0 && (
                      <>
                        <span>·</span>
                        <span>avg {player.averageScore}</span>
                      </>
                    )}
                    {player.handicapIndex !== undefined && (
                      <>
                        <span>·</span>
                        <span>HCP {player.handicapIndex}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
