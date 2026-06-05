import { Medal, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils";
import type { HoleScore } from "./HoleByHoleGrid";
import type { LiveLeaderboardRow } from "./LeaderboardTable";

type BroadcastLeaderboardRow = LiveLeaderboardRow & {
  holeScores: HoleScore[];
  handicapIndex?: number;
  totalStablefordPoints?: number;
};

export function BroadcastLeaderboardDisplay({
  rows,
  displayPosition,
  totalRows,
  holesPerRound = 18,
}: {
  rows: BroadcastLeaderboardRow[];
  displayPosition: number;
  totalRows: number;
  holesPerRound?: number;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Leaderboard Header */}
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-emerald-400" />
          Rankings
        </h2>
        <p className="text-base text-white mt-1 font-black">
          Showing {displayPosition}–{Math.min(displayPosition + rows.length - 1, totalRows)} of {totalRows}
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 bg-gradient-to-b from-emerald-950/80 to-black/60 rounded-lg border-2 border-emerald-600 overflow-hidden flex flex-col min-h-0 shadow-lg">
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-800 to-green-800 border-b-2 border-emerald-900 sticky top-0">
              <tr className="text-left text-lg font-black text-white uppercase tracking-widest">
                <th className="px-6 py-4 w-16">Rank</th>
                <th className="px-6 py-4 flex-1">Player</th>
                <th className="px-6 py-4 w-24 text-center">Thru</th>
                <th className="px-6 py-4 w-28 text-right">Score</th>
                <th className="px-6 py-4 w-24 text-right">To Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {rows.map((row, idx) => (
                <BroadcastLeaderboardRow
                  key={row.playerId}
                  row={row}
                  position={displayPosition + idx}
                  isTopThree={row.rank <= 3 && !row.isWithdrawn && !row.isDisqualified}
                  holesPerRound={holesPerRound}
                />
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-emerald-300 font-semibold text-lg">
            Belum ada peserta
          </div>
        )}
      </div>
    </div>
  );
}

function BroadcastLeaderboardRow({
  row,
  position,
  isTopThree,
  holesPerRound,
}: {
  row: LiveLeaderboardRow;
  position: number;
  isTopThree: boolean;
  holesPerRound: number;
}) {
  const inactive = row.isWithdrawn || row.isDisqualified;
  const displayName = row.displayName;
  const thru = inactive ? "—" : row.holesCompleted >= holesPerRound ? "F" : `${row.holesCompleted}/${holesPerRound}`;
  const score = inactive ? "—" : row.totalStrokes;

  function formatScoreToPar(scoreToPar: number) {
    if (scoreToPar === 0) return "E";
    return scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar);
  }

  function scoreToParClass(scoreToPar: number) {
    if (scoreToPar < 0) return "text-red-600 font-bold";
    if (scoreToPar > 0) return "text-blue-700 font-bold";
    return "text-emerald-700 font-bold";
  }

  return (
    <tr
      className={cn(
        "text-lg font-semibold transition-all border-b-2 border-emerald-300",
        isTopThree ? "bg-gradient-to-r from-emerald-200 to-green-200" : inactive ? "bg-gray-300" : (position % 2 === 0 ? "bg-white hover:bg-emerald-50" : "bg-emerald-100/50 hover:bg-emerald-100"),
        isTopThree && "border-l-4 border-emerald-700"
      )}
    >
      {/* Rank */}
      <td className="px-6 py-4 w-16">
        <div className="flex items-center gap-2">
          {isTopThree && (
            <Medal
              className={cn(
                "h-8 w-8",
                row.rank === 1 && "text-yellow-600",
                row.rank === 2 && "text-slate-400",
                row.rank === 3 && "text-orange-600"
              )}
            />
          )}
          <span
            className={cn(
              "font-black text-2xl",
              isTopThree && "text-emerald-900 bg-emerald-300 px-2 py-1 rounded",
              !isTopThree && "text-slate-900"
            )}
          >
            {position}
          </span>
          {row.isTied && <span className="text-sm text-slate-900 font-black">T</span>}
        </div>
      </td>

      {/* Player Name */}
      <td className="px-6 py-4 flex-1">
          <div className="flex items-center gap-3">
          {row.avatarUrl && (
            <img
              src={row.avatarUrl}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover border-2 border-emerald-600 shadow-md"
            />
          )}
          <div className="flex-1">
            <p className={cn("text-xl font-black", isTopThree ? "text-emerald-900" : "text-slate-900")}>
              {displayName}
            </p>
            {row.bibNumber && (
              <p className="text-sm font-black text-slate-900">#{row.bibNumber}</p>
            )}
          </div>
          {row.isDisqualified && (
            <Badge variant="destructive" className="text-xs">
              DQ
            </Badge>
          )}
          {row.isWithdrawn && (
            <Badge variant="amber" className="text-xs">
              WD
            </Badge>
          )}
        </div>
      </td>

      {/* Thru */}
      <td className="px-6 py-4 w-24 text-center">
        <span className="font-mono text-white text-3xl font-black bg-emerald-700 px-3 py-2 rounded shadow-md">{thru}</span>
      </td>

      {/* Score */}
      <td className="px-6 py-4 w-28 text-right">
        <span
          className={cn(
            "font-mono font-black text-4xl",
            isTopThree ? "text-emerald-900" : "text-slate-900"
          )}
        >
          {score}
        </span>
      </td>

      {/* To Par */}
      <td className="px-6 py-4 w-24 text-right">
        <span
          className={cn(
            "font-mono font-black text-3xl",
            scoreToParClass(row.scoreToPar)
          )}
        >
          {inactive ? "—" : formatScoreToPar(row.scoreToPar)}
        </span>
      </td>
    </tr>
  );
}
