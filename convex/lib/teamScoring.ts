/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MATCH PLAY & TEAM SCORING
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comprehensive match play scoring, team scoring, and nine-hole calculations.
 * Used for:
 * - Head-to-head match play
 * - Best ball & alternate shot team formats
 * - Tournament bracket resolution
 * - Front nine / back nine reporting
 */

// ═══════════════════════════════════════════════════════════════════════════════
// HOLE-BY-HOLE WINNER DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

export type HoleWinner = "player_a" | "player_b" | "halved" | "pending";

export interface HoleComparison {
  playerANet: number;
  playerBNet: number;
  playerAPar: number;
  playerBPar: number;
  holeNumber: number;
}

/**
 * Determine hole winner based on net strokes.
 * Lower net score wins the hole.
 */
export function determineHoleWinner(comparison: HoleComparison): HoleWinner {
  if (comparison.playerANet < comparison.playerBNet) return "player_a";
  if (comparison.playerANet > comparison.playerBNet) return "player_b";
  return "halved";
}

/**
 * Calculate net strokes for hole (after handicap).
 */
export function calculateNetForHole(
  grossStrokes: number,
  handicapStrokes: number,
  penaltyStrokes: number = 0
): number {
  return grossStrokes + penaltyStrokes - handicapStrokes;
}

/**
 * Determine hole result (won/lost/halved) and assign match play points.
 * Returns: +1 = won, 0 = halved, -1 = lost
 */
