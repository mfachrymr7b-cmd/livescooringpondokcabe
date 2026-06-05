import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Target, Star } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

function resultStyle(result: string) {
  if (result === "Albatross") return "bg-amber-900/40 text-amber-300 border-amber-600/50";
  if (result === "Eagle")     return "bg-emerald-900/40 text-emerald-300 border-emerald-600/50";
  if (result === "Birdie")    return "bg-blue-900/40 text-blue-300 border-blue-600/50";
  return "bg-emerald-800/30 text-[#A7F3D0] border-emerald-700/40";
}

export function BestHolePerformance() {
  const holes = useQuery(api.queries.dashboard.bestHolePerformances, { limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          Performa Hole Terbaik
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {holes === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : holes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada eagle atau birdie</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Data muncul setelah skor dimasukkan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holes.map((hole, idx) => (
              <div
                key={hole.holeNumber}
                className="flex items-center justify-between rounded-xl border border-emerald-700/50 bg-emerald-800/30 p-4 transition-all hover:shadow-md hover:border-emerald-600/60"
                style={{ animationDelay: `${idx * 75}ms` }}
                role="article"
                aria-label={`Hole ${hole.holeNumber}: ${hole.result} oleh ${hole.bestPlayerName}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-800/60 shadow-sm border border-emerald-600/40">
                    <span className="text-sm font-bold text-[#ECFDF5]">#{hole.holeNumber}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#ECFDF5]">
                      Hole {hole.holeNumber}
                      <span className="ml-1 text-xs font-normal text-[#A7F3D0]">(Par {hole.par})</span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#A7F3D0] mt-0.5">
                      <span>Best: <strong className="text-[#ECFDF5]">{hole.bestScore}</strong></span>
                      <span>·</span>
                      <span className="truncate max-w-[100px]">{hole.bestPlayerName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    resultStyle(hole.result)
                  )}>
                    {hole.result}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#A7F3D0]">
                    <Star className="h-3.5 w-3.5 text-[#F59E0B]" />
                    <span className="font-medium tabular-nums">{hole.frequency}x</span>
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
