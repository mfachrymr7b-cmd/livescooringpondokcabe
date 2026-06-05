/**
 * Handicap utilities — client-side mirror of convex/lib/handicap.ts
 * Used for live preview calculations in the UI without crossing the app/backend boundary.
 */

const WHS_SLOPE_STANDARD = 113;

const HANDICAP_ALLOWANCES: Record<string, number> = {
  stroke_play: 1.0,
  stableford:  1.0,
  match_play:  1.0,
  scramble:    0.35,
  best_ball:   0.85,
  skins:       1.0,
};

function calcCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const raw = handicapIndex * (slopeRating / WHS_SLOPE_STANDARD) + (courseRating - par);
  return Math.round(raw);
}

function calcPlayingHandicap(courseHandicap: number, format: string): number {
  const allowance = HANDICAP_ALLOWANCES[format] ?? 1.0;
  return Math.round(courseHandicap * allowance);
}

export function calcTournamentHandicap(params: {
  handicapIndex: number;
  slopeRating: number;
  courseRating: number;
  par: number;
  format: string;
}): { courseHandicap: number; playingHandicap: number; allowance: number } {
  const courseHandicap = calcCourseHandicap(
    params.handicapIndex,
    params.slopeRating,
    params.courseRating,
    params.par
  );
  const allowance = HANDICAP_ALLOWANCES[params.format] ?? 1.0;
  const playingHandicap = calcPlayingHandicap(courseHandicap, params.format);
  return { courseHandicap, playingHandicap, allowance };
}
