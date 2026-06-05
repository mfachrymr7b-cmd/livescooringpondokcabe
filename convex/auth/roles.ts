/**
 * ─── Role-Based Access Control ───────────────────────────────────────────────
 *
 * Hierarki role (tertinggi → terendah):
 *   super_admin      (100) → akses penuh, manage semua club & user
 *   club_admin        (75) → manage club sendiri, courses, semua turnamen
 *   tournament_admin  (50) → manage turnamen yang di-assign
 *   player            (10) → akses data sendiri, daftar turnamen
 *
 * Permission matrix:
 *   Action                    | super | club | t_admin | player
 *   --------------------------|-------|------|---------|-------
 *   Manage users              |  ✅   |  ✅  |   ❌    |  ❌
 *   Manage clubs/courses      |  ✅   |  ✅  |   ❌    |  ❌
 *   Create tournament         |  ✅   |  ✅  |   ❌    |  ❌
 *   Manage tournament         |  ✅   |  ✅  |   ✅    |  ❌
 *   Manage tee times          |  ✅   |  ✅  |   ✅    |  ❌
 *   Verify scorecards         |  ✅   |  ✅  |   ✅    |  ❌
 *   Register as player        |  ✅   |  ✅  |   ✅    |  ✅
 *   Submit own scorecard      |  ✅   |  ✅  |   ✅    |  ✅
 *   View leaderboard          |  ✅   |  ✅  |   ✅    |  ✅
 */

import type { UserRole } from "../types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  club_admin: 75,
  tournament_admin: 50,
  player: 10,
};

/** Cek apakah role memiliki privilege >= role target */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/** Cek apakah role bisa manage users */
export function canManageUsers(role: UserRole): boolean {
  return hasMinRole(role, "club_admin");
}

/** Cek apakah role bisa manage courses/clubs */
export function canManageCourses(role: UserRole): boolean {
  return hasMinRole(role, "club_admin");
}

/** Cek apakah role bisa create tournament */
export function canCreateTournament(role: UserRole): boolean {
  return hasMinRole(role, "club_admin");
}

/** Cek apakah role bisa manage tournament (edit, manage players, tee times) */
export function canManageTournament(role: UserRole): boolean {
  return hasMinRole(role, "tournament_admin");
}

/** Cek apakah role bisa verify scorecard */
export function canVerifyScorecard(role: UserRole): boolean {
  return hasMinRole(role, "tournament_admin");
}

/** Semua role bisa register dan submit scorecard sendiri */
export function canParticipate(_role: UserRole): boolean {
  return true;
}

/**
 * Roles yang boleh di-assign oleh role tertentu.
 * super_admin bisa assign semua role.
 * club_admin bisa assign tournament_admin dan player.
 * Lainnya tidak bisa assign role.
 */
export function assignableRoles(byRole: UserRole): UserRole[] {
  if (byRole === "super_admin") {
    return ["super_admin", "club_admin", "tournament_admin", "player"];
  }
  if (byRole === "club_admin") {
    return ["tournament_admin", "player"];
  }
  return [];
}
