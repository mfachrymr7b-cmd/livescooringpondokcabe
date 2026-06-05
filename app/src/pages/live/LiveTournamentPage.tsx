/**
 * LiveTournamentPage — Flashscore-style live golf leaderboard.
 * Layout: dark sidebar + main content, compact table rows.
 * Columns: # | PLAYER | PAR | THRU | TODAY | R1 R2 R3 R4 | TOTAL
 */

import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { HoleByHoleGrid, type PlayerRow, type CourseHole } from "@/components/scoring/HoleByHoleGrid";
import { cn } from "@/utils";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Grid3X3,
  List,
  Tv,
  Trophy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type HoleScore = {
  holeNumber: number;
  strokes: number;
  grossScoreToPar?: number;
  isBirdie?: boolean;
  isEagle?: boolean;
  isBogey?: boolean;
  isDoubleBogey?: boolean;
};

type PlayerEntry = {
  rank: number;
  rankDisplay?: string;
  isTied?: boolean;
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  bibNumber?: string;
  handicapIndex?: number;
  totalStrokes: number;
  totalNetScore?: number;
  scoreToPar: number;
  totalStablefordPoints?: number;
  holesCompleted: number;
  currentRound?: number;
  isWithdrawn: boolean;
  isDisqualified: boolean;
  holeScores: HoleScore[];
  roundScores?: Array<{ roundNumber: number; strokes: number; netScore?: number }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play: "Match Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  skins: "Skins",
};

function fmtDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(ts));
}

function fmtPar(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  if (v === 0) return "E";
  return v > 0 ? `+${v}` : String(v);
}

