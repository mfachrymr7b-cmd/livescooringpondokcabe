/**
 * HoleByHoleGrid — Flashscore-style hole-by-hole scorecard grid.
 *
 * Menampilkan skor setiap hole untuk satu atau banyak player dalam format grid,
 * mirip dengan tampilan scorecard di Flashscore Golf.
 */

import { cn } from "@/utils";

export type HoleScore = {
  holeNumber: number;
  strokes: number;
  grossScoreToPar?: number;
  netScoreToPar?: number;
  stablefordPoints?: number;
  isBirdie?: boolean;
  isEagle?: boolean;
  isBogey?: boolean;
  isDoubleBogey?: boolean;
};

export type CourseHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
};

export type PlayerRow = {
  playerId: string;
  displayName: string;
  bibNumber?: string;
  handicapIndex?: number;
  playingHandicap?: number;
  totalStrokes?: number;
  totalNetScore?: number;
  scoreToPar?: number;
  totalStablefordPoints?: number;
  holesCompleted: number;
  isWithdrawn?: boolean;
  isDisqualified?: boolean;
  holeScores: HoleScore[];
};

type Props = {
  courseHoles: CourseHole[];
  players: PlayerRow[];
  format?: string;
  showNet?: boolean;
  compact?: boolean;
};

function formatToPar(value: number | undefined): string {
  if (value === undefined) return "";
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}

function getScoreClass(grossToPar: number | undefined, isEagle?: boolean, isBirdie?: boolean, isBogey?: boolean, isDoubleBogey?: boolean): string {
  if (isEagle) return "bg-amber-400 text-white font-bold ring-2 ring-amber-500";
  if (isBirdie) return "bg-red-500 text-white font-bold rounded-full";
  if (isDoubleBogey) return "bg-blue-600 text-white font-bold ring-2 ring-blue-700";
  if (isBogey) return "bg-blue-400 text-white font-bold";
  if (grossToPar === 0) return "text-zinc-800 font-semibold";
  if (grossToPar !== undefined && grossToPar <= -3) return "bg-amber-500 text-white font-bold ring-2 ring-amber-600 rounded-full";
  return "text-zinc-800";
}

function ScoreCell({ hole, compact }: { hole: HoleScore | undefined; compact: boolean }) {
  if (!hole) {
    return (
      <td className={cn("border-r border-zinc-700 text-center text-white font-medium", compact ? "px-1 py-1 text-xs" : "px-2 py-2 text-sm")}>
        —
      </td>
    );
  }

  const cls = getScoreClass(hole.grossScoreToPar, hole.isEagle, hole.isBirdie, hole.isBogey, hole.isDoubleBogey);

  return (
    <td className={cn("border-r border-zinc-200 text-center", compact ? "px-1 py-1" : "px-2 py-2")}>
      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded text-sm tabular-nums", cls)}>
        {hole.strokes}
      </span>
    </td>
  );
}

