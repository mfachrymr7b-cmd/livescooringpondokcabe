/**
 * ReportsPage — Tournament reporting & export.
 * Module: Reporting System
 * Generates leaderboard, scorecard, and player reports.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Download, FileSpreadsheet, FileText, BarChart3,
  Trophy, Users, Target, TrendingUp, Filter
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils";
function formatToPar(v: number) {
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : String(v);
}

// ─── CSV export helpers ───────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tournament selector ──────────────────────────────────────────────────────

function TournamentSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const ongoing = useQuery(api.queries.dashboard.ongoingTournamentsSummary);
  const allTournaments = useQuery(api.queries.tournaments.listAll, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-white">Pilih Turnamen</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-emerald-600 bg-emerald-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <option value="">-- Pilih turnamen --</option>
        {/* Ongoing tournaments first */}
        {ongoing && ongoing.length > 0 && (
          <optgroup label="Sedang Berlangsung">
            {ongoing.map((t) => (
              <option key={t.tournamentId} value={t.tournamentId}>
                {t.name} (LIVE)
              </option>
            ))}
          </optgroup>
        )}
        {/* All other tournaments */}
        {allTournaments && (
          <optgroup label="Semua Turnamen">
            {allTournaments.page
              .filter((t) => t.status !== "ongoing")
              .map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.status.replace("_", " ")})
                </option>
              ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ─── Leaderboard report ───────────────────────────────────────────────────────

function LeaderboardReport({ tournamentId }: { tournamentId: Id<"tournaments"> }) {
  const data = useQuery(api.subscriptions.leaderboard.live, { tournamentId });
  const tournament = useQuery(
    api.queries.tournaments.get,
    tournamentId ? { id: tournamentId } : "skip"
  );

  if (data === undefined || tournament === undefined) {
    return <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />;
  }

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Rank", "Player", "Bib", "Handicap", "Gross", "Net", "To Par", "Holes", "Round"],
      ...data.map((e) => [
        e.rankDisplay ?? String(e.rank),
        e.displayName,
        e.bibNumber ?? "",
        String(e.handicapIndex ?? ""),
        String(e.totalStrokes),
        String(e.totalNetScore ?? ""),
        formatToPar(e.scoreToPar),
        String(e.holesCompleted),
        String(e.currentRound),
      ]),
    ];
    downloadCSV(rows, `leaderboard-${tournament?.name ?? "tournament"}-${Date.now()}.csv`);
  }

  function exportJSON() {
    downloadJSON(data, `leaderboard-${tournament?.name ?? "tournament"}-${Date.now()}.json`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{data.length} players</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJSON}>
            <FileText className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-emerald-600/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-900/60 text-left text-xs font-bold uppercase tracking-wide text-emerald-200 border-b border-emerald-600/50">
              <th className="px-3 py-2.5">Rank</th>
              <th className="px-3 py-2.5">Player</th>
              <th className="px-3 py-2.5 text-center">Thru</th>
              <th className="px-3 py-2.5 text-center">Gross</th>
              <th className="px-3 py-2.5 text-center">Net</th>
              <th className="px-3 py-2.5 text-center">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-700/40">
            {data.slice(0, 20).map((e) => (
              <tr key={e.playerId} className={cn("hover:bg-emerald-800/40", (e.isWithdrawn || e.isDisqualified) && "opacity-60")}>
                <td className="px-3 py-2 font-bold text-white">{e.rankDisplay ?? e.rank}</td>
                <td className="px-3 py-2">
                  <p className="font-semibold text-white">{e.displayName}</p>
                  {e.bibNumber && <p className="text-xs text-emerald-300">#{e.bibNumber}</p>}
                </td>
                <td className="px-3 py-2 text-center text-emerald-100">{e.holesCompleted}</td>
                <td className="px-3 py-2 text-center font-bold text-white">{e.totalStrokes}</td>
                <td className="px-3 py-2 text-center text-emerald-100">{e.totalNetScore ?? "—"}</td>
                <td className={cn("px-3 py-2 text-center font-bold tabular-nums",
                  e.scoreToPar < 0 ? "text-red-400" : e.scoreToPar > 0 ? "text-sky-300" : "text-emerald-300"
                )}>
                  {formatToPar(e.scoreToPar)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 20 && (
          <div className="px-3 py-2 text-center text-xs text-emerald-300 border-t border-emerald-700/40">
            +{data.length - 20} more players — export CSV for full list
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary report ───────────────────────────────────────────────────────────

function SummaryReport({ tournamentId }: { tournamentId: Id<"tournaments"> }) {
  const leaderboard = useQuery(api.subscriptions.leaderboard.live, { tournamentId });
  const dist = useQuery(api.queries.dashboard.scoreDistribution, { tournamentId });
  const tournament = useQuery(
    api.queries.tournaments.get,
    tournamentId ? { id: tournamentId } : "skip"
  );

  if (leaderboard === undefined || dist === undefined || tournament === undefined) {
    return <div className="h-48 animate-pulse rounded-lg bg-zinc-100" />;
  }

  const active = leaderboard.filter((e) => !e.isWithdrawn && !e.isDisqualified);
  const avgScore = active.length > 0
    ? Math.round((active.reduce((s, e) => s + e.totalStrokes, 0) / active.length) * 10) / 10
    : 0;
  const leader = active[0];
  const trailer = active[active.length - 1];

  function exportCSV() {
    const rows = [
      ["Metrik", "Nilai"],
      ["Total Player", String(leaderboard?.length ?? 0)],
      ["Player Aktif", String(active.length)],
      ["Rata-rata Skor", String(avgScore)],
      ["Leader", leader ? `${leader.displayName} (${leader.totalStrokes})` : "—"],
      ["Total Holes Recorded", String(dist?.totalHoles ?? 0)],
      ["Eagles", String(dist?.eagles ?? 0)],
      ["Birdies", String(dist?.birdies ?? 0)],
      ["Pars", String(dist?.pars ?? 0)],
      ["Bogeys", String(dist?.bogeys ?? 0)],
      ["Double Bogey+", String(dist?.doubleBogeys ?? 0)],
    ];
    downloadCSV(rows, `summary-${tournament?.name ?? "tournament"}-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Player stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Player", value: leaderboard.length },
          { label: "Rata-rata Skor", value: avgScore || "—" },
          { label: "Holes Recorded", value: dist.totalHoles },
          { label: "Player Aktif", value: active.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-emerald-600/50 bg-emerald-800/50 p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-white">{value}</p>
            <p className="text-xs text-emerald-200 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Leader / trailer */}
      {active.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {leader && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-800/60 p-3">
              <p className="text-xs font-bold text-emerald-300 uppercase mb-1">🏆 Leader</p>
              <p className="font-bold text-white">{leader.displayName}</p>
              <p className="text-sm text-emerald-100">
                {leader.totalStrokes} strokes ·{" "}
                <span className={leader.scoreToPar < 0 ? "text-red-400 font-bold" : leader.scoreToPar > 0 ? "text-sky-300 font-bold" : "text-emerald-300"}>
                  {leader.scoreToPar === 0 ? "E" : leader.scoreToPar > 0 ? `+${leader.scoreToPar}` : String(leader.scoreToPar)}
                </span>
              </p>
            </div>
          )}
          {trailer && trailer.playerId !== leader?.playerId && (
            <div className="rounded-lg border border-emerald-600/50 bg-emerald-800/40 p-3">
              <p className="text-xs font-bold text-emerald-300 uppercase mb-1">Last Place</p>
              <p className="font-bold text-white">{trailer.displayName}</p>
              <p className="text-sm text-emerald-100">
                {trailer.totalStrokes} strokes ·{" "}
                <span className={trailer.scoreToPar < 0 ? "text-red-400 font-bold" : trailer.scoreToPar > 0 ? "text-sky-300 font-bold" : "text-emerald-300"}>
                  {trailer.scoreToPar === 0 ? "E" : trailer.scoreToPar > 0 ? `+${trailer.scoreToPar}` : String(trailer.scoreToPar)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Score distribution mini */}
      {dist.totalHoles > 0 && (
        <div className="rounded-lg border border-emerald-600/50 bg-emerald-800/40 p-3">
          <p className="text-xs font-bold text-emerald-200 uppercase mb-3">Distribusi Skor</p>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { label: "Eagle+", value: dist.eagles, color: "text-amber-600 bg-amber-50" },
              { label: "Birdie", value: dist.birdies, color: "text-red-600 bg-red-50" },
              { label: "Par", value: dist.pars, color: "text-zinc-600 bg-zinc-50" },
              { label: "Bogey", value: dist.bogeys, color: "text-blue-600 bg-blue-50" },
              { label: "Dbl+", value: dist.doubleBogeys, color: "text-blue-800 bg-blue-100" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-2 ${color}`}>
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreDistributionReport({ tournamentId }: { tournamentId: Id<"tournaments"> }) {
  const dist = useQuery(api.queries.dashboard.scoreDistribution, { tournamentId });

  if (dist === undefined) return <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />;
  if (dist.totalHoles === 0) return <p className="text-sm text-emerald-300 py-4 text-center">Belum ada data skor</p>;

  const items = [
    { key: "eagles",      label: "Eagle / Albatross", color: "bg-amber-400", textColor: "text-amber-700" },
    { key: "birdies",     label: "Birdie",             color: "bg-red-500",   textColor: "text-red-700" },
    { key: "pars",        label: "Par",                color: "bg-zinc-400",  textColor: "text-zinc-700" },
    { key: "bogeys",      label: "Bogey",              color: "bg-blue-400",  textColor: "text-blue-700" },
    { key: "doubleBogeys",label: "Double Bogey+",      color: "bg-blue-700",  textColor: "text-blue-900" },
  ];

  function exportCSV() {
    if (!dist) return;
    const rows = [
      ["Kategori", "Jumlah", "Persentase"],
      ...items.map(({ key, label }) => {
        const count = dist[key as keyof typeof dist] as number;
        return [label, String(count), `${Math.round((count / dist.totalHoles) * 100)}%`];
      }),
      ["Total Holes", String(dist.totalHoles), "100%"],
    ];
    downloadCSV(rows, `score-distribution-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="space-y-2">
        {items.map(({ key, label, color }) => {
          const count = dist[key as keyof typeof dist] as number;
          const pct = Math.round((count / dist.totalHoles) * 100);
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm font-medium text-white">{label}</span>
              <div className="flex-1 rounded-full bg-emerald-900 h-3">
                <div className={cn("h-3 rounded-full", color)} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-20 text-right text-sm font-bold tabular-nums text-white">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
        <p className="text-xs text-emerald-300 pt-1">Total: {dist.totalHoles} holes recorded</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [activeReport, setActiveReport] = useState<"leaderboard" | "distribution" | "summary">("leaderboard");

  const globalStats = useQuery(api.queries.dashboard.globalStats);
  const tournamentStats = useQuery(api.queries.dashboard.tournamentStats);

  const reportTabs = [
    { key: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
    { key: "distribution" as const, label: "Distribusi Skor", icon: Target },
    { key: "summary" as const, label: "Ringkasan", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description="Export dan analisis data turnamen, skor, dan pemain"
      />

      {/* Global summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Lapangan",   value: globalStats?.totalCourses ?? "—",      icon: Filter,     iconBg: "bg-emerald-600" },
          { label: "Turnamen Aktif",   value: globalStats?.activeTournaments ?? "—", icon: Trophy,     iconBg: "bg-emerald-600" },
          { label: "Total Player",     value: globalStats?.totalPlayers ?? "—",      icon: Users,      iconBg: "bg-emerald-600" },
          { label: "Match Selesai",    value: globalStats?.completedMatches ?? "—",  icon: TrendingUp, iconBg: "bg-emerald-600" },
        ].map(({ label, value, icon: Icon, iconBg }) => (
          <div key={label} className="rounded-lg border border-emerald-600/50 bg-emerald-700/60 p-4">
            <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xl font-bold tabular-nums text-white">{value}</p>
            <p className="text-xs text-emerald-200 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tournament status breakdown */}
      {tournamentStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-700" />
                Ringkasan Turnamen
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const rows = [
                    ["Status", "Jumlah"],
                    ["Sedang Berlangsung", String(tournamentStats.ongoing)],
                    ["Registrasi Terbuka", String(tournamentStats.registration_open)],
                    ["Registrasi Ditutup", String(tournamentStats.registration_closed)],
                    ["Selesai", String(tournamentStats.completed)],
                    ["Draft", String(tournamentStats.draft)],
                    ["Dibatalkan", String(tournamentStats.cancelled)],
                    ["Total", String(tournamentStats.total)],
                  ];
                  downloadCSV(rows, `tournament-summary-${Date.now()}.csv`);
                }}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { key: "ongoing",              label: "Berlangsung", color: "text-white bg-emerald-600 border-emerald-500" },
                { key: "registration_open",    label: "Reg. Terbuka", color: "text-white bg-sky-700 border-sky-600" },
                { key: "registration_closed",  label: "Reg. Ditutup", color: "text-white bg-amber-700 border-amber-600" },
                { key: "completed",            label: "Selesai",      color: "text-white bg-emerald-800 border-emerald-700" },
                { key: "draft",                label: "Draft",        color: "text-emerald-100 bg-emerald-900 border-emerald-700" },
                { key: "cancelled",            label: "Dibatalkan",   color: "text-white bg-red-700 border-red-600" },
              ].map(({ key, label, color }) => (
                <div key={key} className={cn("rounded-lg border p-3 text-center", color)}>
                  <p className="text-2xl font-bold tabular-nums">{tournamentStats[key as keyof typeof tournamentStats]}</p>
                  <p className="text-xs font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-tournament reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-green-700" />
            Laporan Per Turnamen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TournamentSelector value={selectedTournamentId} onChange={setSelectedTournamentId} />

          {selectedTournamentId && (
            <>
              {/* Report tabs */}
              <div className="flex gap-1 rounded-lg border border-emerald-600/50 bg-emerald-900/50 p-0.5 w-fit">
                {reportTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveReport(key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold transition-all",
                      activeReport === key
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-200 hover:text-white hover:bg-emerald-700/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Report content */}
              {activeReport === "leaderboard" && (
                <LeaderboardReport tournamentId={selectedTournamentId as Id<"tournaments">} />
              )}
              {activeReport === "distribution" && (
                <ScoreDistributionReport tournamentId={selectedTournamentId as Id<"tournaments">} />
              )}
              {activeReport === "summary" && (
                <SummaryReport tournamentId={selectedTournamentId as Id<"tournaments">} />
              )}
            </>
          )}

          {!selectedTournamentId && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-600/50 py-12 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-white">Pilih turnamen untuk melihat laporan</p>
              <p className="mt-1 text-sm text-emerald-300">Data leaderboard, distribusi skor, dan statistik pemain</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
