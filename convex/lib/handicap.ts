/**
 * ─── Handicap Calculation (WHS / EGA) ────────────────────────────────────────
 *
 * World Handicap System (WHS) formulas:
 *   Score Differential = (113 / Slope Rating) × (Adjusted Gross Score − Course Rating)
 *   Handicap Index     = Average of best 8 of last 20 differentials × 0.96
 *   Course Handicap    = round(Handicap Index × (Slope Rating / 113) + (Course Rating − Par))
 *   Playing Handicap   = round(Course Handicap × Allowance%)
 */

export const WHS_SLOPE_STANDARD = 113;
export const WHS_DIFFERENTIALS_USED = 8;
export const WHS_DIFFERENTIALS_TOTAL = 20;
export const WHS_ADJUSTMENT_FACTOR = 0.96;

/** Handicap allowances per format (WHS recommended) */
export const HANDICAP_ALLOWANCES: Record<string, number> = {
  stroke_play: 1.0,       // 100%
  stableford: 1.0,        // 100%
  match_play: 1.0,        // 100%
  scramble: 0.35,         // 35% of lower, 15% of higher (simplified: 35%)
  best_ball: 0.85,        // 85%
  skins: 1.0,             // 100%
};

/**
 * Calculate WHS Score Differential for one round.
 * @param adjustedGrossScore - Gross score after max hole score adjustments
 * @param courseRating - Course rating (e.g. 71.4)
 * @param slopeRating - Slope rating (e.g. 125)
 */
export function calcScoreDifferential(
  adjustedGrossScore: number,
  courseRating: number,
  slopeRating: number
): number {
  return (WHS_SLOPE_STANDARD / slopeRating) * (adjustedGrossScore - courseRating);
}

/**
 * Calculate Handicap Index from an array of score differentials.
 * Uses best 8 of last 20 differentials × 0.96.
 */
export function calcHandicapIndex(differentials: number[]): number {
  if (differentials.length === 0) return 0;

  // Take last 20
  const recent = differentials.slice(-WHS_DIFFERENTIALS_TOTAL);

  // Sort ascending, take best 8
  const sorted = [...recent].sort((a, b) => a - b);
  const best = sorted.slice(0, Math.min(WHS_DIFFERENTIALS_USED, sorted.length));

  const avg = best.reduce((sum, d) => sum + d, 0) / best.length;
  const index = avg * WHS_ADJUSTMENT_FACTOR;

  // Cap at 54.0 (WHS max)
  return Math.min(Math.round(index * 10) / 10, 54.0);
}

/**
 * Calculate Course Handicap from Handicap Index.
 * Course Handicap = round(HI × (Slope / 113) + (Course Rating − Par))
 */
export function calcCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const raw = handicapIndex * (slopeRating / WHS_SLOPE_STANDARD) + (courseRating - par);
  return Math.round(raw);
}

/**
 * Calculate Playing Handicap (what's actually used on the course).
 * Playing Handicap = round(Course Handicap × Allowance%)
 */
export function calcPlayingHandicap(
  courseHandicap: number,
  format: string,
  allowanceOverride?: number
): number {
  const allowance = allowanceOverride ?? HANDICAP_ALLOWANCES[format] ?? 1.0;
  return Math.round(courseHandicap * allowance);
}

/**
 * Full handicap calculation pipeline for a player entering a tournament.
 */
export function calcTournamentHandicap(params: {
  handicapIndex: number;
  slopeRating: number;
  courseRating: number;
  par: number;
  format: string;
  allowanceOverride?: number;
}): {
  courseHandicap: number;
  playingHandicap: number;
  allowance: number;
} {
  const courseHandicap = calcCourseHandicap(
    params.handicapIndex,
    params.slopeRating,
    params.courseRating,
    params.par
  );
  const allowance = params.allowanceOverride ?? HANDICAP_ALLOWANCES[params.format] ?? 1.0;
  const playingHandicap = calcPlayingHandicap(courseHandicap, params.format, allowance);

  return { courseHandicap, playingHandicap, allowance };
}

/**
 * Adjusted Gross Score (AGS) — cap each hole at Net Double Bogey.
 * Net Double Bogey = Par + 2 + Handicap Strokes on hole
 */
export function adjustedGrossScore(
  holeScores: Array<{ strokes: number; par: number; handicapStrokes: number }>
): number {
  return holeScores.reduce((total, hole) => {
    const maxScore = hole.par + 2 + hole.handicapStrokes;
    return total + Math.min(hole.strokes, maxScore);
  }, 0);
}

/**
 * Handicap category from index (Indonesian Golf Association style).
 *
 * Kategori berdasarkan Handicap Index:
 *   Category 1 (Elit):      index < 5.5
 *   Category 2 (Lanjut):    5.5 ≤ index ≤ 12.4
 *   Category 3 (Menengah):  12.5 ≤ index ≤ 18.4
 *   Category 4 (Rekreasi):  18.5 ≤ index ≤ 26.4
 *   Category 5 (Amatir):    26.5 ≤ index ≤ 36.0
 *   Category 6 (Pemula):    37.0 ≤ index ≤ 54.0
 */
export function handicapCategory(index: number): string {
  if (index <= 0) return "scratch";
  if (index < 5.5) return "category_1";    // Elit
  if (index <= 12.4) return "category_2";  // Lanjut
  if (index <= 18.4) return "category_3";  // Menengah
  if (index <= 26.4) return "category_4";  // Rekreasi
  if (index <= 36.0) return "category_5";  // Amatir
  return "category_6";                     // Pemula (37.0 - 54.0)
}