export function HoleByHoleGrid({ courseHoles, players, format = "stroke_play", showNet = false, compact = false }: Props) {
  const isStableford = format === "stableford";

  // Split holes into front 9 and back 9
  const front9 = courseHoles.filter((h) => h.holeNumber <= 9);
  const back9 = courseHoles.filter((h) => h.holeNumber > 9);
  const has18 = courseHoles.length >= 18;

  const frontPar = front9.reduce((sum, h) => sum + h.par, 0);
  const backPar = back9.reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontPar + backPar;

  function getHoleScore(player: PlayerRow, holeNumber: number): HoleScore | undefined {
    return player.holeScores.find((h) => h.holeNumber === holeNumber);
  }

  function getFront9Total(player: PlayerRow): number | undefined {
    const scores = front9.map((h) => getHoleScore(player, h.holeNumber));
    if (scores.every((s) => s === undefined)) return undefined;
    return scores.reduce((sum, s) => sum + (s?.strokes ?? 0), 0);
  }

  function getBack9Total(player: PlayerRow): number | undefined {
    if (!has18) return undefined;
    const scores = back9.map((h) => getHoleScore(player, h.holeNumber));
    if (scores.every((s) => s === undefined)) return undefined;
    return scores.reduce((sum, s) => sum + (s?.strokes ?? 0), 0);
  }

  const cellPad = compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";
  const headerPad = compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-xs";

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-max border-collapse">
        {/* ── Header row: hole numbers ── */}
        <thead>
          <tr className="bg-zinc-800 text-white">
            <th className={cn("sticky left-0 z-10 bg-zinc-800 text-left font-semibold", cellPad, "min-w-[160px]")}>
              Player
            </th>
            {front9.map((h) => (
              <th key={h.holeNumber} className={cn("w-10 text-center font-semibold", headerPad)}>
                {h.holeNumber}
              </th>
            ))}
            <th className={cn("w-12 bg-zinc-700 text-center font-bold", headerPad)}>OUT</th>
            {has18 && back9.map((h) => (
              <th key={h.holeNumber} className={cn("w-10 text-center font-semibold", headerPad)}>
                {h.holeNumber}
              </th>
            ))}
            {has18 && <th className={cn("w-12 bg-zinc-700 text-center font-bold", headerPad)}>IN</th>}
            <th className={cn("w-14 bg-zinc-900 text-center font-bold", headerPad)}>TOT</th>
            <th className={cn("w-14 bg-zinc-900 text-center font-bold", headerPad)}>+/-</th>
            {isStableford && <th className={cn("w-12 bg-zinc-900 text-center font-bold", headerPad)}>SF</th>}
            {showNet && <th className={cn("w-12 bg-zinc-900 text-center font-bold", headerPad)}>NET</th>}
          </tr>

          {/* Par row */}
          <tr className="bg-white text-slate-900">
            <td className={cn("sticky left-0 z-10 bg-white text-left font-black text-slate-900", cellPad)}>
              Par
            </td>
            {front9.map((h) => (
              <td key={h.holeNumber} className={cn("text-center font-medium", cellPad)}>
                {h.par}
              </td>
            ))}
            <td className={cn("bg-emerald-200 text-center font-black text-emerald-900", cellPad)}>{frontPar}</td>
            {has18 && back9.map((h) => (
              <td key={h.holeNumber} className={cn("text-center font-medium", cellPad)}>
                {h.par}
              </td>
            ))}
            {has18 && <td className={cn("bg-emerald-200 text-center font-black text-emerald-900", cellPad)}>{backPar}</td>}
            <td className={cn("bg-emerald-200 text-center font-black text-emerald-900", cellPad)}>{totalPar}</td>
            <td className={cn("bg-emerald-200 text-center", cellPad)}>—</td>
            {isStableford && <td className={cn("bg-emerald-200 text-center", cellPad)}>—</td>}
            {showNet && <td className={cn("bg-emerald-200 text-center", cellPad)}>—</td>}
          </tr>
        </thead>

        {/* ── Player rows ── */}
        <tbody className="divide-y divide-zinc-100">
          {players.map((player, idx) => {
            const front9Total = getFront9Total(player);
            const back9Total = getBack9Total(player);
            const inactive = player.isWithdrawn || player.isDisqualified;

            return (
              <tr
                key={player.playerId}
                className={cn(
                  "transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                  inactive && "text-slate-700 font-bold",
                  "hover:bg-green-50/30"
                )}
              >
                {/* Player name cell */}
                <td className={cn("sticky left-0 z-10 border-r border-zinc-200 font-medium", cellPad, idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50")}>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-slate-900 font-black">{player.displayName}</p>
                      <p className="text-xs text-slate-700 font-bold">
                        {player.bibNumber ? `#${player.bibNumber}` : ""}
                        {player.handicapIndex !== undefined ? ` · HCP ${player.handicapIndex}` : ""}
                      </p>
                    </div>
                    {player.isDisqualified && (
                      <span className="shrink-0 rounded bg-red-100 px-1 py-0.5 text-xs font-bold text-red-700">DQ</span>
                    )}
                    {player.isWithdrawn && (
                      <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-xs font-bold text-amber-700">WD</span>
                    )}
                  </div>
                </td>

                {/* Front 9 hole scores */}
                {front9.map((h) => (
                  <ScoreCell key={h.holeNumber} hole={getHoleScore(player, h.holeNumber)} compact={compact} />
                ))}

                {/* Front 9 total */}
                <td className={cn("border-r border-zinc-200 bg-zinc-100 text-center font-bold tabular-nums text-zinc-800", cellPad)}>
                  {front9Total ?? "—"}
                </td>

                {/* Back 9 hole scores */}
                {has18 && back9.map((h) => (
                  <ScoreCell key={h.holeNumber} hole={getHoleScore(player, h.holeNumber)} compact={compact} />
                ))}

                {/* Back 9 total */}
                {has18 && (
                  <td className={cn("border-r border-emerald-300 bg-emerald-100 text-center font-black tabular-nums text-emerald-900", cellPad)}>
                    {back9Total ?? "—"}
                  </td>
                )}

                {/* Total strokes */}
                <td className={cn("border-r border-emerald-300 bg-white text-center font-black tabular-nums text-slate-900", cellPad)}>
                  {inactive ? "—" : (player.totalStrokes ?? "—")}
                </td>

                {/* Score to par */}
                <td className={cn("border-r border-emerald-300 bg-white text-center font-black tabular-nums", cellPad)}>
                  {inactive ? "—" : (
                    <span className={cn(
                      player.scoreToPar !== undefined && player.scoreToPar < 0 ? "text-red-600" :
                      player.scoreToPar !== undefined && player.scoreToPar > 0 ? "text-blue-600" :
                      "text-slate-900 font-black"
                    )}>
                      {formatToPar(player.scoreToPar)}
                    </span>
                  )}
                </td>

                {/* Stableford */}
                {isStableford && (
                  <td className={cn("border-r border-emerald-300 bg-white text-center font-black tabular-nums text-slate-900", cellPad)}>
                    {inactive ? "—" : (player.totalStablefordPoints ?? "—")}
                  </td>
                )}

                {/* Net score */}
                {showNet && (
                  <td className={cn("bg-white text-center font-black tabular-nums text-slate-900", cellPad)}>
                    {inactive ? "—" : (player.totalNetScore ?? "—")}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-emerald-300 bg-white px-4 py-2 text-xs text-slate-900 font-black">
        <span className="font-black text-slate-900">Legend:</span>
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
        <span className="flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-900 text-xs font-black border border-slate-300">4</span>
          Par
        </span>
      </div>
    </div>
  );
}
