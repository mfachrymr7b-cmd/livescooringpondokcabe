import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

export function AverageScore() {
  const data = useQuery(api.queries.dashboard.tournamentAnalytics, { limit: 5 });

  // Compute average scores from real tournament data
  const averageScores = data
    ? data
        .filter((t) => t.avgScore > 0)
        .map((t, i, arr) => {
          const prev = arr[i + 1];
          const change = prev ? t.avgScore - prev.avgScore : 0;
          return {
            period: t.name,
            score: t.avgScore,
            trend: change < 0 ? "down" : change > 0 ? "up" : "stable",
            change,
            status: t.status,
          };
        })
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          Rata-rata Skor per Turnamen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : averageScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingDown className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada data skor</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Data muncul setelah scorecard disubmit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {averageScores.map((item, idx) => (
              <div
                key={item.period}
                className="flex items-center justify-between rounded-xl border border-emerald-700/50 bg-emerald-800/30 p-4 transition-all hover:shadow-md hover:border-emerald-600/60"
                style={{ animationDelay: `${idx * 75}ms` }}
                role="article"
                aria-label={`Rata-rata skor ${item.period}: ${item.score}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#ECFDF5] truncate">{item.period}</p>
                  <p className="text-xs text-[#A7F3D0] capitalize">{item.status.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-2xl font-bold text-[#ECFDF5] tabular-nums">{item.score}</p>
                  <div className={cn(
                    "flex items-center gap-1",
                    item.trend === "down" ? "text-emerald-400" :
                    item.trend === "up" ? "text-red-400" : "text-[#6EE7B7]"
                  )}>
                    {item.trend === "down" ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : item.trend === "up" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    {item.change !== 0 && (
                      <span className="text-xs font-semibold tabular-nums">
                        {item.change > 0 ? "+" : ""}{item.change}
                      </span>
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
