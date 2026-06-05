import type { Id } from "../_generated/dataModel";

export type LeaderboardPlayerRow = {
  playerId: Id<"players">;
  totalStrokes: number;
  totalNetScore: number;
  totalStablefordPoints: number;
  scoreToPar: number;
  holesCompleted: number;
  roundScores: Array<{ roundNumber: number; strokes: number; netScore?: number }>;
  isWithdrawn: boolean;
  isDisqualified: boolean;
};

export type RankAssignment = {
  rank: number;
  rankDisplay: string;
  isTied: boolean;
  tieGroupSize: number;
};

function lastRoundStrokes(row: LeaderboardPlayerRow): number {
  if (row.roundScores.length === 0) return 9999;
  const last = [...row.roundScores].sort((a, b) => b.roundNumber - a.roundNumber)[0];
  return last?.strokes ?? 9999;
}

function inactiveSortKey(row: LeaderboardPlayerRow): number[] {
  if (row.isDisqualified) return [2, 0];
  if (row.isWithdrawn) return [1, 0];
  return [0, 0];
}

/** Lower score is better. Returns negative if `a` ranks ahead of `b`. */
export function compareStrokePlayGross(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): number {
  const inactive = inactiveSortKey(a)[0] - inactiveSortKey(b)[0];
  if (inactive !== 0) return inactive;

  if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
  if (a.holesCompleted !== b.holesCompleted) return b.holesCompleted - a.holesCompleted;
  const lastA = lastRoundStrokes(a);
  const lastB = lastRoundStrokes(b);
  if (lastA !== lastB) return lastA - lastB;
  if (a.totalNetScore !== b.totalNetScore) return a.totalNetScore - b.totalNetScore;
  return String(a.playerId).localeCompare(String(b.playerId));
}

export function compareStrokePlayNet(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): number {
  const inactive = inactiveSortKey(a)[0] - inactiveSortKey(b)[0];
  if (inactive !== 0) return inactive;

  if (a.totalNetScore !== b.totalNetScore) return a.totalNetScore - b.totalNetScore;
  if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
  if (a.holesCompleted !== b.holesCompleted) return b.holesCompleted - a.holesCompleted;
  return String(a.playerId).localeCompare(String(b.playerId));
}

/** Higher stableford points is better. */
export function compareStableford(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): number {
  const inactive = inactiveSortKey(a)[0] - inactiveSortKey(b)[0];
  if (inactive !== 0) return inactive;

  if (a.totalStablefordPoints !== b.totalStablefordPoints) {
    return b.totalStablefordPoints - a.totalStablefordPoints;
  }
  return compareStrokePlayNet(a, b);
}

export function areTiedForGross(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): boolean {
  if (inactiveSortKey(a)[0] !== inactiveSortKey(b)[0]) return false;
  return (
    a.totalStrokes === b.totalStrokes &&
    a.holesCompleted === b.holesCompleted &&
    lastRoundStrokes(a) === lastRoundStrokes(b)
  );
}

export function areTiedForNet(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): boolean {
  if (inactiveSortKey(a)[0] !== inactiveSortKey(b)[0]) return false;
  return a.totalNetScore === b.totalNetScore && a.totalStrokes === b.totalStrokes;
}

export function areTiedForStableford(a: LeaderboardPlayerRow, b: LeaderboardPlayerRow): boolean {
  if (inactiveSortKey(a)[0] !== inactiveSortKey(b)[0]) return false;
  return a.totalStablefordPoints === b.totalStablefordPoints;
}

export function assignRanks(
  sorted: LeaderboardPlayerRow[],
  areTied: (a: LeaderboardPlayerRow, b: LeaderboardPlayerRow) => boolean
): RankAssignment[] {
  const assignments: RankAssignment[] = [];
  let index = 0;

  while (index < sorted.length) {
    let end = index + 1;
    while (end < sorted.length && areTied(sorted[index], sorted[end])) {
      end += 1;
    }

    const tieGroupSize = end - index;
    const rank = index + 1;
    const isTied = tieGroupSize > 1;
    const rankDisplay = isTied ? `T${rank}` : String(rank);

    for (let i = index; i < end; i++) {
      assignments.push({ rank, rankDisplay, isTied, tieGroupSize });
    }
    index = end;
  }

  return assignments;
}

export function sortLeaderboard(
  rows: LeaderboardPlayerRow[],
  compare: (a: LeaderboardPlayerRow, b: LeaderboardPlayerRow) => number
): LeaderboardPlayerRow[] {
  return [...rows].sort(compare);
}
