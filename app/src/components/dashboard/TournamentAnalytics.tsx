import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trophy, Users, BarChart3, TrendingUp } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ongoing:               { label: "Berlangsung",    color: "bg-emerald-700/50 text-emerald-200" },
  completed:             { label: "Selesai",         color: "bg-emerald-900/50 text-emerald-300" },
  registration_open:     { label: "Reg. Terbuka",   color: "bg-blue-900/40 text-blue-300" },
  registration_closed:   { label: "Reg. Ditutup",   color: "bg-amber-900/30 text-amber-300" },
  draft:                 { label: "Draft",           color: "bg-emerald-900/40 text-emerald-400" },
  cancelled:             { label: "Dibatalkan",      color: "bg-red-900/40 text-red-300" },
};

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play:  "Match Play",
  stableford:  "Stableford",
  scramble:    "Scramble",
  best_ball:   "Best Ball",
  skins:       "Skins",
};

export function TournamentAnalytics() {
  const data = useQuery(api.queries.dashboard.tournamentAnalytics, { limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          Analitik Turnamen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data === undefined ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="h-8 w-8 text-emerald-400/50 mb-2" />
            <p className="text-sm text-emerald-200">Belum ada turnamen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((t, idx) => {
              const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.draft;
              return (
                <div
                  key={t.tournamentId}
                  className="rounded-xl border border-emerald-700/50 bg-emerald-800/30 p-4 transition-all hover:shadow-md hover:border-emerald-500/60"
                  style={{ animationDelay: `${idx * 75}ms` }}
                  role="article"
                  aria-label={`Turnamen: ${t.name} - ${cfg.label}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          cfg.color
                        )}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-emerald-300">
                          {FORMAT_LABEL[t.format] ?? t.format}
                        </span>
                      </div>
                    </div>
                    {t.winnerName && (
                      <div className="flex items-center gap-1 text-xs text-amber-300 shrink-0">
                        <Trophy className="h-3.5 w-3.5" />
                        <span className="font-semibold truncate max-w-[80px]">{t.winnerName}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t.participants} peserta</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t.matchCount} match</span>
                    </div>
                    {t.avgScore > 0 && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Avg: {t.avgScore}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400">📅</span>
                      <span>{t.durationDays} hari</span>
                    </div>
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
