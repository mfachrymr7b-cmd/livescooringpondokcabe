/**
 * ─── Scorecard Subscriptions ─────────────────────────────────────────────────
 * Real-time queries untuk live scoring. Digunakan saat pemain sedang
 * memasukkan skor hole-by-hole di lapangan.
 *
 * Gunakan `useQuery(api.subscriptions.scorecards.liveHoles, { scorecardId })`
 * di client untuk mendapatkan skor live per hole.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live hole scores untuk satu scorecard.
 * Push update ke client setiap ada skor baru atau perubahan skor.
 */
export const liveHoles = query({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) =>
        q.eq("scorecardId", args.scorecardId)
      )
      .order("asc")
      .take(18);

    return {
      scorecardId: args.scorecardId,
      status: scorecard.status,
      totalStrokes: scorecard.totalStrokes,
      totalPutts: scorecard.totalPutts,
      totalNetScore: scorecard.totalNetScore,
      scoreToPar: scorecard.scoreToPar,
      playingHandicap: scorecard.playingHandicap,
      holesRecorded: holes.length,
      totalStablefordPoints: scorecard.totalStablefordPoints,
      matchplayStanding: scorecard.matchplayStanding,
      matchplayHolesWon: scorecard.matchplayHolesWon,
      matchplayHolesLost: scorecard.matchplayHolesLost,
      holes: holes.map((h) => ({
        holeNumber: h.holeNumber,
        strokes: h.strokes,
        putts: h.putts,
        penaltyStrokes: h.penaltyStrokes,
        netStrokes: h.netStrokes,
        handicapStrokes: h.handicapStrokes,
        grossScoreToPar: h.grossScoreToPar,
        netScoreToPar: h.netScoreToPar,
        stablefordPoints: h.stablefordPoints,
        matchplayPoints: h.matchplayPoints,
        isGir: h.isGir,
        isFairwayHit: h.isFairwayHit,
        isBirdie: h.isBirdie,
        isEagle: h.isEagle,
        isBogey: h.isBogey,
        isDoubleBogey: h.isDoubleBogey,
        recordedAt: h.recordedAt,
      })),
    };
  },
});

/**
 * Live scorecard summary untuk satu match — semua player.
 * Berguna untuk tampilan scoring table di layar marshal/admin.
 */
export const liveMatchScoring = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(100);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;

        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId_and_holeNumber", (q) => q.eq("scorecardId", sc._id))
          .order("asc")
          .take(18);

        return {
          scorecardId: sc._id,
          playerId: sc.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          bibNumber: player?.bibNumber,
          status: sc.status,
          totalStrokes: sc.totalStrokes,
          totalNetScore: sc.totalNetScore,
          scoreToPar: sc.scoreToPar,
          playingHandicap: sc.playingHandicap,
          holesRecorded: holes.length,
          holes: holes.map((h) => ({
            holeNumber: h.holeNumber,
            strokes: h.strokes,
            netStrokes: h.netStrokes,
            stablefordPoints: h.stablefordPoints,
          })),
        };
      })
    );

    return enriched;
  },
});

/**
 * Live scorecard satu player untuk ronde tertentu.
 * Berguna untuk tampilan "My Scorecard" di app player.
 */
export const myScorecard = query({
  args: {
    playerId: v.id("players"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db
      .query("scorecards")
      .withIndex("by_playerId_and_roundNumber", (q) =>
        q.eq("playerId", args.playerId).eq("roundNumber", args.roundNumber)
      )
      .unique();

    if (!scorecard) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) =>
        q.eq("scorecardId", scorecard._id)
      )
      .order("asc")
      .take(18);

    // Ambil info match untuk context
    const match = await ctx.db.get(scorecard.matchId);

    return {
      ...scorecard,
      match: match
        ? {
            roundNumber: match.roundNumber,
            flightName: match.flightName,
            scheduledDate: match.scheduledDate,
            status: match.status,
          }
        : null,
      holes,
    };
  },
});

/**
 * Live status semua scorecard dalam satu turnamen per ronde.
 * Berguna untuk admin memonitor progress pengisian skor.
 */
export const roundProgress = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .take(256);

    const statusCounts = {
      in_progress: 0,
      submitted: 0,
      verified: 0,
      disputed: 0,
    };

    for (const sc of scorecards) {
      statusCounts[sc.status]++;
    }

    return {
      total: scorecards.length,
      ...statusCounts,
      completionRate:
        scorecards.length > 0
          ? Math.round(
              ((statusCounts.verified + statusCounts.submitted) /
                scorecards.length) *
                100
            )
          : 0,
    };
  },
});
