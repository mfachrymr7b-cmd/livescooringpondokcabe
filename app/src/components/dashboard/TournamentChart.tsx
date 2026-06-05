import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

const STATUS_COLOR: Record<string, string> = {
  ongoing:             "from-green-400 to-green-600",
  completed:           "from-zinc-400 to-zinc-500",
  registration_open:   "from-blue-400 to-blue-600",
  registration_closed: "from-amber-400 to-amber-600",
  draft:               "from-zinc-300 to-zinc-400",
  cancelled:           "from-red-400 to-red-500",
};

export function TournamentChart() {
  const data = useQuery(api.queries.dashboard.tournamentAnalytics, { limit: 6 });

  const maxParticipants = data
    ? Math.max(...data.map((t) => t.participants), 1)
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          Statistik Turnamen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data === undefined ? (
          <div className="space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-emerald-700/40" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-emerald-700/30" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada turnamen</p>
          </div>
        ) : (
          <div className="space-y-5">
            {data.map((t, idx) => {
              const pct = Math.round((t.participants / maxParticipants) * 100);
              const gradient = STATUS_COLOR[t.status] ?? STATUS_COLOR.draft;
              return (
                <div
                  key={t.tournamentId}
                  className="space-y-2"
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#ECFDF5] truncate max-w-[160px]">
                      {t.name}
                    </span>
                    <span className="text-[#A7F3D0] shrink-0 ml-2">
                      {t.participants} peserta · {t.matchCount} match
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-900/60">
                    <div
                      className={cn(
                        "h-2.5 rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                        gradient
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {t.avgScore > 0 && (
                    <p className="text-xs text-[#6EE7B7]">
                      Avg skor: <span className="font-medium text-[#A7F3D0]">{t.avgScore}</span>
                      {t.winnerName && (
                        <> · Pemenang: <span className="font-medium text-[#F59E0B]">{t.winnerName}</span></>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
