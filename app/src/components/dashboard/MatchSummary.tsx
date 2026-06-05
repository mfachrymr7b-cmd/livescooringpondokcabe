import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Flag, Users, Swords } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(ts));
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled:  { label: "Terjadwal",  color: "bg-blue-900/40 text-blue-300" },
  ongoing:    { label: "Berlangsung", color: "bg-emerald-700/50 text-emerald-300" },
  completed:  { label: "Selesai",    color: "bg-emerald-900/40 text-[#A7F3D0]" },
  cancelled:  { label: "Dibatalkan", color: "bg-red-900/40 text-red-300" },
  walkover:   { label: "Walkover",   color: "bg-amber-900/30 text-amber-300" },
};

export function MatchSummary() {
  const matches = useQuery(api.queries.dashboard.recentMatches);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-purple-600" />
          Ringkasan Match Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {matches === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Swords className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada match</p>
            <p className="text-xs text-[#6EE7B7]/70 mt-1">Buat match dari halaman turnamen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, idx) => {
              const cfg = STATUS_CONFIG[match.status] ?? STATUS_CONFIG.scheduled;
              return (
                <div
                  key={match.matchId}
                  className="flex items-center justify-between rounded-xl border border-emerald-700/50 bg-emerald-800/30 p-4 transition-all hover:shadow-md hover:border-emerald-600/60"
                  style={{ animationDelay: `${idx * 75}ms` }}
                  role="article"
                  aria-label={`Match: ${match.tournamentName} - ${cfg.label}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-[#ECFDF5] truncate">
                      {match.tournamentName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#A7F3D0]">
                      <span className="flex items-center gap-1">
                        <Flag className="h-3 w-3" />
                        {match.courseName}
                      </span>
                      <span>·</span>
                      <span>Round {match.roundNumber}</span>
                      {match.flightName && (
                        <>
                          <span>·</span>
                          <span>{match.flightName}</span>
                        </>
                      )}
                      {match.playerCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {match.playerCount} player
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-3">
                    <span className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      cfg.color
                    )}>
                      {cfg.label}
                    </span>
                    <p className="mt-1 text-xs text-[#6EE7B7]">
                      {formatDate(match.scheduledDate)}
                    </p>
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
