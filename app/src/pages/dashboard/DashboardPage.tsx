/**
 * DashboardPage — Admin dashboard with live stats from Convex.
 * All stats are reactive — auto-updates when data changes.
 */

import { useQuery } from "convex/react";
import { Flag, Trophy, Users, TrendingUp, Activity, BarChart3, Target, Award, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/modules/convex/api";
import { cn } from "@/utils";

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

function formatToPar(v: number) {
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : String(v);
}

function StatCard({
  label, value, icon: Icon, color, loading, href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  href?: string;
}) {
  const content = (
    <Card className={cn("transition-shadow hover:shadow-md", href && "cursor-pointer")}>
      <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <div className="h-7 w-12 animate-pulse rounded bg-emerald-700/40" />
          ) : (
            <p className="text-xl font-bold text-white sm:text-2xl tabular-nums">{value}</p>
          )}
          <p className="text-xs font-medium text-emerald-200">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

export function DashboardPage() {
  const stats = useQuery(api.queries.dashboard.globalStats);
  const recentActivity = useQuery(api.queries.dashboard.recentActivity);
  const tournamentStats = useQuery(api.queries.dashboard.tournamentStats);
  const ongoingSummary = useQuery(api.queries.dashboard.ongoingTournamentsSummary);
  const scoreDist = useQuery(api.queries.dashboard.scoreDistribution, {});

  const isLoading = stats === undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Selamat datang di Live Scoring Pondokcabe"
      />

      {/* ── Global Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Lapangan"
          value={stats?.totalCourses ?? "—"}
          icon={Flag}
          color="text-white bg-emerald-600/60"
          loading={isLoading}
          href="/courses"
        />
        <StatCard
          label="Turnamen Aktif"
          value={stats?.activeTournaments ?? "—"}
          icon={Trophy}
          color="text-white bg-blue-500/40"
          loading={isLoading}
          href="/tournaments"
        />
        <StatCard
          label="Total Player"
          value={stats?.totalPlayers ?? "—"}
          icon={Users}
          color="text-white bg-amber-500/40"
          loading={isLoading}
        />
        <StatCard
          label="Scorecard Peserta"
          value="Buka"
          icon={ClipboardList}
          color="text-white bg-emerald-600/40"
          loading={isLoading}
          href="/tournaments"
        />
        <StatCard
          label="Match Selesai"
          value={stats?.completedMatches ?? "—"}
          icon={TrendingUp}
          color="text-white bg-purple-500/40"
          loading={isLoading}
        />
      </div>

      {/* ── Tournament Status Breakdown ── */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-700" />
              Status Turnamen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentStats === undefined ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-emerald-700/30" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { key: "ongoing", label: "Sedang Berlangsung", color: "bg-green-400" },
                  { key: "registration_open", label: "Registrasi Terbuka", color: "bg-blue-400" },
                  { key: "registration_closed", label: "Registrasi Ditutup", color: "bg-amber-400" },
                  { key: "completed", label: "Selesai", color: "bg-emerald-600" },
                  { key: "draft", label: "Draft", color: "bg-emerald-800" },
                ].map(({ key, label, color }) => {
                  const count = tournamentStats[key as keyof typeof tournamentStats] as number;
                  const total = tournamentStats.total || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-sm font-medium text-emerald-100">{label}</span>
                      <div className="flex-1 rounded-full bg-emerald-900/60 h-2">
                        <div
                          className={cn("h-2 rounded-full transition-all", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-bold text-white tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Score Distribution ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-700" />
              Distribusi Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreDist === undefined ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-emerald-700/30" />
                ))}
              </div>
            ) : scoreDist.totalHoles === 0 ? (
              <p className="text-sm text-emerald-200 py-4 text-center">Belum ada data skor</p>
            ) : (
              <div className="space-y-2">
                {[
                  { key: "eagles", label: "Eagle / Albatross", color: "bg-amber-400", textColor: "text-amber-300" },
                  { key: "birdies", label: "Birdie", color: "bg-red-400", textColor: "text-red-300" },
                  { key: "pars", label: "Par", color: "bg-emerald-400", textColor: "text-emerald-200" },
                  { key: "bogeys", label: "Bogey", color: "bg-blue-400", textColor: "text-blue-300" },
                  { key: "doubleBogeys", label: "Double Bogey+", color: "bg-blue-600", textColor: "text-blue-200" },
                ].map(({ key, label, color, textColor }) => {
                  const count = scoreDist[key as keyof typeof scoreDist] as number;
                  const pct = Math.round((count / scoreDist.totalHoles) * 100);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-sm font-medium text-emerald-100">{label}</span>
                      <div className="flex-1 rounded-full bg-emerald-900/60 h-2">
                        <div
                          className={cn("h-2 rounded-full transition-all", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={cn("w-12 text-right text-sm font-bold tabular-nums", textColor)}>
                        {count} <span className="text-xs font-normal text-emerald-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-emerald-400 pt-1">Total: {scoreDist.totalHoles} holes recorded</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Ongoing Tournaments ── */}
      {(ongoingSummary === undefined || (ongoingSummary?.length ?? 0) > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500 animate-pulse" />
              Turnamen Berlangsung
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ongoingSummary === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-emerald-700/30" />
                ))}
              </div>
            ) : ongoingSummary.length === 0 ? (
              <p className="text-sm text-emerald-200 py-4 text-center">Tidak ada turnamen yang sedang berlangsung</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ongoingSummary.map((t) => (
                  <Link
                    key={t.tournamentId}
                    to={`/tournaments/${t.tournamentId}`}
                    className="rounded-lg border border-emerald-600/50 bg-emerald-700/30 p-3 hover:border-emerald-400 hover:bg-emerald-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                        <p className="text-xs text-emerald-200">{t.courseName} · {t.participantCount} players</p>
                      </div>
                      <Badge variant="blue" className="shrink-0 text-xs">LIVE</Badge>
                    </div>
                    {t.leaders.length > 0 && (
                      <div className="space-y-1">
                        {t.leaders.map((leader) => (
                          <div key={leader.rankDisplay} className="flex items-center justify-between text-xs">
                            <span className="text-emerald-200">#{leader.rankDisplay} {leader.displayName}</span>
                            <span className={cn(
                              "font-bold tabular-nums",
                              leader.scoreToPar < 0 ? "text-red-300" :
                              leader.scoreToPar > 0 ? "text-blue-300" : "text-emerald-200"
                            )}>
                              {formatToPar(leader.scoreToPar)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recent Activity ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-green-700" />
            Aktivitas Terbaru
          </CardTitle>
          <p className="text-sm text-emerald-200">Scorecard yang baru disubmit</p>
        </CardHeader>
        <CardContent>
          {recentActivity === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-emerald-700/30" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-emerald-200 py-4 text-center">Belum ada aktivitas</p>
          ) : (
            <div className="divide-y divide-emerald-700/40">
              {recentActivity.map((item) => (
                <div key={item.scorecardId} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{item.playerName}</p>
                    <p className="text-xs text-emerald-200 truncate">
                      {item.tournamentName} · Round {item.roundNumber}
                    </p>
                  </div>
                  <div className="shrink-0 text-right ml-3">
                    <p className="font-bold text-white tabular-nums">{item.totalStrokes ?? "—"}</p>
                    <p className="text-xs text-emerald-300">{item.submittedAt ? formatDate(item.submittedAt) : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
