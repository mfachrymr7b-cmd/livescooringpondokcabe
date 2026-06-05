import type { Id } from "../_generated/dataModel";

export type MatchplayOutcome = "won" | "lost" | "halved" | "pending";

export function matchplayHoleDiff(holesWon: number, holesLost: number): number {
  return holesWon - holesLost;
}

export function outcomeFromDiff(diff: number): MatchplayOutcome {
  if (diff > 0) return "won";
  if (diff < 0) return "lost";
  return "halved";
}

export function formatMatchResult(
  diff: number,
  holesPlayed: number,
  holesDecided: number
): string {
  if (diff === 0) return "Halved";

  const margin = Math.abs(diff);
  const holesRemaining = Math.max(holesPlayed - holesDecided, 0);

  if (holesRemaining > 0 && margin > holesRemaining) {
    return `${margin}&${holesRemaining}`;
  }
  if (diff > 0) return `${margin} UP`;
  return `${margin} DOWN`;
}

export type MatchWinnerResolution = {
  winnerPlayerId: Id<"players"> | null;
  matchResult: string;
  playerA: {
    playerId: Id<"players">;
    outcome: MatchplayOutcome;
    standing: string;
  };
  playerB: {
    playerId: Id<"players">;
    outcome: MatchplayOutcome;
    standing: string;
  };
};

export function resolveHeadToHeadMatch(params: {
  playerAId: Id<"players">;
  playerBId: Id<"players">;
  playerAWon: number;
  playerALost: number;
  playerAStanding?: string;
  playerBWon: number;
  playerBLost: number;
  playerBStanding?: string;
  holesPlayed: number;
  holesDecided: number;
}): MatchWinnerResolution {
  const diffA = matchplayHoleDiff(params.playerAWon, params.playerALost);
  const diffB = matchplayHoleDiff(params.playerBWon, params.playerBLost);
  const outcomeA = outcomeFromDiff(diffA);
  const outcomeB = outcomeFromDiff(diffB);

  const standingA = params.playerAStanding ?? (diffA === 0 ? "AS" : diffA > 0 ? `${diffA} UP` : `${Math.abs(diffA)} DOWN`);
  const standingB = params.playerBStanding ?? (diffB === 0 ? "AS" : diffB > 0 ? `${diffB} UP` : `${Math.abs(diffB)} DOWN`);

  let winnerPlayerId: Id<"players"> | null = null;
  if (diffA > 0) winnerPlayerId = params.playerAId;
  else if (diffA < 0) winnerPlayerId = params.playerBId;

  const matchResult =
    winnerPlayerId === params.playerAId
      ? formatMatchResult(diffA, params.holesPlayed, params.holesDecided)
      : winnerPlayerId === params.playerBId
        ? formatMatchResult(diffB, params.holesPlayed, params.holesDecided)
        : "Halved";

  return {
    winnerPlayerId,
    matchResult,
    playerA: {
      playerId: params.playerAId,
      outcome: outcomeA,
      standing: standingA,
    },
    playerB: {
      playerId: params.playerBId,
      outcome: outcomeB,
      standing: standingB,
    },
  };
}
