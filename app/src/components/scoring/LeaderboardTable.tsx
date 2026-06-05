import { Medal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils";

export interface LiveLeaderboardRow {
  rank: number;
  rankDisplay?: string;
  rankNet?: number;
  rankNetDisplay?: string;
  rankGross?: number;
  isTied?: boolean;
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  bibNumber?: string;
  totalStrokes: number;
  totalNetScore?: number;
  scoreToPar: number;
  holesCompleted: number;
  currentRound?: number;
  isWithdrawn: boolean;
  isDisqualified: boolean;
}

export type LeaderboardView = "gross" | "net";

function formatScoreToPar(scoreToPar: number) {
  if (scoreToPar === 0) return "E";
  return scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar);
}

function scoreToParClass(scoreToPar: number) {
  if (scoreToPar < 0) return "text-red-400 font-bold";
  if (scoreToPar > 0) return "text-sky-400 font-bold";
  return "text-emerald-400 font-bold";
}

function RankCell({
  rank,
  rankDisplay,
  isTied,
  view,
}: {
  rank: number;
  rankDisplay?: string;
  isTied?: boolean;
  view: LeaderboardView;
}) {
  const label = rankDisplay ?? String(rank);
  if (view === "gross" && rank <= 3 && !isTied) {
    const colors = ["text-yellow-400 font-black", "text-slate-300 font-black", "text-orange-400 font-black"];
    const bgColors = ["bg-yellow-900/40", "bg-zinc-700/40", "bg-orange-900/40"];
    return (
      <span className={cn("inline-flex items-center gap-1 font-bold rounded px-2 py-0.5", bgColors[rank - 1])}>
        <Medal className={cn("h-5 w-5", colors[rank - 1])} />
        <span className={colors[rank - 1]}>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-bold text-white">
      {label}
      {isTied && (
        <span className="text-xs font-black text-zinc-300">T</span>
      )}
    </span>
  );
}

function PlayerStatusBadges({
  isWithdrawn,
  isDisqualified,
}: {
  isWithdrawn: boolean;
  isDisqualified: boolean;
}) {
  if (isDisqualified) return <Badge variant="destructive">DQ</Badge>;
  if (isWithdrawn) return <Badge variant="amber">WD</Badge>;
  return null;
}

export function LeaderboardTable({
  rows,
  view,
  holesPerRound = 18,
  compact = false,
  showNetColumn = false,
}: {
  rows: LiveLeaderboardRow[];
  view: LeaderboardView;
  holesPerRound?: number;
  compact?: boolean;
  showNetColumn?: boolean;
}) {
  return (
    <table className={cn("w-full", compact ? "text-sm" : "text-base")}>
      <thead>
        <tr className="border-b-2 border-zinc-700 bg-black text-left text-base font-black uppercase tracking-wider text-white">
          <th className="px-4 py-3">Rank</th>
          <th className="px-4 py-3">Player</th>
          <th className="px-4 py-3 text-right">Thru</th>
          <th className="px-4 py-3 text-right">Gross</th>
          {showNetColumn && <th className="px-4 py-3 text-right">Net</th>}
          <th className="px-4 py-3 text-right">To Par</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800">
        {rows.map((row, rowIndex) => {
          const inactive = row.isWithdrawn || row.isDisqualified;
          const displayRank = view === "net" ? (row.rankNet ?? row.rank) : row.rank;
          const displayRankLabel =
            view === "net"
              ? (row.rankNetDisplay ?? row.rankDisplay ?? String(displayRank))
              : (row.rankDisplay ?? String(displayRank));
          const displayIsTied = row.isTied;
          const thru = inactive ? "—" : `${row.holesCompleted}/${holesPerRound}`;
          const gross = inactive ? "—" : row.totalStrokes;
          const net = inactive ? "—" : (row.totalNetScore ?? row.totalStrokes);

          const isTop3 = displayRank <= 3 && !inactive;
          const isEvenRow = rowIndex % 2 === 0;
          return (
            <tr
              key={row.playerId}
              className={cn(
                "transition-colors",
                isTop3 && "border-l-4 border-emerald-500",
                !isTop3 && isEvenRow && "hover:bg-zinc-800",
                !isTop3 && !isEvenRow && "hover:bg-zinc-800",
                inactive && "opacity-60"
              )}
              style={{
                backgroundColor:
                  isTop3
                    ? displayRank === 1 ? "#1a2e1a"
                    : displayRank === 2 ? "#1a1a2e"
                    : "#2e1a0e"
                  : isEvenRow ? "#111111" : "#000000",
              }}
            >
              <td className="px-4 py-3">
                <RankCell
                  rank={displayRank}
                  rankDisplay={displayRankLabel}
                  isTied={displayIsTied}
                  view={view}
                />
              </td>
              <td className="px-4 py-3">
                <p className="font-black text-white">{row.displayName}</p>
                {(row.bibNumber || row.isWithdrawn || row.isDisqualified) && (
                  <PlayerMeta row={row} />
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">{thru}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">{gross}</td>
              {showNetColumn && (
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-white">{net}</td>
              )}
              <td className="px-4 py-3 text-right tabular-nums font-black">
                {inactive ? (
                  <span className="text-white">—</span>
                ) : (
                  <span className={scoreToParClass(row.scoreToPar)}>
                    {formatScoreToPar(row.scoreToPar)}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PlayerMeta({ row }: { row: LiveLeaderboardRow }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {row.bibNumber && <span className="text-xs font-medium text-zinc-400">#{row.bibNumber}</span>}
      <PlayerStatusBadges isWithdrawn={row.isWithdrawn} isDisqualified={row.isDisqualified} />
    </div>
  );
}
