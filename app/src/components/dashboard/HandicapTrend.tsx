/**
 * HandicapTrend — shows players with lowest handicap index from real data.
 * Wired to queries.dashboard.topPlayers (uses handicapIndex field).
 */
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

export function HandicapTrend() {
  const players = useQuery(api.queries.dashboard.topPlayers, { limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Handicap Player Terbaik
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {players === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada data handicap</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Data muncul setelah turnamen selesai</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player, idx) => {
              const hcp = player.handicapIndex;
              const hasHcp = hcp !== undefined && hcp !== null;
              const trendColor = hasHcp
                ? hcp <= 5 ? "text-emerald-400" : hcp <= 15 ? "text-amber-400" : "text-red-400"
                : "text-[#6EE7B7]";

              return (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between rounded-xl border border-emerald-700/50 bg-emerald-800/30 p-4 transition-all hover:shadow-md hover:border-emerald-600/60"
                  style={{ animationDelay: `${idx * 75}ms` }}
                  role="article"
                  aria-label={`${player.displayName} handicap: ${hcp ?? "N/A"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700/60 text-xs font-bold text-[#ECFDF5]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#ECFDF5] truncate">
                        {player.displayName}
                      </p>
                      <p className="text-xs text-[#A7F3D0]">
                        {player.wins} menang · {player.rounds} ronde
                      </p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1.5 shrink-0", trendColor)}>
                    {hasHcp ? (
                      hcp <= 5 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : hcp <= 15 ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <TrendingUp className="h-4 w-4" />
                      )
                    ) : null}
                    <span className="text-sm font-bold tabular-nums">
                      {hasHcp ? hcp : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
