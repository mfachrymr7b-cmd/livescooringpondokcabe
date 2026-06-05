/**
 * Golf scoring calculations — gross, net, stableford, match play, and result flags.
 */

export type ScoreResult =
  | "albatross"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double_bogey"
  | "triple_plus";

export type HoleScoreInput = {
  strokes: number;
  putts?: number;
  penaltyStrokes?: number;
  par: number;
  strokeIndex: number;
  playingHandicap?: number;
};

export type ComputedHoleScore = {
  effectiveStrokes: number;
  handicapStrokes: number;
  netStrokes: number;
  grossScoreToPar: number;
  netScoreToPar: number;
  scoreResult: ScoreResult;
  isEagle: boolean;
  isBirdie: boolean;
  isBogey: boolean;
  isDoubleBogey: boolean;
  stablefordPoints: number;
};

/** Strokes received on a hole from course handicap (supports PH > 18). */
export function handicapStrokesOnHole(
  playingHandicap: number | undefined,
  strokeIndex: number
): number {
  if (playingHandicap === undefined || playingHandicap <= 0) return 0;

  const fullRounds = Math.floor(playingHandicap / 18);
  let strokes = fullRounds;
  const remainder = playingHandicap % 18;
  if (remainder >= strokeIndex) strokes += 1;
  return strokes;
}

export function grossScoreToPar(effectiveStrokes: number, par: number): number {
  return effectiveStrokes - par;
}

export function classifyScoreResult(grossToPar: number): ScoreResult {
  if (grossToPar <= -3) return "albatross";
  if (grossToPar === -2) return "eagle";
  if (grossToPar === -1) return "birdie";
  if (grossToPar === 0) return "par";
  if (grossToPar === 1) return "bogey";
  if (grossToPar === 2) return "double_bogey";
  return "triple_plus";
}

/** Standard Stableford points from net score relative to par. */
export function stablefordPointsFromNetToPar(netToPar: number): number {
  if (netToPar <= -3) return 5;
  if (netToPar === -2) return 4;
  if (netToPar === -1) return 3;
  if (netToPar === 0) return 2;
  if (netToPar === 1) return 1;
  return 0;
}

/** Match play hole result: +1 won, 0 halved, -1 lost (by net strokes). */
export function matchplayPointsFromComparison(
  playerNet: number,
  opponentNet: number
): number {
  if (playerNet < opponentNet) return 1;
  if (playerNet > opponentNet) return -1;
  return 0;
}

export function computeHoleScore(input: HoleScoreInput): ComputedHoleScore {
  const effectiveStrokes = input.strokes + (input.penaltyStrokes ?? 0);
  const handicapStrokes = handicapStrokesOnHole(
    input.playingHandicap,
    input.strokeIndex
  );
  const netStrokes = effectiveStrokes - handicapStrokes;
  const grossToPar = grossScoreToPar(effectiveStrokes, input.par);
  const netToPar = netStrokes - input.par;
  const scoreResult = classifyScoreResult(grossToPar);

  return {
    effectiveStrokes,
    handicapStrokes,
    netStrokes,
    grossScoreToPar: grossToPar,
    netScoreToPar: netToPar,
    scoreResult,
    isEagle: grossToPar <= -2,
    isBirdie: grossToPar === -1,
    isBogey: grossToPar === 1,
    isDoubleBogey: grossToPar === 2,
    stablefordPoints: stablefordPointsFromNetToPar(netToPar),
  };
}

export function formatMatchplayStanding(holesWon: number, holesLost: number): string {
  const diff = holesWon - holesLost;
  if (diff === 0) return "AS";
  if (diff > 0) return `${diff} UP`;
  return `${Math.abs(diff)} DOWN`;
}
