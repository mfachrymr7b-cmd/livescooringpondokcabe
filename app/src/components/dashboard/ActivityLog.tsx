import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity } from "lucide-react";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit yang lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  submitted: { icon: "✅", color: "bg-emerald-700/40 border-emerald-600/50" },
  verified:  { icon: "🏆", color: "bg-purple-900/40 border-purple-700/50" },
  in_progress: { icon: "✏️", color: "bg-amber-900/30 border-amber-700/40" },
  disputed:  { icon: "⚠️", color: "bg-red-900/30 border-red-700/40" },
};

export function ActivityLog() {
  const activities = useQuery(api.queries.dashboard.recentActivity);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Log Aktivitas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activities === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-[#6EE7B7]/40 mb-2" />
            <p className="text-sm text-[#6EE7B7]">Belum ada aktivitas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, idx) => {
              const cfg = STATUS_CONFIG[activity.status] ?? STATUS_CONFIG.submitted;
              return (
                <div
                  key={activity.scorecardId}
                  className={cn(
                    "flex gap-3 rounded-xl border p-4 transition-all hover:shadow-md",
                    cfg.color
                  )}
                  style={{ animationDelay: `${idx * 75}ms` }}
                  role="article"
                  aria-label={`${activity.playerName} — ${activity.tournamentName}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800/60 text-lg shadow-sm">
                    {cfg.icon}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-[#ECFDF5] truncate">
                      {activity.playerName}
                    </p>
                    <p className="text-xs text-[#A7F3D0] truncate">
                      {activity.tournamentName} · Round {activity.roundNumber}
                      {activity.totalStrokes ? ` · ${activity.totalStrokes} strokes` : ""}
                    </p>
                    <p className="text-xs text-[#6EE7B7]">{timeAgo(activity.submittedAt)}</p>
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
