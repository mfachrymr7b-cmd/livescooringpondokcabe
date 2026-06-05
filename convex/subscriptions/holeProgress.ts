/**
 * ─── Hole Progress Subscriptions ─────────────────────────────────────────────
 * Track current hole progress for all players in real-time.
 * Useful for leaderboard displays, broadcast screens, and player tracking.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live hole progress untuk satu match — semua player.
 * Menampilkan hole mana yang sedang dimainkan setiap player.
 */
export const matchProgress = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(100);

    const progressData = await Promise.all(
      scorecards.map(async (sc) => {
        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
          .order("asc")
          .take(match.holesPlayed);

        const player = await ctx.db.get(sc.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;

        return {
          playerId: sc.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          bibNumber: player?.bibNumber,
          holesCompleted: holes.length,
          currentHole: holes.length + 1 <= match.holesPlayed ? holes.length + 1 : null,
          totalStrokes: sc.totalStrokes,
          scoreToPar: sc.scoreToPar,
          lastHole:
            holes.length > 0
              ? {
                  holeNumber: holes[holes.length - 1].holeNumber,
                  strokes: holes[holes.length - 1].strokes,
                  recordedAt: holes[holes.length - 1].recordedAt,
                }
              : null,
        };
      })
    );

    return {
      matchId: args.matchId,
      status: match.status,
      holesPlayed: match.holesPlayed,
      startingHole: match.startingHole,
      players: progressData,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Live tournament-wide hole progress.
 * Berguna untuk tournament ops dashboard.
 */
export const tournamentProgress = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId_and_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "ongoing")
      )
      .take(50);

    const matchProgress = await Promise.all(
      matches.map(async (match) => {
        const scorecards = await ctx.db
          .query("scorecards")
          .withIndex("by_matchId", (q) => q.eq("matchId", match._id))
          .take(4);

        const players = await Promise.all(
          scorecards.map(async (sc) => {
            const holes = await ctx.db
              .query("scorecard_holes")
              .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
              .order("asc")
              .take(match.holesPlayed);

            const player = await ctx.db.get(sc.playerId);
            return {
              displayName: player?.displayName ?? "Unknown",
              holesCompleted: holes.length,
              totalStrokes: sc.totalStrokes,
            };
          })
        );

        // Find slowest pace player
        const slowestPlayer = players.reduce((prev, current) =>
          prev.holesCompleted <= current.holesCompleted ? prev : current
        );

        return {
          matchId: match._id,
          flightName: match.flightName,
          pace: `${slowestPlayer.holesCompleted}/${match.holesPlayed}`,
          players,
        };
      })
    );

    // Calculate overall tournament progress
    const allScoreboard = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(256);

    const totalScores = await ctx.db
      .query("scorecard_holes")
      .take(1000);

    const avgHolesCompleted =
      allScoreboard.length > 0 && totalScores.length > 0
        ? Math.round(totalScores.length / allScoreboard.length)
        : 0;

    return {
      tournamentId: args.tournamentId,
      activeMatches: matchProgress,
      activeMatchCount: matches.length,
      averageHoleProgress: avgHolesCompleted,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Live scorecard hole-by-hole for display purposes.
 * Optimized untuk showing recent holes dan current status.
 */
export const scorecardHolesByRecent = query({
  args: {
    scorecardId: v.id("scorecards"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", args.scorecardId))
      .order("desc")
      .take(args.limit);

    const sortedHoles = holes.sort(
      (a, b) => a.holeNumber - b.holeNumber
    );

    return {
      scorecardId: args.scorecardId,
      totalStrokes: scorecard.totalStrokes,
      totalNetScore: scorecard.totalNetScore,
      scoreToPar: scorecard.scoreToPar,
      holesCount: holes.length,
      holes: sortedHoles.map((h) => ({
        holeNumber: h.holeNumber,
        strokes: h.strokes,
        putts: h.putts,
        penaltyStrokes: h.penaltyStrokes,
        grossScoreToPar: h.grossScoreToPar,
        netScoreToPar: h.netScoreToPar,
        isGir: h.isGir,
        isBirdie: h.isBirdie,
        isEagle: h.isEagle,
        isBogey: h.isBogey,
        recordedAt: h.recordedAt,
      })),
      updatedAt: Date.now(),
    };
  },
});

/**
 * Get variable scorecards by tournament ID (for high-churn operational data).
 */
export const liveScorecardsForTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
    statusFilter: v.optional(
      v.union(
        v.literal("in_progress"),
        v.literal("submitted"),
        v.literal("verified"),
        v.literal("completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId));

    if (args.statusFilter) {
      query = query.filter((q) => q.eq(q.field("status"), args.statusFilter));
    }

    const scorecards = await query.take(256);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
          .order("asc")
          .take(18);

        return {
          scorecardId: sc._id,
          playerId: sc.playerId,
          displayName: player?.displayName ?? "Unknown",
          status: sc.status,
          totalStrokes: sc.totalStrokes,
          scoreToPar: sc.scoreToPar,
          holesCompleted: holes.length,
          matchplayStanding: sc.matchplayStanding,
        };
      })
    );

    return {
      tournamentId: args.tournamentId,
      count: enriched.length,
      scorecards: enriched,
      updatedAt: Date.now(),
    };
  },
});
