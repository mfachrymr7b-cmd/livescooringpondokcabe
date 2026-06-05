/**
 * LiveScoringPage — Flashscore-style golf homepage.
 *
 * Layout:
 *   Left sidebar (dark)  — filter tabs: ALL / LIVE / FINISHED / SCHEDULED
 *   Main area            — tournament sections, each with compact player rows
 *                          Columns: # | PLAYER | PAR | THRU | TODAY | R1..R4 | TOTAL
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { HoleByHoleGrid, type PlayerRow, type CourseHole } from "@/components/scoring/HoleByHoleGrid";
import { cn } from "@/utils";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  Trophy,
  Tv,
  Users,
} from "lucide-react";

// ─── Running Text Ticker ──────────────────────────────────────────────────────

function RunningTextTicker() {
  const texts = useQuery(api.queries.running_texts.activeTexts);

  if (!texts || texts.length === 0) return null;

  const combined = texts.map((t) => t.text).join("   ·   ");

  return (
    <div className="overflow-hidden bg-emerald-700 border-b border-emerald-600">
      <div className="mx-auto max-w-6xl px-0 py-1.5 flex items-center gap-2">
        <span className="shrink-0 px-3 text-xs font-bold text-white uppercase tracking-wider hidden sm:block">
          ⚡ INFO
        </span>
        <div className="flex-1 overflow-hidden">
          <div
            className="whitespace-nowrap text-sm font-medium text-white"
            style={{
              display: "inline-block",
              paddingLeft: "100%",
              animation: "liveTicker 25s linear infinite",
            }}
          >
            {combined}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes liveTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TournamentItem = {
  _id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  isLive?: boolean;
  startDate: number;
  endDate: number;
  holesPerRound: number;
  totalRounds: number;
  participantCount: number;
  courseName: string;
  courseCity?: string;
  prizePool?: number;
  currency?: string;
};

type Tab = "all" | "live" | "finished" | "scheduled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play: "Match Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  skins: "Skins",
};

function fmtDateFull(ts: number) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ts));
}

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })),
      10000
    );
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isLive }: { status: string; isLive?: boolean }) {
  if (status === "ongoing" || isLive) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-3 py-1 text-sm font-bold text-white shadow-lg">
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === "completed") {
    return <span className="rounded-full bg-gradient-to-r from-gray-400 to-gray-300 px-3 py-1 text-sm font-bold text-white shadow-md\">FINAL</span>;
  }
  if (status === "registration_open") {
    return <span className="rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1 text-sm font-bold text-white shadow-md\">OPEN</span>;
  }
  return <span className="rounded-full bg-slate-400 px-3 py-1 text-sm font-bold text-white shadow-md\">SCHEDULED</span>;
}

// ─── Par formatter ────────────────────────────────────────────────────────────

function fmtPar(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : String(v);
}

// ─── Tournament section ───────────────────────────────────────────────────────

function TournamentSection({ tournament }: { tournament: TournamentItem }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showHoleByHole, setShowHoleByHole] = useState(false);
  const isLive = tournament.status === "ongoing" || tournament.isLive;

  // Ambil top 5 leaderboard nyata dari Convex (termasuk roundScores)
  const leaderboard = useQuery(api.subscriptions.leaderboard.live, {
    tournamentId: tournament._id as Id<"tournaments">,
  });
  const currentRound = leaderboard?.[0]?.currentRound ?? 1;

  return (
    <div className={cn("mb-3 overflow-hidden rounded-lg border-2 shadow-md", isLive ? "border-red-500" : "border-emerald-500")}>
      {/* Tournament header row */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          isLive ? "bg-red-700" : "bg-emerald-800"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={tournament.status} isLive={tournament.isLive} />
          <div className="min-w-0">
            <Link
              to={`/live/${tournament._id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-black text-white hover:text-yellow-200 transition-colors line-clamp-1 text-xl"
            >
              {tournament.name}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-white/90 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {tournament.courseName}{tournament.courseCity ? `, ${tournament.courseCity}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {fmtDateFull(tournament.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" />
                Par {tournament.holesPerRound === 9 ? "36" : "72"} · {tournament.holesPerRound} holes
              </span>
              {tournament.prizePool && (
                <span className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {tournament.currency ?? "IDR"} {tournament.prizePool.toLocaleString("id-ID")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {tournament.participantCount} players
              </span>
              <span className="font-bold text-yellow-200">{FORMAT_LABEL[tournament.format] ?? tournament.format}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Link
            to={`/live/${tournament._id}`}
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:flex items-center gap-1 rounded border border-black bg-black px-3 py-1.5 text-sm font-bold text-white hover:bg-zinc-900 transition-all"
          >
            Leaderboard
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            className="flex items-center justify-center rounded border border-black bg-black px-2 py-1.5 text-white hover:bg-zinc-900 transition-all"
            aria-label={collapsed ? "Expand tournament" : "Collapse tournament"}
          >
            <ChevronDown className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Column headers + player rows */}
      {!collapsed && (
        <>
          <div
            className="grid bg-black px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200"
            style={{ gridTemplateColumns: "2.5rem 1.5fr 4rem 3.5rem 4rem repeat(4, 3.5rem) 4rem", gap: "0.75rem" }}
          >
            <span className="text-center">#</span>
            <span>PLAYER</span>
            <span className="text-center">PAR</span>
            <span className="text-center">THRU</span>
            <span className="text-center">TODAY</span>
            {Array.from({ length: tournament.totalRounds }, (_, i) => (
              <span key={i} className="text-center">R{i + 1}</span>
            ))}
            {Array.from({ length: Math.max(0, 4 - tournament.totalRounds) }, (_, i) => (
              <span key={`empty-${i}`} />
            ))}
            <span className="text-center">TOTAL</span>
          </div>

          <div className="divide-y divide-zinc-800 bg-black">
            {leaderboard === undefined ? (
              /* Loading skeleton */
              Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="grid items-center px-6 py-3"
                  style={{ gridTemplateColumns: "2.5rem 1.5fr 4rem 3.5rem 4rem repeat(4, 3.5rem) 4rem", gap: "0.75rem" }}
                >
                  <div className="mx-auto h-3.5 w-4 rounded bg-zinc-200 animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-200 animate-pulse" />
                    <div className="h-3.5 w-28 rounded bg-zinc-200 animate-pulse" />
                  </div>
                  {Array.from({ length: 8 }, (_, j) => (
                    <div key={j} className="mx-auto h-3.5 w-6 rounded bg-zinc-100 animate-pulse" />
                  ))}
                </div>
              ))
            ) : leaderboard.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm font-medium text-white">
                Belum ada skor — skor akan muncul setelah player mulai bermain
              </div>
            ) : (
              leaderboard.map((entry, idx) => {
                // Gunakan idx+1 sebagai posisi tampilan (urutan array dari backend sudah sorted).
                // entry.rank dipakai untuk warna medal (jika rank dari DB valid dan unik).
                const displayPos = idx + 1;
                const medalRank = displayPos; // pakai posisi array agar 1=gold, 2=silver, 3=bronze
                const thru = entry.isWithdrawn || entry.isDisqualified
                  ? "—"
                  : entry.holesCompleted >= tournament.holesPerRound
                    ? "F"
                    : String(entry.holesCompleted);
                return (
                  <div
                    key={entry.playerId}
                    className={cn(
                      "grid items-center px-4 py-3 transition-all",
                      medalRank === 1 ? "border-l-4 border-yellow-400" :
                      medalRank === 2 ? "border-l-4 border-slate-400" :
                      medalRank === 3 ? "border-l-4 border-orange-500" :
                      ""
                    )}
                    style={{
                      gridTemplateColumns: "2.5rem 1.5fr 4rem 3.5rem 4rem repeat(4, 3.5rem) 4rem",
                      gap: "0.75rem",
                      backgroundColor:
                        medalRank === 1 ? "#78350f" :
                        medalRank === 2 ? "#374151" :
                        medalRank === 3 ? "#7c2d12" :
                        idx % 2 === 0 ? "#111111" : "#000000",
                    }}
                  >
                    {/* Rank */}
                    <span className={cn(
                      "flex items-center justify-center text-xs font-black w-7 h-7 rounded-full mx-auto",
                      medalRank === 1 ? "bg-yellow-400 text-zinc-900" :
                      medalRank === 2 ? "bg-slate-300 text-zinc-900" :
                      medalRank === 3 ? "bg-orange-500 text-white" :
                      "bg-zinc-600 text-white"
                    )}>
                      {displayPos}
                    </span>

                    {/* Player */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-black text-white overflow-hidden border-2 border-emerald-400">
                        {entry.avatarUrl
                          ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                          : entry.displayName.charAt(0).toUpperCase()
                        }
                      </div>
                      <span className="truncate text-sm font-bold text-white">
                        {entry.displayName}
                        {entry.isWithdrawn && <span className="ml-1 text-amber-300 text-xs">(WD)</span>}
                        {entry.isDisqualified && <span className="ml-1 text-red-300 text-xs">(DQ)</span>}
                      </span>
                    </div>

                    {/* PAR */}
                    <span className={cn(
                      "text-center text-sm font-black tabular-nums",
                      entry.isWithdrawn || entry.isDisqualified ? "text-white" :
                      entry.scoreToPar < 0 ? "text-red-400" :
                      entry.scoreToPar > 0 ? "text-sky-300" : "text-emerald-300"
                    )}>
                      {entry.isWithdrawn || entry.isDisqualified ? "—" : fmtPar(entry.scoreToPar)}
                    </span>

                    {/* THRU */}
                    <span className="text-center text-sm font-semibold tabular-nums text-zinc-200">
                      {thru === "F"
                        ? <span className="font-black text-white bg-emerald-600 rounded px-1.5 py-0.5 text-xs">F</span>
                        : thru}
                    </span>

                    {/* TODAY */}
                    {(() => {
                      const currentRoundScore = entry.roundScores?.find(
                        (r) => r.roundNumber === entry.currentRound
                      );
                      const todayStrokes = currentRoundScore?.strokes;
                      return (
                        <span className="text-center text-sm font-semibold tabular-nums text-zinc-200">
                          {entry.isWithdrawn || entry.isDisqualified || !todayStrokes ? "—" : todayStrokes}
                        </span>
                      );
                    })()}

                    {/* Round scores R1–R4 */}
                    {Array.from({ length: 4 }, (_, j) => {
                      const roundNum = j + 1;
                      const roundScore = entry.roundScores?.find((r) => r.roundNumber === roundNum);
                      return (
                        <span key={j} className={cn(
                          "text-center text-sm tabular-nums font-semibold",
                          roundScore?.strokes ? "text-white" : "text-white"
                        )}>
                          {roundScore?.strokes ?? "—"}
                        </span>
                      );
                    })}

                    {/* TOTAL */}
                    <span className="text-center text-sm font-black tabular-nums text-white">
                      {entry.isWithdrawn || entry.isDisqualified ? "—" : (entry.totalStrokes || "—")}
                    </span>
                  </div>
                );
              })
            )}

            {/* Link ke full leaderboard */}
            {tournament.participantCount > 0 && (
              <div className="px-4 py-3 text-center bg-zinc-950 border-t border-zinc-800">
                <Link
                  to={`/live/${tournament._id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Lihat semua {tournament.participantCount} player
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() => setShowHoleByHole((value) => !value)}
                className="rounded border border-emerald-500 bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition-all"
              >
                {showHoleByHole ? "Sembunyikan skor per hole" : "Tampilkan skor per hole"}
              </button>
            </div>
            {showHoleByHole && (
              <TournamentHoleDetails
                tournamentId={tournament._id}
                currentRound={currentRound}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TournamentHoleDetails({
  tournamentId,
  currentRound,
}: {
  tournamentId: string;
  currentRound: number;
}) {
  const data = useQuery(api.subscriptions.liveScoring.leaderboardWithHoles, {
    tournamentId: tournamentId as Id<"tournaments">,
    roundNumber: currentRound,
  });

  return (
    <div className="rounded-b-lg border-t border-zinc-700 bg-zinc-900 px-4 py-4">
      {data === undefined ? (
        <div className="space-y-2">
          <div className="h-4 w-52 rounded bg-zinc-700 animate-pulse" />
          <div className="h-3 w-28 rounded bg-zinc-700 animate-pulse" />
          <div className="h-48 rounded bg-zinc-700 animate-pulse" />
        </div>
      ) : data === null ? (
        <div className="text-sm text-white font-medium">Data hole-by-hole tidak tersedia.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white font-bold">Skor per hole</p>
              <h3 className="text-sm font-bold text-white">Round {data.roundNumber} · {data.tournament.format.replace("_", " ")}</h3>
            </div>
            <p className="text-xs text-white font-medium">Menampilkan top 5 pemain</p>
          </div>
          <HoleByHoleGrid
            courseHoles={data.courseHoles as CourseHole[]}
            players={(data.players ?? []).slice(0, 5) as PlayerRow[]}
            format={data.tournament.format}
            showNet={data.tournament.useHandicap}
            compact
          />
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  tab,
  onTab,
  liveCount,
  finishedCount,
  scheduledCount,
  allItems,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  liveCount: number;
  finishedCount: number;
  scheduledCount: number;
  allItems: TournamentItem[];
}) {
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "ALL" },
    { key: "live", label: "LIVE", count: liveCount },
    { key: "finished", label: "FINISHED", count: finishedCount },
    { key: "scheduled", label: "SCHEDULED", count: scheduledCount },
  ];

  return (
    <aside className="hidden lg:flex w-48 shrink-0 flex-col gap-1">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden shadow-md">
        <div className="bg-emerald-700 px-3 py-3">
          <p className="text-base font-black uppercase tracking-widest text-white">Filter</p>
        </div>
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => onTab(key)}
            className={cn(
              "flex w-full items-center justify-between px-3 py-4 text-base font-black transition-all border-b border-zinc-700 last:border-0",
              tab === key
                ? "bg-emerald-800 text-white border-l-4 border-emerald-500"
                : "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
            )}
          >
            <span>{label}</span>
            {count !== undefined && count > 0 && (
              <span className={cn(
                "rounded-full px-2.5 py-1 text-sm font-black",
                tab === key ? "bg-emerald-500 text-white" : "bg-zinc-700 text-zinc-200",
                key === "live" && tab !== key && "bg-red-600 text-white"
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Current tournaments quick links */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden shadow-md mt-2">
        <div className="bg-emerald-700 px-3 py-3">
          <p className="text-base font-black uppercase tracking-widest text-white">Quick Links</p>
        </div>
        <div className="p-2">
          <Link to="/login" className="flex items-center gap-2 rounded px-3 py-2.5 text-base font-black text-white hover:bg-zinc-800 hover:text-white transition-colors">
            <Trophy className="h-5 w-5 text-emerald-500" />
            Admin Panel
          </Link>
          {allItems.map((t) => (
            <a
              key={t._id}
              href={`/tournaments/${t._id}/broadcast`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded px-3 py-2.5 text-base font-black text-white hover:bg-zinc-800 transition-colors"
            >
              <Tv className="h-5 w-5 text-red-400 shrink-0" />
              <div className="min-w-0">
                <span className="block text-sm font-black leading-tight">TV Mode</span>
                <span className="block truncate text-xs font-normal text-zinc-400">{t.name}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LiveScoringPage() {
  const [tab, setTab] = useState<Tab>("all");
  const data = useQuery(api.subscriptions.liveScoring.publicTournamentList);

  const ongoing = (data?.ongoing ?? []) as TournamentItem[];
  const scheduled = (data?.scheduled ?? []) as TournamentItem[];
  const registrationOpen = (data?.registrationOpen ?? []) as TournamentItem[];
  const completed = (data?.completed ?? []) as TournamentItem[];

  const allTournaments = [...ongoing, ...scheduled, ...registrationOpen, ...completed];

  const filtered = (() => {
    if (tab === "live") return ongoing;
    if (tab === "finished") return completed;
    if (tab === "scheduled") return scheduled;
    return allTournaments;
  })();

  return (
    <div className="min-h-screen bg-black font-sans">

      {/* ── Top header ── */}
      <header className="border-b border-zinc-800 bg-zinc-950 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-700">
              <Flag className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white leading-tight">Live Golf Scoring</h1>
              <p className="text-xs text-white font-medium">Pondokcabe Golf Club</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ongoing.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                {ongoing.length} LIVE
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-black">
              <Clock className="h-3.5 w-3.5" />
              <LiveClock />
            </div>
            <Link
              to="/login"
              className="rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800 transition-colors"
            >
              Admin Login
            </Link>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex border-t border-zinc-800 lg:hidden">
          {(["all", "live", "finished", "scheduled"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                tab === t ? "border-b-2 border-emerald-500 text-emerald-400 font-black" : "text-white hover:text-white font-black"
              )}
            >
              {t}
              {t === "live" && ongoing.length > 0 && (
                <span className="ml-1 rounded-full bg-red-600 px-1 text-white text-xs">{ongoing.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Running Text Ticker ── */}
      <RunningTextTicker />

      {/* ── Live alert bar ── */}
      {ongoing.length > 0 && (
        <div className="bg-red-600 text-white">
          <div className="mx-auto max-w-6xl px-4 py-1.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              {ongoing.length} turnamen sedang berlangsung — skor diperbarui secara real-time
            </div>
          </div>
        </div>
      )}

      {/* ── Body: sidebar + content ── */}
      <div className="mx-auto flex max-w-6xl gap-4 px-4 py-4">
        <Sidebar
          tab={tab}
          onTab={setTab}
          liveCount={ongoing.length}
          finishedCount={completed.length}
          scheduledCount={scheduled.length}
          allItems={allTournaments}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {data === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800">
                    <div className="h-5 w-16 animate-pulse rounded bg-zinc-700" />
                    <div className="h-5 w-48 animate-pulse rounded bg-zinc-700" />
                  </div>
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-8 animate-pulse rounded bg-zinc-800" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900 py-16 text-center">
                <Trophy className="mb-3 h-10 w-10 text-white" />
                <p className="font-black text-white">
                  {tab === "live" ? "Tidak ada turnamen yang sedang berlangsung" :
                   tab === "finished" ? "Belum ada turnamen selesai" :
                   tab === "scheduled" ? "Tidak ada turnamen terjadwal" :
                   "Belum ada turnamen"}
                </p>
                <p className="mt-1 text-sm text-white font-bold">
                  {tab === "live" ? "Cek tab Scheduled untuk turnamen yang akan datang" :
                   "Data akan muncul setelah turnamen dibuat"}
                </p>
              </div>

              {tab === "live" && scheduled.length > 0 && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white font-black">Upcoming tournaments</p>
                      <h2 className="text-sm font-black text-white">Turnamen terjadwal</h2>
                    </div>
                    <Link
                      to="/live"
                      className="inline-flex items-center rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-700 transition-colors"
                    >
                      Lihat semua scheduled
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {scheduled.map((t) => (
                      <div key={t._id} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <Link
                              to={`/live/${t._id}`}
                              className="font-black text-white hover:text-emerald-400 transition-colors"
                            >
                              {t.name}
                            </Link>
                            <p className="mt-1 text-xs text-white font-bold">
                              {t.courseName}{t.courseCity ? `, ${t.courseCity}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-900 font-bold">
                            <span>{fmtDateFull(t.startDate)}</span>
                            <span>Par {t.holesPerRound === 9 ? "36" : "72"}</span>
                            <span>{FORMAT_LABEL[t.format] ?? t.format}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wide">
                <Calendar className="h-3.5 w-3.5" />
                {new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
              </div>

              {filtered.map((t) => (
                <TournamentSection key={t._id} tournament={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-800 bg-zinc-950 py-4">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-white font-medium">
          Live Golf Scoring · Pondokcabe Golf Club · Skor diperbarui secara real-time · Powered by Convex
        </div>
      </footer>
    </div>
  );
}
