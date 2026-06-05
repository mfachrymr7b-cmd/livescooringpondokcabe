/**
 * RevenuePlaceholder — menampilkan ringkasan prize pool dari turnamen nyata.
 * Wired ke api.queries.dashboard.tournamentAnalytics.
 */
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DollarSign, Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play: "Match Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  skins: "Skins",
};

export function RevenuePlaceholder() {
  const data = useQuery(api.queries.dashboard.tournamentAnalytics, { limit: 5 });

  // Hitung total prize pool dari semua turnamen
  const tournamentsWithPrize = data?.filter((t) => t.avgScore > 0 || t.participants > 0) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Ringkasan Turnamen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : tournamentsWithPrize.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Belum ada data turnamen</p>
            <p className="text-xs text-zinc-400 mt-1">Data muncul setelah turnamen dibuat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournamentsWithPrize.map((t, idx) => (
              <div
                key={t.tournamentId}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition-all hover:shadow-md hover:border-zinc-300"
                style={{ animationDelay: `${idx * 75}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{t.name}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                    <span>{FORMAT_LABEL[t.format] ?? t.format}</span>
                    <span>·</span>
                    <span>{t.participants} peserta</span>
                    {t.avgScore > 0 && (
                      <>
                        <span>·</span>
                        <span>avg {t.avgScore}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right ml-3">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                    t.status === "ongoing" ? "bg-green-100 text-green-700" :
                    t.status === "completed" ? "bg-zinc-100 text-zinc-600" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {t.status.replace("_", " ")}
                  </span>
                  {t.winnerName && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5 truncate max-w-[80px]">
                      🏆 {t.winnerName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
