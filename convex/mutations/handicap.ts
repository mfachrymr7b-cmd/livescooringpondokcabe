/**
 * ─── Handicap Mutations ───────────────────────────────────────────────────────
 * Calculate and assign playing handicap for tournament players.
 */

import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { calcTournamentHandicap } from "../lib/handicap";

/**
 * Calculate and assign playing handicap for a player in a tournament.
 * Uses WHS formula: Course Handicap = HI × (Slope/113) + (CR − Par)
 */
export const assignPlayingHandicap = mutation({
  args: {
    playerId: v.id("players"),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player tidak ditemukan");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Turnamen tidak ditemukan");

    const course = await ctx.db.get(tournament.courseId);
    if (!course) throw new Error("Course tidak ditemukan");

    const handicapIndex = player.handicapIndex ?? 0;
    const slopeRating = course.slopeRating ?? 113;
    const courseRating = course.courseRating ?? course.par;
    const par = course.par;

    const { courseHandicap, playingHandicap, allowance } = calcTournamentHandicap({
      handicapIndex,
      slopeRating,
      courseRating,
      par,
      format: tournament.format,
    });

    // Update all scorecards for this player in this tournament
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .take(10);

    const tournamentScorecards = scorecards.filter(
      (sc) => sc.tournamentId === args.tournamentId
    );

    for (const sc of tournamentScorecards) {
      await ctx.db.patch(sc._id, { playingHandicap });
    }

    return { courseHandicap, playingHandicap, allowance };
  },
});

/**
 * Bulk assign playing handicaps for all players in a tournament.
 * Called when tournament starts or when handicaps are updated.
 */
export const bulkAssignHandicaps = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return;

    const course = await ctx.db.get(tournament.courseId);
    if (!course) return;

    const slopeRating = course.slopeRating ?? 113;
    const courseRating = course.courseRating ?? course.par;
    const par = course.par;

    const players = await ctx.db
      .query("players")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId))
      .take(256);

    for (const player of players) {
      const handicapIndex = player.handicapIndex ?? 0;
      const { playingHandicap } = calcTournamentHandicap({
        handicapIndex,
        slopeRating,
        courseRating,
        par,
        format: tournament.format,
      });

      const scorecards = await ctx.db
        .query("scorecards")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .take(10);

      for (const sc of scorecards) {
        if (sc.tournamentId === args.tournamentId) {
          await ctx.db.patch(sc._id, { playingHandicap });
        }
      }
    }
  },
});

/**
 * Update a player's handicap index and recalculate playing handicap.
 */
export const updateHandicapIndex = mutation({
  args: {
    playerId: v.id("players"),
    handicapIndex: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.handicapIndex < 0 || args.handicapIndex > 54) {
      throw new Error("Handicap index harus antara 0 dan 54");
    }

    await ctx.db.patch(args.playerId, {
      handicapIndex: args.handicapIndex,
    });

    return args.playerId;
  },
});
