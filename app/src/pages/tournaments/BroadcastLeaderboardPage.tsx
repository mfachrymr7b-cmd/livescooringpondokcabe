import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Clock, Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { Tournament } from "@/modules/convex/types";
import { PageSpinner } from "@/components/ui/Spinner";
import type { LiveLeaderboardRow } from "@/components/scoring/LeaderboardTable";
import { BroadcastLeaderboardDisplay } from "@/components/scoring/BroadcastLeaderboardDisplay";
import { HoleByHoleGrid } from "@/components/scoring/HoleByHoleGrid";

const DEFAULT_SCROLL_INTERVAL = 8000;
const ROWS_PER_VIEW = 10;

// ─── Running Text Ticker ──────────────────────────────────────────────────────

function formatScoreToParShort(scoreToPar: number): string {
  if (scoreToPar === 0) return "E";
  return scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar);
}

function BroadcastTicker({
  leaderboardRows,
  holesPerRound = 18,
}: {
  leaderboardRows: LiveLeaderboardRow[];
  holesPerRound?: number;
}) {
  const texts = useQuery(api.queries.running_texts.activeTexts);

  // Bangun segmen skor pemain: "1. Budi Santoso  +2 (12/18)"
  const playerSegments = leaderboardRows
    .filter((r) => !r.isWithdrawn && !r.isDisqualified)
    .slice(0, 20) // tampilkan max 20 pemain di ticker
    .map((r) => {
      const scorePar = formatScoreToParShort(r.scoreToPar);
      const thru = r.holesCompleted >= holesPerRound ? "F" : `${r.holesCompleted}/${holesPerRound}`;
      return `${r.rankDisplay ?? r.rank}. ${r.displayName}  ${scorePar} (${thru})`;
    });

  const manualTexts = (texts ?? []).map((t) => t.text);

  // Gabungkan: skor pemain dulu, lalu teks manual
  const allSegments = [...playerSegments, ...manualTexts];

  if (allSegments.length === 0) return null;

  // Duplikasi agar animasi seamless
  const combined = allSegments.join("          ·          ");
  const doubled = `${combined}          ·          ${combined}`;

  // Sesuaikan durasi animasi dengan panjang teks (min 40s, max 120s)
  const duration = Math.max(40, Math.min(120, allSegments.length * 6));

  return (
    <div
      className="flex items-center bg-green-700 border-t-2 border-green-500 overflow-hidden shrink-0"
      style={{ height: "48px" }}
    >
      {/* Label SCORE */}
      <div className="shrink-0 flex items-center gap-2 bg-green-900 px-4 h-full border-r border-green-600">
        <span className="text-xs font-black text-white uppercase tracking-widest">SCORE</span>
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div
          className="whitespace-nowrap text-sm font-semibold text-white absolute"
          style={{
            animation: `broadcastTicker ${duration}s linear infinite`,
            paddingLeft: "100%",
          }}
        >
          {doubled}
        </div>
      </div>

      <style>{`
        @keyframes broadcastTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })),
      1000
    );
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

export function BroadcastLeaderboardPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;

  const autoScroll = true;
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip") as
    | Tournament
    | null
    | undefined;

  const liveLeaderboardData = useQuery(
    api.subscriptions.liveScoring.leaderboardWithHoles,
    tournament && id ? { tournamentId: id, roundNumber: 1 } : "skip"
  );

  const activeData = liveLeaderboardData;
  const totalRows = activeData?.players?.length ?? 0;
  const maxScroll = Math.max(0, totalRows - ROWS_PER_VIEW);

  // Auto-scroll through rankings
  useEffect(() => {
    if (!autoScroll || totalRows <= ROWS_PER_VIEW) {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      return;
    }

    scrollIntervalRef.current = setInterval(() => {
      setScrollPosition((prev) => {
        const next = prev + 1;
        return next > maxScroll ? 0 : next;
      });
    }, DEFAULT_SCROLL_INTERVAL);

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [autoScroll, totalRows, maxScroll]);

  if (tournament === undefined || activeData === undefined) return <PageSpinner />;
  if (tournament === null || activeData === null) return <p className="text-white p-8">Turnamen tidak ditemukan</p>;

  const rows: (LiveLeaderboardRow & { holeScores: Array<{
    holeNumber: number;
    strokes: number;
    grossScoreToPar?: number;
    netScoreToPar?: number;
    stablefordPoints?: number;
    isBirdie?: boolean;
    isEagle?: boolean;
    isBogey?: boolean;
    isDoubleBogey?: boolean;
  }> })[] = (activeData.players ?? []).map((entry) => ({
    rank: entry.rank,
    rankDisplay: entry.rankDisplay ?? String(entry.rank),
    isTied: entry.isTied,
    playerId: entry.playerId,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    bibNumber: entry.bibNumber,
    totalStrokes: entry.totalStrokes,
    totalNetScore: entry.totalNetScore,
    scoreToPar: entry.scoreToPar,
    holesCompleted: entry.holesCompleted,
    isWithdrawn: entry.isWithdrawn,
    isDisqualified: entry.isDisqualified,
    holeScores: entry.holeScores ?? [],
  }));

  const visibleRows = rows.slice(
    scrollPosition,
    scrollPosition + ROWS_PER_VIEW
  );

  return (
    <div className="flex flex-col min-h-screen min-w-full overflow-y-auto bg-zinc-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 px-8 py-6 shadow-lg shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white">{tournament.name}</h1>
            </div>
            <p className="text-green-100 text-lg mt-1">
              Live Leaderboard — {rows.length} Players
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end text-green-100 mb-2">
              <Clock className="h-4 w-4" />
              <LiveClock />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </div>

      <BroadcastTicker leaderboardRows={rows} holesPerRound={tournament.holesPerRound} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Leaderboard */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeData.courseHoles?.length > 0 && visibleRows.length > 0 && (
            <div className="h-full w-full rounded-none border-none bg-zinc-900 p-0">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6">
                <div>
                  <p className="text-sm font-semibold text-white">Live Hole-by-Hole</p>
                  <p className="text-xs text-white">Per hole score & points for top players, updated in real time.</p>
                </div>
                <p className="text-xs uppercase tracking-wide text-white">
                  {tournament.format.replace("_", " ")}
                </p>
              </div>
              <div className="flex-1 overflow-x-auto px-4 pb-4">
                <div className="min-w-full rounded-3xl border border-zinc-800 bg-zinc-950/90 p-4 shadow-lg">
                  <HoleByHoleGrid
                    courseHoles={activeData.courseHoles}
                    players={visibleRows.map((row) => ({
                      playerId: row.playerId,
                      displayName: row.displayName,
                      bibNumber: row.bibNumber,
                      totalStrokes: row.totalStrokes,
                      totalNetScore: row.totalNetScore,
                      scoreToPar: row.scoreToPar,
                      holesCompleted: row.holesCompleted,
                      isWithdrawn: row.isWithdrawn,
                      isDisqualified: row.isDisqualified,
                      holeScores: row.holeScores || [],
                    }))}
                    format={tournament.format}
                    showNet={tournament.useHandicap ?? false}
                    compact
                  />
                </div>
              </div>
            </div>
          )}
          <BroadcastLeaderboardDisplay
            rows={visibleRows}
            displayPosition={scrollPosition + 1}
            totalRows={totalRows}
            holesPerRound={tournament.holesPerRound}
          />
        </div>
      </div>
    </div>
  );
}
