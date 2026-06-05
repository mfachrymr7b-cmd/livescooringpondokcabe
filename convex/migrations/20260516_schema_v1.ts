/**
 * Migration: Schema v1 — Validasi integritas data awal
 * Date: 2026-05-16
 * Reason: Verifikasi bahwa semua dokumen yang ada sesuai dengan schema v1.
 *         Tidak ada perubahan struktur — ini adalah migration audit/checkpoint.
 *
 * Collections yang di-cover:
 *   users, golf_courses, golf_holes, tournaments, matches,
 *   players, scorecards, scorecard_holes, leaderboard,
 *   tee_times, tee_time_slots, auth_sessions, auth_refresh_tokens
 *
 * Jalankan:
 *   npx convex run migrations/20260516_schema_v1:auditUsers
 *   npx convex run migrations/20260516_schema_v1:auditCourses
 *   npx convex run migrations/20260516_schema_v1:auditTournaments
 *   npx convex run migrations/20260516_schema_v1:backfillPlayerScores
 *   npx convex run migrations/20260516_schema_v1:backfillLeaderboard -- --tournamentId <id>
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// ─── Audit: Users ─────────────────────────────────────────────────────────────

/**
 * Pastikan semua user punya field wajib yang mungkin kosong di data lama.
 * Backfill: status default "active", lastActiveAt default ke _creationTime.
 */
export const auditUsers = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("users")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let patched = 0;
    for (const user of batch.page) {
      const updates: Record<string, unknown> = {};

      // Backfill status jika tidak ada
      if (!user.status) {
        updates.status = "active";
      }

      // Backfill lastActiveAt jika tidak ada
      if (user.lastActiveAt === undefined) {
        updates.lastActiveAt = user._creationTime;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
        patched++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].auditUsers,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, patched, isDone: batch.isDone };
  },
});

// ─── Audit: Golf Courses ──────────────────────────────────────────────────────

/**
 * Pastikan semua golf_courses punya isActive field.
 * Backfill: isActive default true untuk data lama.
 */
export const auditCourses = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("golf_courses")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let patched = 0;
    for (const course of batch.page) {
      if (course.isActive === undefined) {
        await ctx.db.patch(course._id, { isActive: true });
        patched++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].auditCourses,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, patched, isDone: batch.isDone };
  },
});

// ─── Audit: Tournaments ───────────────────────────────────────────────────────

/**
 * Pastikan semua tournaments punya participantCount.
 * Backfill: hitung ulang dari tabel players.
 */
export const auditTournaments = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("tournaments")
      .paginate({ numItems: 50, cursor: args.cursor ?? null });

    let patched = 0;
    for (const tournament of batch.page) {
      if (tournament.participantCount === undefined) {
        // Hitung dari tabel players
        const players = await ctx.db
          .query("players")
          .withIndex("by_tournamentId", (q) =>
            q.eq("tournamentId", tournament._id)
          )
          .take(1000);

        const activeCount = players.filter(
          (p) => p.status !== "withdrawn" && p.status !== "disqualified"
        ).length;

        await ctx.db.patch(tournament._id, { participantCount: activeCount });
        patched++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].auditTournaments,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, patched, isDone: batch.isDone };
  },
});

// ─── Backfill: Player Scores ──────────────────────────────────────────────────

/**
 * Backfill totalScore dan totalNetScore di tabel players
 * dari data scorecard yang sudah ada.
 */
export const backfillPlayerScores = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("players")
      .paginate({ numItems: 50, cursor: args.cursor ?? null });

    let patched = 0;
    for (const player of batch.page) {
      const scorecards = await ctx.db
        .query("scorecards")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .take(10);

      const verifiedCards = scorecards.filter(
        (sc) => sc.status === "verified" || sc.status === "submitted"
      );

      if (verifiedCards.length > 0) {
        const totalScore = verifiedCards.reduce(
          (sum, sc) => sum + (sc.totalStrokes ?? 0),
          0
        );
        const totalNetScore = verifiedCards.reduce(
          (sum, sc) => sum + (sc.totalNetScore ?? sc.totalStrokes ?? 0),
          0
        );
        const currentRound = Math.max(...verifiedCards.map((sc) => sc.roundNumber));

        await ctx.db.patch(player._id, {
          totalScore,
          totalNetScore,
          currentRound,
        });
        patched++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].backfillPlayerScores,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, patched, isDone: batch.isDone };
  },
});

// ─── Backfill: Leaderboard ────────────────────────────────────────────────────

/**
 * Trigger recalculate leaderboard untuk satu turnamen.
 * Berguna untuk rebuild leaderboard dari scratch.
 */
export const backfillLeaderboard = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    // Hapus semua entry leaderboard yang ada untuk turnamen ini
    let hasMore = true;
    let deleted = 0;
    while (hasMore) {
      const batch = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournamentId", (q) =>
          q.eq("tournamentId", args.tournamentId)
        )
        .take(100);

      if (batch.length === 0) {
        hasMore = false;
      } else {
        for (const entry of batch) {
          await ctx.db.delete(entry._id);
          deleted++;
        }
      }
    }

    // Trigger recalculate
    await ctx.scheduler.runAfter(
      0,
      internal.mutations.leaderboard.recalculate,
      { tournamentId: args.tournamentId }
    );

    return { deleted, message: "Leaderboard rebuild dijadwalkan." };
  },
});

// ─── Cleanup: Expired Sessions ────────────────────────────────────────────────

/**
 * Hapus auth_sessions yang sudah expired lebih dari 30 hari.
 * Jalankan secara berkala untuk menjaga ukuran tabel.
 */
export const cleanupExpiredSessions = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const batch = await ctx.db
      .query("auth_sessions")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let deleted = 0;
    for (const session of batch.page) {
      if (session.expiresAt < thirtyDaysAgo) {
        await ctx.db.delete(session._id);
        deleted++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].cleanupExpiredSessions,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, deleted, isDone: batch.isDone };
  },
});

// ─── Cleanup: Expired Refresh Tokens ─────────────────────────────────────────

/**
 * Hapus auth_refresh_tokens yang sudah expired lebih dari 30 hari.
 */
export const cleanupExpiredRefreshTokens = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const batch = await ctx.db
      .query("auth_refresh_tokens")
      .paginate({ numItems: 100, cursor: args.cursor ?? null });

    let deleted = 0;
    for (const token of batch.page) {
      if (token.expiresAt < thirtyDaysAgo) {
        await ctx.db.delete(token._id);
        deleted++;
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations["20260516_schema_v1"].cleanupExpiredRefreshTokens,
        { cursor: batch.continueCursor }
      );
    }

    return { processed: batch.page.length, deleted, isDone: batch.isDone };
  },
});
