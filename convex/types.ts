/**
 * ─── Shared Types & Enums ────────────────────────────────────────────────────
 * Semua literal union types yang dipakai di schema dan validators.
 * Import dari sini agar konsisten di seluruh codebase.
 */

import { v } from "convex/values";

// ─── User ────────────────────────────────────────────────────────────────────

/**
 * Roles (hierarki dari tertinggi ke terendah):
 *   super_admin      → akses penuh ke seluruh sistem
 *   club_admin       → kelola club, courses, dan semua turnamen dalam club
 *   tournament_admin → kelola satu atau lebih turnamen yang di-assign
 *   player           → peserta turnamen, akses terbatas ke data sendiri
 */
export const userRoleValidator = v.union(
  v.literal("super_admin"),
  v.literal("club_admin"),
  v.literal("tournament_admin"),
  v.literal("player")
);
export type UserRole =
  | "super_admin"
  | "club_admin"
  | "tournament_admin"
  | "player";

/** Urutan hierarki role — semakin tinggi angka, semakin tinggi privilege */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  club_admin: 75,
  tournament_admin: 50,
  player: 10,
};

export const userStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("suspended")
);
export type UserStatus = "active" | "inactive" | "suspended";

// ─── Golf Course ─────────────────────────────────────────────────────────────

export const courseDifficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
  v.literal("championship")
);
export type CourseDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "championship";

// ─── Golf Hole ───────────────────────────────────────────────────────────────

export const holeTeeValidator = v.union(
  v.literal("black"),
  v.literal("blue"),
  v.literal("white"),
  v.literal("yellow"),
  v.literal("red")
);
export type HoleTee = "black" | "blue" | "white" | "yellow" | "red";

// ─── Tournament ──────────────────────────────────────────────────────────────

export const tournamentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("registration_open"),
  v.literal("registration_closed"),
  v.literal("ongoing"),
  v.literal("completed"),
  v.literal("cancelled")
);
export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "cancelled";

export const tournamentFormatValidator = v.union(
  v.literal("stroke_play"),
  v.literal("match_play"),
  v.literal("stableford"),
  v.literal("scramble"),
  v.literal("best_ball"),
  v.literal("skins")
);
export type TournamentFormat =
  | "stroke_play"
  | "match_play"
  | "stableford"
  | "scramble"
  | "best_ball"
  | "skins";

export const tournamentFlightStatusValidator = v.union(
  v.literal("draft"),
  v.literal("generated"),
  v.literal("scheduled"),
  v.literal("started"),
  v.literal("completed"),
  v.literal("cancelled")
);
export type TournamentFlightStatus =
  | "draft"
  | "generated"
  | "scheduled"
  | "started"
  | "completed"
  | "cancelled";

// ─── Match ───────────────────────────────────────────────────────────────────

export const matchStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("ongoing"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("walkover")
);
export type MatchStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "walkover";

// ─── Player (tournament participant) ─────────────────────────────────────────

export const playerStatusValidator = v.union(
  v.literal("registered"),
  v.literal("confirmed"),
  v.literal("withdrawn"),
  v.literal("disqualified"),
  v.literal("completed")
);
export type PlayerStatus =
  | "registered"
  | "confirmed"
  | "withdrawn"
  | "disqualified"
  | "completed";

export const handicapCategoryValidator = v.union(
  v.literal("scratch"),
  v.literal("category_1"),
  v.literal("category_2"),
  v.literal("category_3"),
  v.literal("category_4"),
  v.literal("category_5"),
  v.literal("category_6")
);
export type HandicapCategory =
  | "scratch"
  | "category_1"
  | "category_2"
  | "category_3"
  | "category_4"
  | "category_5"
  | "category_6";

// ─── Scorecard ───────────────────────────────────────────────────────────────

export const scorecardStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("submitted"),
  v.literal("verified"),
  v.literal("disputed")
);
export type ScorecardStatus =
  | "in_progress"
  | "submitted"
  | "verified"
  | "disputed";

// ─── Tee Time ────────────────────────────────────────────────────────────────

export const teeTimeStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("checked_in"),
  v.literal("started"),
  v.literal("completed"),
  v.literal("no_show"),
  v.literal("cancelled")
);
export type TeeTimeStatus =
  | "scheduled"
  | "checked_in"
  | "started"
  | "completed"
  | "no_show"
  | "cancelled";