/** Flashscore color: red = under par, blue = over par, black = par */
function parColor(v: number | undefined): string {
  if (v === undefined) return "text-white";
  if (v < 0) return "text-red-500 font-bold";
  if (v > 0) return "text-blue-500 font-bold";
  return "text-zinc-700 font-medium";
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

// ─── Score cell (hole-by-hole) ────────────────────────────────────────────────

// ─── Player row ───────────────────────────────────────────────────────────────

function PlayerRow({
  entry,
  totalRounds,
  holesPerRound,
  isExpanded,
  onToggle,
  courseHoles,
  format,
  showNet,
  idx,
}: {
  entry: PlayerEntry;
  totalRounds: number;
  holesPerRound: number;
  isExpanded: boolean;
  onToggle: () => void;
  courseHoles: CourseHole[];
  format: string;
  showNet: boolean;
  idx: number;
}) {
  const inactive = entry.isWithdrawn || entry.isDisqualified;
  const thru = inactive ? "—" : entry.holesCompleted >= holesPerRound ? "F" : String(entry.holesCompleted);
  const isStableford = format === "stableford";

  // "TODAY" = current round score-to-par (approximate from holeScores)
  const todayToPar = entry.holeScores.length > 0
    ? entry.holeScores.reduce((sum, h) => sum + (h.grossScoreToPar ?? 0), 0)
    : undefined;

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-zinc-800 text-sm transition-colors",
          idx % 2 === 0 ? "bg-zinc-950" : "bg-black",
          isExpanded && "bg-zinc-800",
          inactive && "opacity-60",
          "hover:bg-zinc-800"
        )}
      >
        {/* Rank */}
        <td className="w-10 px-2 py-2.5 text-center">
          <span className={cn(
            "text-sm font-bold",
            entry.rank === 1 ? "text-amber-600" :
            entry.rank === 2 ? "text-white" :
            entry.rank === 3 ? "text-amber-700" :
            "text-white"
          )}>
            {entry.isTied ? "T" : ""}{entry.rankDisplay ?? entry.rank}
          </span>
        </td>

        {/* Player */}
        <td className="px-2 py-2.5 min-w-[160px]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
              {entry.avatarUrl
                ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                : entry.displayName.charAt(0).toUpperCase()
              }
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-white truncate block">{entry.displayName}</span>
              {entry.bibNumber && <span className="text-xs text-white">#{entry.bibNumber}</span>}
            </div>
            {entry.isDisqualified && <span className="ml-1 rounded bg-red-100 px-1 text-xs font-bold text-red-700">DQ</span>}
            {entry.isWithdrawn && <span className="ml-1 rounded bg-amber-100 px-1 text-xs font-bold text-amber-700">WD</span>}
          </div>
        </td>

        {/* PAR (total score to par) */}
        <td className={cn("w-14 px-2 py-2.5 text-center tabular-nums", parColor(inactive ? undefined : entry.scoreToPar))}>
          {inactive ? "—" : fmtPar(entry.scoreToPar)}
        </td>

        {/* THRU */}
        <td className="w-12 px-2 py-2.5 text-center text-sm tabular-nums text-white">
          {thru === "F" ? <span className="font-bold text-emerald-400">F</span> : thru}
        </td>

        {/* TODAY */}
        <td className={cn("w-14 px-2 py-2.5 text-center tabular-nums", parColor(inactive ? undefined : todayToPar))}>
          {inactive ? "—" : fmtPar(todayToPar)}
        </td>

        {/* Round scores R1..R4 */}
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
          const rs = entry.roundScores?.find((x) => x.roundNumber === r);
          return (
            <td key={r} className="w-12 px-2 py-2.5 text-center text-sm tabular-nums text-white">
              {rs ? (isStableford ? rs.strokes : rs.strokes) : "—"}
            </td>
          );
        })}

        {/* TOTAL */}
        <td className="w-14 px-2 py-2.5 text-center text-sm font-bold tabular-nums text-white">
          {inactive ? "—" : (isStableford ? (entry.totalStablefordPoints ?? "—") : (entry.totalStrokes || "—"))}
        </td>

        {/* Net (optional) */}
        {showNet && (
          <td className="w-14 px-2 py-2.5 text-center text-sm tabular-nums text-white">
            {inactive ? "—" : (entry.totalNetScore ?? "—")}
          </td>
        )}

        {/* Expand */}
        <td className="w-8 px-1 py-2.5 text-center">
          {isExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-white mx-auto" />
            : <ChevronDown className="h-3.5 w-3.5 text-white mx-auto" />
          }
        </td>
      </tr>

      {/* Expanded hole-by-hole */}
      {isExpanded && (
        <tr className="bg-zinc-900">
          <td colSpan={showNet ? 8 + totalRounds : 7 + totalRounds} className="px-4 py-3">
            <HoleByHoleGrid
              courseHoles={courseHoles}
              players={[{
                playerId: entry.playerId,
                displayName: entry.displayName,
                bibNumber: entry.bibNumber,
                handicapIndex: entry.handicapIndex,
                totalStrokes: entry.totalStrokes,
                totalNetScore: entry.totalNetScore,
                scoreToPar: entry.scoreToPar,
                totalStablefordPoints: entry.totalStablefordPoints,
                holesCompleted: entry.holesCompleted,
                isWithdrawn: entry.isWithdrawn,
                isDisqualified: entry.isDisqualified,
                holeScores: entry.holeScores,
              }]}
              format={format}
              showNet={showNet}
              compact
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <tr key={i} className="border-b border-zinc-100">
          <td colSpan={8} className="px-3 py-3">
            <div className="h-5 animate-pulse rounded bg-zinc-200" style={{ width: `${60 + (i % 3) * 15}%` }} />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LiveTournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [view, setView] = useState<"leaderboard" | "grid">("leaderboard");

  const data = useQuery(
    api.subscriptions.liveScoring.leaderboardWithHoles,
    id ? { tournamentId: id, roundNumber } : "skip"
  );

  const isLoading = data === undefined;
  const notFound = data === null;

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-white" />
          <p className="font-medium text-white">Turnamen tidak ditemukan</p>
          <Link to="/live" className="mt-3 inline-block text-sm text-green-400 hover:underline">
            ← Kembali
          </Link>
        </div>
      </div>
    );
  }

  const tournament = data?.tournament;
  const courseHoles: CourseHole[] = (data?.courseHoles ?? []) as CourseHole[];
  const players: PlayerEntry[] = (data?.players ?? []) as PlayerEntry[];
  const isLive = tournament?.status === "ongoing";
  const isStableford = tournament?.format === "stableford";
  const showNet = (tournament?.useHandicap ?? false) && !isStableford;
  const totalRounds = tournament?.totalRounds ?? 1;

  const allPlayersForGrid: PlayerRow[] = players.map((p) => ({
    playerId: p.playerId,
    displayName: p.displayName,
    bibNumber: p.bibNumber,
    handicapIndex: p.handicapIndex,
    totalStrokes: p.totalStrokes,
    totalNetScore: p.totalNetScore,
    scoreToPar: p.scoreToPar,
    totalStablefordPoints: p.totalStablefordPoints,
    holesCompleted: p.holesCompleted,
    isWithdrawn: p.isWithdrawn,
    isDisqualified: p.isDisqualified,
    holeScores: p.holeScores,
  }));

  return (
    <div className="min-h-screen bg-black font-sans">

      {/* ── Top nav bar ── */}
      <nav className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Link to="/live" className="flex items-center gap-1.5 text-sm text-white hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Golf</span>
            </Link>
            <span className="text-white">/</span>
            <span className="text-sm font-medium text-white line-clamp-1">{tournament?.name ?? "..."}</span>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-white font-black">
              <Clock className="h-3.5 w-3.5" />
              <LiveClock />
            </div>
            <Link to="/login" className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              Admin
            </Link>
            {tournamentId && (
              <Link
                to={`/tournaments/${tournamentId}/broadcast`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                <Tv className="h-3.5 w-3.5" />
                TV Mode
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Tournament header (dark, like Flashscore) ── */}
      <div className="bg-zinc-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-64 animate-pulse rounded bg-zinc-700" />
              <div className="h-4 w-96 animate-pulse rounded bg-zinc-700" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-white">
                      {FORMAT_LABEL[tournament?.format ?? ""] ?? tournament?.format}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-white">{tournament?.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white">
                    {tournament?.startDate && (
                      <span>Dates: {fmtDate(tournament.startDate)}</span>
                    )}
                    <span>Par: {courseHoles.reduce((s, h) => s + h.par, 0) || "—"}</span>
                    {tournament?.prizePool && (
                      <span>Prize money: {tournament.currency ?? "IDR"} {tournament.prizePool.toLocaleString("id-ID")}</span>
                    )}
                    <span>{players.length} players</span>
                  </div>
                </div>

                {/* Round tabs */}
                {totalRounds > 1 && (
                  <div className="flex gap-1 rounded-lg bg-zinc-700 p-0.5">
                    {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRoundNumber(r)}
                        className={cn(
                          "rounded px-3 py-1.5 text-sm font-medium transition-all",
                          roundNumber === r ? "bg-white text-zinc-900 shadow" : "text-white hover:text-white"
                        )}
                      >
                        R{r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── View toggle + filter bar ── */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("leaderboard")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all",
                view === "leaderboard" ? "bg-zinc-700 text-white" : "text-white hover:bg-zinc-800 hover:text-white"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Leaderboard
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all",
                view === "grid" ? "bg-zinc-700 text-white" : "text-white hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Scorecard
            </button>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5 text-xs text-white">
              <Activity className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              Real-time updates
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        {view === "grid" ? (
          /* ── Scorecard grid view ── */
          <div>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-zinc-200" />
            ) : players.length === 0 ? (
              <EmptyLeaderboard />
            ) : (
              <HoleByHoleGrid
                courseHoles={courseHoles}
                players={allPlayersForGrid}
                format={tournament?.format}
                showNet={showNet}
              />
            )}
          </div>
        ) : (
          /* ── Leaderboard table (Flashscore-style) ── */
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-sm">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-700 bg-black text-left text-xs font-bold uppercase tracking-wide text-white">
                  <th className="w-10 px-2 py-2.5 text-center">#</th>
                  <th className="px-2 py-2.5">Player</th>
                  <th className="w-14 px-2 py-2.5 text-center">PAR</th>
                  <th className="w-12 px-2 py-2.5 text-center">THRU</th>
                  <th className="w-14 px-2 py-2.5 text-center">TODAY</th>
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                    <th key={r} className="w-12 px-2 py-2.5 text-center">R{r}</th>
                  ))}
                  <th className="w-14 px-2 py-2.5 text-center">TOTAL</th>
                  {showNet && <th className="w-14 px-2 py-2.5 text-center">NET</th>}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows />
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={7 + totalRounds} className="py-16 text-center text-white">
                      <Trophy className="mx-auto mb-2 h-8 w-8 text-white" />
                      <p className="font-medium">Belum ada skor</p>
                      <p className="mt-1 text-xs">Leaderboard akan muncul setelah skor dimasukkan</p>
                    </td>
                  </tr>
                ) : (
                  players.map((entry, idx) => (
                    <PlayerRow
                      key={entry.playerId}
                      entry={entry}
                      totalRounds={totalRounds}
                      holesPerRound={tournament?.holesPerRound ?? 18}
                      isExpanded={expandedPlayer === entry.playerId}
                      onToggle={() => setExpandedPlayer(expandedPlayer === entry.playerId ? null : entry.playerId)}
                      courseHoles={courseHoles}
                      format={tournament?.format ?? "stroke_play"}
                      showNet={showNet}
                      idx={idx}
                    />
                  ))
                )}
              </tbody>
            </table>

            {/* Legend */}
            {!isLoading && players.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 bg-black px-4 py-2 text-xs text-white">
                <span className="text-white">Klik player untuk skor per hole ·</span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">3</span>
                  Birdie
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-white text-xs font-bold ring-1 ring-amber-500">2</span>
                  Eagle
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-400 text-white text-xs font-bold">5</span>
                  Bogey
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-white text-xs font-bold ring-1 ring-blue-700">6</span>
                  Double+
                </span>
                <span className="ml-auto text-white">
                  <span className="text-red-500 font-bold">-3</span> = under par ·{" "}
                  <span className="text-sky-400 font-bold">+3</span> = over par
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-800 bg-zinc-950 py-4">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-white">
          Live Golf Scoring · Pondokcabe Golf Club · Powered by Convex real-time
        </div>
      </footer>
    </div>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950 py-16 text-center">
      <Trophy className="mb-3 h-10 w-10 text-white" />
      <p className="font-medium text-white">Belum ada skor</p>
      <p className="mt-1 text-sm text-white">Leaderboard akan muncul setelah skor dimasukkan</p>
    </div>
  );
}
