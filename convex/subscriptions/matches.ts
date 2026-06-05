/**
 * ─── Match Synchronization & Live Match Progress ────────────────────────────
 * Real-time queries untuk tracking match progress dan player positions dalam match.
 *
 * Gunakan:
 * - `useQuery(api.subscriptions.matches.liveMatch, { matchId })` untuk detail match
 * - `useQuery(api.subscriptions.matches.liveProgress, { matchId })` untuk player progress
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live match detail — status, scores, dan player positions.
 * Push update setiap ada perubahan skor atau status.
 */
export const liveMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(100);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        
        // Get current hole progress
        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
          .order("asc")
          .take(18);

        const currentHoleNumber = holes.length + 1;
        const nextHole = currentHoleNumber <= 18 ? currentHoleNumber : null;

        return {
          scorecardId: sc._id,
          playerId: sc.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          bibNumber: player?.bibNumber,
          status: sc.status,
          totalStrokes: sc.totalStrokes,
          totalNetScore: sc.totalNetScore,
          scoreToPar: sc.scoreToPar,
          holesCompleted: holes.length,
          currentHole: nextHole,
          playingHandicap: sc.playingHandicap,
          matchplayStanding: sc.matchplayStanding,
          matchplayHolesWon: sc.matchplayHolesWon ?? 0,
          matchplayHolesLost: sc.matchplayHolesLost ?? 0,
          matchplayHolesHalved: sc.matchplayHolesHalved ?? 0,
          matchOutcome: sc.matchOutcome,
          isMatchWinner: sc.isMatchWinner ?? false,
        };
      })
    );

    return {
      matchId: args.matchId,
      tournamentId: match.tournamentId,
      roundNumber: match.roundNumber,
      flightName: match.flightName,
      status: match.status,
      scheduledDate: match.scheduledDate,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      holesPlayed: match.holesPlayed,
      startingHole: match.startingHole,
      winnerPlayerId: match.winnerPlayerId,
      matchResult: match.matchResult,
      scorecards: enriched,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Live player progress dalam match — fokus ke satu player.
 * Berguna untuk tampilan "Player Position" di broadcast atau app.
 */
export const livePlayerProgress = query({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("playerId"), args.playerId))
      .unique();

    if (!scorecard) return null;

    const match = await ctx.db.get(scorecard.matchId);
    if (!match) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", scorecard._id))
      .order("asc")
      .take(18);

    const player = await ctx.db.get(scorecard.playerId);
    const user = player ? await ctx.db.get(player.userId) : null;

    // Get details dari opponent (untuk match play)
    let opponentScore = null;
    if (scorecard.matchplayStanding !== undefined) {
      const opponentScorecard = await ctx.db
        .query("scorecards")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .filter((q) => q.neq(q.field("playerId"), args.playerId))
        .first();

      if (opponentScorecard) {
        const opponentHoles = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) =>
            q.eq("scorecardId", opponentScorecard._id)
          )
          .order("asc")
          .take(18);

        opponentScore = {
          displayName: (await ctx.db.get(opponentScorecard.playerId))?.displayName ?? "Unknown",
          holesCompleted: opponentHoles.length,
          totalStrokes: opponentScorecard.totalStrokes,
          scoreToPar: opponentScorecard.scoreToPar,
          matchplayHolesWon: opponentScorecard.matchplayHolesWon ?? 0,
          matchplayHolesLost: opponentScorecard.matchplayHolesLost ?? 0,
          matchplayHolesHalved: opponentScorecard.matchplayHolesHalved ?? 0,
        };
      }
    }

    const holesData = holes.map((h) => ({
      holeNumber: h.holeNumber,
      strokes: h.strokes,
      putts: h.putts,
      penaltyStrokes: h.penaltyStrokes,
      grossScoreToPar: h.grossScoreToPar,
      netScoreToPar: h.netScoreToPar,
      stablefordPoints: h.stablefordPoints,
      matchplayPoints: h.matchplayPoints,
      isGir: h.isGir,
      isBirdie: h.isBirdie,
      isEagle: h.isEagle,
      isBogey: h.isBogey,
    }));

    return {
      scorecardId: scorecard._id,
      matchId: args.matchId,
      playerId: args.playerId,
      displayName: player?.displayName ?? user?.name ?? "Unknown",
      avatarUrl: user?.avatarUrl,
      bibNumber: player?.bibNumber,
      status: scorecard.status,
      totalStrokes: scorecard.totalStrokes,
      totalNetScore: scorecard.totalNetScore,
      scoreToPar: scorecard.scoreToPar,
      playingHandicap: scorecard.playingHandicap,
      holesCompleted: holes.length,
      currentHole: holes.length + 1 <= match.holesPlayed ? holes.length + 1 : null,
      holes: holesData,
      matchplayStanding: scorecard.matchplayStanding,
      matchplayHolesWon: scorecard.matchplayHolesWon ?? 0,
      matchplayHolesLost: scorecard.matchplayHolesLost ?? 0,
      matchplayHolesHalved: scorecard.matchplayHolesHalved ?? 0,
      opponent: opponentScore,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Live tournament activity — semua match yang sedang berlangsung
 * Berguna untuk tournament ops dashboard.
 */
export const liveActivity = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const activeMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId_and_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "ongoing")
      )
      .take(50);

    const scheduledMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId_and_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "scheduled")
      )
      .order("desc")
      .take(20);

    const enrichedActive = await Promise.all(
      activeMatches.map(async (match) => {
        const scorecards = await ctx.db
          .query("scorecards")
          .withIndex("by_matchId", (q) => q.eq("matchId", match._id))
          .take(4);

        const players = await Promise.all(
          scorecards.map(async (sc) => {
            const player = await ctx.db.get(sc.playerId);
            return {
              displayName: player?.displayName ?? "Unknown",
              totalStrokes: sc.totalStrokes,
            };
          })
        );

        return {
          matchId: match._id,
          roundNumber: match.roundNumber,
          flightName: match.flightName,
          status: match.status,
          startedAt: match.startedAt,
          players,
          playerCount: scorecards.length,
        };
      })
    );

    const enrichedScheduled = scheduledMatches.map((match) => ({
      matchId: match._id,
      roundNumber: match.roundNumber,
      flightName: match.flightName,
      scheduledDate: match.scheduledDate,
      startingHole: match.startingHole,
    }));

    return {
      tournamentId: args.tournamentId,
      activeMatches: enrichedActive,
      scheduledMatches: enrichedScheduled,
      activeCount: enrichedActive.length,
      scheduledCount: enrichedScheduled.length,
      updatedAt: Date.now(),
    };
  },
});
