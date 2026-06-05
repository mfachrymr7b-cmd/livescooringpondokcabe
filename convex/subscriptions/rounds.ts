/**
 * Live round summaries — reactive updates when scores or ranks change.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/** Live summary for one round in a tournament. */
export const roundSummary = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .take(32);

    const leaderboard = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(256);

    const roundLeader = leaderboard[0]
      ? {
          playerId: leaderboard[0].playerId,
          rank: leaderboard[0].rank,
          rankDisplay: leaderboard[0].rankDisplay ?? String(leaderboard[0].rank),
          totalStrokes: leaderboard[0].totalStrokes,
          scoreToPar: leaderboard[0].scoreToPar,
        }
      : null;

    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .take(256);

    const submitted = scorecards.filter(
      (sc) => sc.status === "submitted" || sc.status === "verified"
    ).length;
    const inProgress = scorecards.filter((sc) => sc.status === "in_progress").length;

    const avgStrokes =
      scorecards.length > 0
        ? Math.round(
            scorecards.reduce((sum, sc) => sum + (sc.totalStrokes ?? 0), 0) /
              scorecards.length
          )
        : 0;

    const matchSummaries = await Promise.all(
      matches.map(async (match) => {
        const matchScorecards = scorecards.filter((sc) => sc.matchId === match._id);
        const players = await Promise.all(
          matchScorecards.map(async (sc) => {
            const player = await ctx.db.get(sc.playerId);
            return {
              playerId: sc.playerId,
              displayName: player?.displayName ?? "Unknown",
              totalStrokes: sc.totalStrokes,
              matchplayStanding: sc.matchplayStanding,
              matchOutcome: sc.matchOutcome,
              isMatchWinner: sc.isMatchWinner,
            };
          })
        );

        const winner = match.winnerPlayerId
          ? players.find((p) => p.playerId === match.winnerPlayerId)
          : null;

        return {
          matchId: match._id,
          roundNumber: match.roundNumber,
          flightName: match.flightName,
          status: match.status,
          matchResult: match.matchResult,
          winnerPlayerId: match.winnerPlayerId,
          winnerName: winner?.displayName,
          players,
        };
      })
    );

    return {
      tournamentId: args.tournamentId,
      roundNumber: args.roundNumber,
      format: tournament.format,
      matchCount: matches.length,
      scorecardCount: scorecards.length,
      submittedCount: submitted,
      inProgressCount: inProgress,
      averageStrokes: avgStrokes,
      leader: roundLeader,
      matches: matchSummaries,
      updatedAt: Date.now(),
    };
  },
});

/** Overview of all rounds — for tournament detail dashboard. */
export const overview = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const rounds: Array<{
      roundNumber: number;
      matchCount: number;
      leaderName: string | null;
      leaderRankDisplay: string | null;
      completedMatches: number;
    }> = [];

    for (let round = 1; round <= tournament.totalRounds; round += 1) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournamentId_and_roundNumber", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("roundNumber", round)
        )
        .take(32);

      const completedMatches = matches.filter((m) => m.status === "completed").length;

      const scorecards = await ctx.db
        .query("scorecards")
        .withIndex("by_tournamentId_and_roundNumber", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("roundNumber", round)
        )
        .take(1);

      let leaderName: string | null = null;
      let leaderRankDisplay: string | null = null;

      const topEntries = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournamentId_and_rank", (q) =>
          q.eq("tournamentId", args.tournamentId)
        )
        .order("asc")
        .take(1);
      const top = topEntries[0];

      if (top) {
        const player = await ctx.db.get(top.playerId);
        leaderName = player?.displayName ?? null;
        leaderRankDisplay = top.rankDisplay ?? String(top.rank);
      }

      rounds.push({
        roundNumber: round,
        matchCount: matches.length,
        leaderName,
        leaderRankDisplay,
        completedMatches,
      });

      void scorecards;
    }

    return {
      tournamentId: args.tournamentId,
      totalRounds: tournament.totalRounds,
      format: tournament.format,
      rounds,
      updatedAt: Date.now(),
    };
  },
});
