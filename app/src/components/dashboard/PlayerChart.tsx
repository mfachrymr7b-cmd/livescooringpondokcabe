import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users } from "lucide-react";
import { api } from "@/modules/convex/api";

export function PlayerChart() {
  const players = useQuery(api.queries.dashboard.topPlayers, { limit: 5 });

  const maxRounds = players
    ? Math.max(...players.map((p) => p.rounds), 1)
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Statistik Player
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {players === undefined ? (
          <div className="space-y-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-emerald-700/40" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-emerald-700/30" />
              </div>
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada data player</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Data muncul setelah turnamen selesai</p>
          </div>
        ) : (
          <div className="space-y-5">
            {players.map((player, idx) => {
              const roundPct = Math.round((player.rounds / maxRounds) * 100);
              const winPct = player.rounds > 0
                ? Math.round((player.wins / player.rounds) * 100)
                : 0;

              return (
                <div
                  key={player.playerId}
                  className="space-y-2"
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#ECFDF5] truncate max-w-[140px]">
                      {player.displayName}
                    </span>
                    <span className="text-[#A7F3D0] shrink-0 ml-2 text-xs">
                      {player.rounds} ronde · {player.wins} menang · {winPct}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {/* Rounds bar */}
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-emerald-900/60">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700 ease-out"
                        style={{ width: `${roundPct}%` }}
                      />
                    </div>
                    {/* Win rate bar */}
                    <div className="h-2.5 w-16 overflow-hidden rounded-full bg-emerald-900/60">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-amber-500 transition-all duration-700 ease-out"
                        style={{ width: `${winPct}%` }}
                      />
                    </div>
                  </div>
                  {player.averageScore > 0 && (
                    <p className="text-xs text-[#6EE7B7]">
                      Avg skor: <span className="font-medium text-[#A7F3D0]">{player.averageScore}</span>
                      {player.handicapIndex !== undefined && (
                        <> · HCP: <span className="font-medium text-[#A7F3D0]">{player.handicapIndex}</span></>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-4 pt-1 text-xs text-[#6EE7B7]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
                Jumlah ronde
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full bg-gradient-to-r from-[#F59E0B] to-amber-500" />
                Win rate
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