export function getHolePoints(winner: HoleWinner, perspective: "player_a" | "player_b"): number {
  if (winner === "halved") return 0;
  if (winner === "pending") return 0;
  return perspective === winner ? 1 : -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH PLAY STANDING TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchPlayStanding {
  holesWon: number;
  holesLost: number;
  holesHalved: number;
  standing: string;
  status: "leading" | "trailing" | "all_square" | "pending";
  holesRemaining: number;
  canWin: boolean;
  canLose: boolean;
}

/**
 * Calculate complete match play standing with win/loss probabilities.
 */
export function calculateMatchPlayStanding(
  holesWon: number,
  holesLost: number,
  holesHalved: number,
  totalHoles: number
): MatchPlayStanding {
  const holesPlayed = holesWon + holesLost + holesHalved;
  const holesRemaining = Math.max(0, totalHoles - holesPlayed);
  const diff = holesWon - holesLost;

  let standing = "AS";
  let status: "leading" | "trailing" | "all_square" | "pending" = "all_square";

  if (diff > 0) {
    standing = `${diff} UP`;
    status = "leading";
  } else if (diff < 0) {
    standing = `${Math.abs(diff)} DOWN`;
    status = "trailing";
  }

  // Determine if win/loss is still possible
  const canWin = Math.abs(diff) <= holesRemaining || holesRemaining >= 0;
  const canLose = Math.abs(diff) <= holesRemaining || holesRemaining >= 0;

  return {
    holesWon,
    holesLost,
    holesHalved,
    standing,
    status,
    holesRemaining,
    canWin,
    canLose,
  };
}

/**
 * Format match play standing for display.
 * E.g., "2 UP", "AS", "3 DOWN"
 */
export function formatMatchPlayStanding(
  holesWon: number,
  holesLost: number
): string {
  const diff = holesWon - holesLost;
  if (diff === 0) return "AS";
  if (diff > 0) return `${diff} UP`;
  return `${Math.abs(diff)} DOWN`;
}

/**
 * Format match result for display after completion.
 * E.g., "2&1", "Halved", "1 UP"
 */
export function formatMatchResult(
  holesWon: number,
  holesLost: number,
  totalHoles: number,
  holesDecided: number
): string {
  const diff = holesWon - holesLost;

  if (diff === 0) return "Halved";

  const margin = Math.abs(diff);
  const holesRemaining = Math.max(0, totalHoles - holesDecided);

  // If match is decided (can't be overturned) — show margin & holes
  if (holesRemaining > 0 && margin > holesRemaining) {
    return `${margin}&${holesRemaining}`;
  }

  // If all holes played
  if (holesRemaining === 0) {
    return `${diff > 0 ? "Win" : "Loss"} ${margin}`;
  }

  // Match still in progress
  return diff > 0 ? `${margin} UP` : `${Math.abs(diff)} DOWN`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM SCORING (Best Ball, Alternate Shot, Better Ball)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TeamScoreResult {
  teamAScore: number;
  teamBScore: number;
  holeWinner: "team_a" | "team_b" | "halved";
  teamALow: number;
  teamBLow: number;
}

/**
 * Best Ball (Four Ball): Best score of each team wins hole.
 * Compare each team's best (lowest) score.
 */
export function bestBallWinner(
  playerA1Net: number,
  playerA2Net: number,
  playerB1Net: number,
  playerB2Net: number
): TeamScoreResult {
  const teamALow = Math.min(playerA1Net, playerA2Net);
  const teamBLow = Math.min(playerB1Net, playerB2Net);

  let holeWinner: "team_a" | "team_b" | "halved";
  if (teamALow < teamBLow) holeWinner = "team_a";
  else if (teamALow > teamBLow) holeWinner = "team_b";
  else holeWinner = "halved";

  return {
    teamAScore: teamALow,
    teamBScore: teamBLow,
    holeWinner,
    teamALow,
    teamBLow,
  };
}

/**
 * Alternate Shot (Chapman): Each player hits twice, best shot selected, partner plays it.
 * For calculation: typically use combined net score (both players' net on hole).
 */
export function alternateShotWinner(
  playerA1Net: number,
  playerA2Net: number,
  playerB1Net: number,
  playerB2Net: number,
  finalShotType: "best_of_2" | "combined" = "combined"
): TeamScoreResult {
  let teamAScore: number;
  let teamBScore: number;

  if (finalShotType === "best_of_2") {
    teamAScore = Math.min(playerA1Net, playerA2Net);
    teamBScore = Math.min(playerB1Net, playerB2Net);
  } else {
    // Combined: add all 4 shots
    teamAScore = playerA1Net + playerA2Net;
    teamBScore = playerB1Net + playerB2Net;
  }

  let holeWinner: "team_a" | "team_b" | "halved";
  if (teamAScore < teamBScore) holeWinner = "team_a";
  else if (teamAScore > teamBScore) holeWinner = "team_b";
  else holeWinner = "halved";

  return {
    teamAScore,
    teamBScore,
    holeWinner,
    teamALow: Math.min(playerA1Net, playerA2Net),
    teamBLow: Math.min(playerB1Net, playerB2Net),
  };
}

/**
 * Better Ball: Compare each team's best score, accumulate total.
 */
export function betterBallTotal(
  player1Gross: number,
  player2Gross: number,
  coursePar: number
): number {
  const best = Math.min(player1Gross, player2Gross);
  return best - coursePar;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NINE-HOLE TRACKING & SPLITS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NineHoleScore {
  holeNumbers: number[];
  strokes: number;
  netStrokes: number;
  scoreToPar: number;
  stablefordPoints?: number;
  holesCount: number;
}

/**
 * Calculate front nine scores from hole array.
 * Holes 1-9
 */
export function calculateFrontNine(
  holes: Array<{
    holeNumber: number;
    strokes: number;
    netStrokes: number;
    grossScoreToPar: number;
    stablefordPoints?: number;
  }>,
  courseFrontPar: number = 36
): NineHoleScore | null {
  const frontHoles = holes.filter((h) => h.holeNumber >= 1 && h.holeNumber <= 9);
  if (frontHoles.length === 0) return null;

  const strokes = frontHoles.reduce((sum, h) => sum + h.strokes, 0);
  const netStrokes = frontHoles.reduce((sum, h) => sum + h.netStrokes, 0);
  const stablefordPoints = frontHoles.reduce((sum, h) => sum + (h.stablefordPoints ?? 0), 0);

  return {
    holeNumbers: frontHoles.map((h) => h.holeNumber),
    strokes,
    netStrokes,
    scoreToPar: strokes - courseFrontPar,
    stablefordPoints: frontHoles.some((h) => h.stablefordPoints !== undefined)
      ? stablefordPoints
      : undefined,
    holesCount: frontHoles.length,
  };
}

/**
 * Calculate back nine scores from hole array.
 * Holes 10-18
 */
export function calculateBackNine(
  holes: Array<{
    holeNumber: number;
    strokes: number;
    netStrokes: number;
    grossScoreToPar: number;
    stablefordPoints?: number;
  }>,
  courseBackPar: number = 36
): NineHoleScore | null {
  const backHoles = holes.filter((h) => h.holeNumber >= 10 && h.holeNumber <= 18);
  if (backHoles.length === 0) return null;

  const strokes = backHoles.reduce((sum, h) => sum + h.strokes, 0);
  const netStrokes = backHoles.reduce((sum, h) => sum + h.netStrokes, 0);
  const stablefordPoints = backHoles.reduce((sum, h) => sum + (h.stablefordPoints ?? 0), 0);

  return {
    holeNumbers: backHoles.map((h) => h.holeNumber),
    strokes,
    netStrokes,
    scoreToPar: strokes - courseBackPar,
    stablefordPoints: backHoles.some((h) => h.stablefordPoints !== undefined)
      ? stablefordPoints
      : undefined,
    holesCount: backHoles.length,
  };
}

/**
 * Split 18 holes into front/back nine for both players.
 * Useful for score card display and in-tournament comparisons.
 */
export function splitNinesForComparison(
  playerAHoles: Array<{ holeNumber: number; netStrokes: number }>,
  playerBHoles: Array<{ holeNumber: number; netStrokes: number }>,
  frontPar: number = 36,
  backPar: number = 36
) {
  const frontA = playerAHoles.filter((h) => h.holeNumber >= 1 && h.holeNumber <= 9);
  const backA = playerAHoles.filter((h) => h.holeNumber >= 10 && h.holeNumber <= 18);
  const frontB = playerBHoles.filter((h) => h.holeNumber >= 1 && h.holeNumber <= 9);
  const backB = playerBHoles.filter((h) => h.holeNumber >= 10 && h.holeNumber <= 18);

  const frontATotal = frontA.reduce((sum, h) => sum + h.netStrokes, 0);
  const backATotal = backA.reduce((sum, h) => sum + h.netStrokes, 0);
  const frontBTotal = frontB.reduce((sum, h) => sum + h.netStrokes, 0);
  const backBTotal = backB.reduce((sum, h) => sum + h.netStrokes, 0);

  return {
    front: {
      playerA: {
        strokes: frontATotal,
        scoreToPar: frontATotal - frontPar,
        holesCompleted: frontA.length,
      },
      playerB: {
        strokes: frontBTotal,
        scoreToPar: frontBTotal - frontPar,
        holesCompleted: frontB.length,
      },
    },
    back: {
      playerA: {
        strokes: backATotal,
        scoreToPar: backATotal - backPar,
        holesCompleted: backA.length,
      },
      playerB: {
        strokes: backBTotal,
        scoreToPar: backBTotal - backPar,
        holesCompleted: backB.length,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCH PLAY DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchPlayDisplay {
  playerA: {
    displayName: string;
    holesWon: number;
    holesLost: number;
    holesHalved: number;
    standing: string;
    status: string;
  };
  playerB: {
    displayName: string;
    holesWon: number;
    holesLost: number;
    holesHalved: number;
    standing: string;
    status: string;
  };
  matchStatus: "ongoing" | "playerA_won" | "playerB_won" | "halved";
  holesRemaining: number;
}

/**
 * Build match play display for showing on leaderboard/broadcast.
 */
export function buildMatchPlayDisplay(
  playerAName: string,
  playerAWon: number,
  playerALost: number,
  playerAHalved: number,
  playerBName: string,
  playerBWon: number,
  playerBLost: number,
  playerBHalved: number,
  totalHoles: number = 18
): MatchPlayDisplay {
  const played = playerAWon + playerALost + playerAHalved;
  const remaining = Math.max(0, totalHoles - played);

  const standingA = formatMatchPlayStanding(playerAWon, playerALost);
  const standingB = formatMatchPlayStanding(playerBWon, playerBLost);

  const diffA = playerAWon - playerALost;
  let matchStatus: "ongoing" | "playerA_won" | "playerB_won" | "halved" = "ongoing";
  if (diffA > 0 && remaining < Math.abs(diffA)) matchStatus = "playerA_won";
  else if (diffA < 0 && remaining < Math.abs(diffA)) matchStatus = "playerB_won";
  else if (diffA === 0 && remaining === 0) matchStatus = "halved";

  return {
    playerA: {
      displayName: playerAName,
      holesWon: playerAWon,
      holesLost: playerALost,
      holesHalved: playerAHalved,
      standing: standingA,
      status: matchStatus === "playerA_won" ? "Won" : matchStatus === "ongoing" ? "Playing" : diffA > 0 ? "Leading" : "Trailing",
    },
    playerB: {
      displayName: playerBName,
      holesWon: playerBWon,
      holesLost: playerBLost,
      holesHalved: playerBHalved,
      standing: standingB,
      status: matchStatus === "playerB_won" ? "Won" : matchStatus === "ongoing" ? "Playing" : diffA > 0 ? "Trailing" : "Leading",
    },
    matchStatus,
    holesRemaining: remaining,
  };
}
