/**
 * Shared TypeScript types untuk seluruh app.
 * Re-export dari modules/convex/types untuk convenience.
 */

export type {
  GolfCourse,
  GolfHole,
  Tournament,
  Player,
  Scorecard,
  ScorecardHole,
  LeaderboardEntry,
} from "@/modules/convex/types";

/** Role user */
export type UserRole = "super_admin" | "club_admin" | "tournament_admin" | "player";

/** Status user */
export type UserStatus = "active" | "inactive" | "suspended";

/** Status turnamen */
export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

/** Format turnamen */
export type TournamentFormat =
  | "stroke_play"
  | "match_play"
  | "stableford"
  | "scramble"
  | "best_ball"
  | "skins";

/** Status match */
export type MatchStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "walkover";

/** Pagination options */
export interface PaginationOpts {
  numItems: number;
  cursor: string | null;
}

/** Generic paginated result */
export interface PaginatedResult<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
}
