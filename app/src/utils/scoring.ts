/**
 * Client-side mirror of convex/lib/scoring.ts for live draft previews.
 */

export type ScoreResult =
  | "albatross"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double_bogey"
  | "triple_plus";

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

export function computeNetStrokes(
  strokes: number,
  penaltyStrokes: number | undefined,
  playingHandicap: number | undefined,
  strokeIndex: number
): number {
  const effective = strokes + (penaltyStrokes ?? 0);
  return effective - handicapStrokesOnHole(playingHandicap, strokeIndex);
}

export function scoreResultLabel(result: ScoreResult): string {
  const labels: Record<ScoreResult, string> = {
    albatross: "Albatross",
    eagle: "Eagle",
    birdie: "Birdie",
    par: "Par",
    bogey: "Bogey",
    double_bogey: "Double Bogey",
    triple_plus: "Triple+",
  };
  return labels[result];
}

export function classifyGrossToPar(grossToPar: number): ScoreResult {
  if (grossToPar <= -3) return "albatross";
  if (grossToPar === -2) return "eagle";
  if (grossToPar === -1) return "birdie";
  if (grossToPar === 0) return "par";
  if (grossToPar === 1) return "bogey";
  if (grossToPar === 2) return "double_bogey";
  return "triple_plus";
}

export function scoreResultFromHole(hole: {
  isEagle?: boolean;
  isBirdie?: boolean;
  isBogey?: boolean;
  isDoubleBogey?: boolean;
  grossScoreToPar?: number;
}): ScoreResult | null {
  if (hole.grossScoreToPar !== undefined) {
    if (hole.grossScoreToPar <= -3) return "albatross";
    if (hole.grossScoreToPar === -2) return "eagle";
    if (hole.grossScoreToPar === -1) return "birdie";
    if (hole.grossScoreToPar === 0) return "par";
    if (hole.grossScoreToPar === 1) return "bogey";
    if (hole.grossScoreToPar === 2) return "double_bogey";
    if (hole.grossScoreToPar >= 3) return "triple_plus";
  }
  if (hole.isEagle) return "eagle";
  if (hole.isBirdie) return "birdie";
  if (hole.isDoubleBogey) return "double_bogey";
  if (hole.isBogey) return "bogey";
  return null;
}

export function holeStatusFromSaved(saved: boolean): "saved" | "open" {
  return saved ? "saved" : "open";
}
