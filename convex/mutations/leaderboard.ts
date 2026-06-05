import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  assignRanks,
  areTiedForGross,
  areTiedForNet,
  areTiedForStableford,
  compareStableford,
  compareStrokePlayGross,
  compareStrokePlayNet,
  sortLeaderboard,
  type LeaderboardPlayerRow,
} from "../lib/ranking";

/**
 * Recalculate leaderboard: auto-rank, tie-breakers, realtime denormalized table.
 * Also schedules match-winner resolution for match-play rounds.
 */
export const recalculate = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return { updated: 0 };

    const course = await ctx.db.get(tournament.courseId);
    const coursePar = course?.par ?? 72;
    const holesPerRound = tournament.holesPerRound ?? 18;
    const isStableford = tournament.format === "stableford";

    const [confirmedPlayers, registeredPlayers, completedPlayers] = await Promise.all([
      ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "confirmed")
        )
        .take(256),
      ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "registered")
        )
        .take(256),
      ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "completed")
        )
        .take(256),
    ]);

    const activePlayers = [...confirmedPlayers, ...registeredPlayers, ...completedPlayers];
    const rows: LeaderboardPlayerRow[] = [];

    for (const player of activePlayers) {
      const scorecards = await ctx.db
        .query("scorecards")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .take(10);

      const activeCards = scorecards.filter(
        (sc) =>
          sc.status === "verified" ||
          sc.status === "submitted" ||
          sc.status === "in_progress"
      );

      const roundScores = activeCards.map((sc) => ({
        roundNumber: sc.roundNumber,
        strokes: sc.totalStrokes ?? 0,
        netScore: sc.totalNetScore ?? undefined,
      }));

      let holesCompleted = 0;
      let totalStablefordPoints = 0;
      for (const sc of activeCards) {
        const holes = await ctx.db
          .query("scorecard_holes")
          .withIndex("by_scorecardId", (q) => q.eq("scorecardId", sc._id))
          .take(holesPerRound);
        holesCompleted += holes.length;
        totalStablefordPoints += sc.totalStablefordPoints ?? 0;
      }

      const totalStrokes = roundScores.reduce((sum, r) => sum + r.strokes, 0);
      const totalNetScore = roundScores.reduce(
        (sum, r) => sum + (r.netScore ?? r.strokes),
        0
      );

      rows.push({
        playerId: player._id,
        totalStrokes,
        totalNetScore,
        totalStablefordPoints,
        scoreToPar: totalStrokes - coursePar,
        holesCompleted,
        roundScores,
        isWithdrawn: false,
        isDisqualified: false,
      });

      await ctx.db.patch(player._id, {
        totalScore: totalStrokes,
        totalNetScore,
        currentRound: activeCards.length,
      });
    }

    const [withdrawnPlayers, disqualifiedPlayers] = await Promise.all([
      ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "withdrawn")
        )
        .take(256),
      ctx.db
        .query("players")
        .withIndex("by_tournamentId_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "disqualified")
        )
        .take(256),
    ]);

    for (const player of [...withdrawnPlayers, ...disqualifiedPlayers]) {
      rows.push({
        playerId: player._id,
        totalStrokes: 9999,
        totalNetScore: 9999,
        totalStablefordPoints: 0,
        scoreToPar: 0,
        holesCompleted: 0,
        roundScores: [],
        isWithdrawn: player.status === "withdrawn",
        isDisqualified: player.status === "disqualified",
      });
    }

    const grossSorted = sortLeaderboard(rows, compareStrokePlayGross);
    const grossRanks = assignRanks(grossSorted, areTiedForGross);
    const grossRankMap = new Map(
      grossSorted.map((row, i) => [row.playerId, grossRanks[i]])
    );

    const netSorted = sortLeaderboard(rows, compareStrokePlayNet);
    const netRanks = assignRanks(netSorted, areTiedForNet);
    const netRankMap = new Map(netSorted.map((row, i) => [row.playerId, netRanks[i]]));

    const stablefordSorted = sortLeaderboard(rows, compareStableford);
    const stablefordRanks = assignRanks(stablefordSorted, areTiedForStableford);
    const stablefordRankMap = new Map(
      stablefordSorted.map((row, i) => [row.playerId, stablefordRanks[i]])
    );

    for (const row of rows) {
      const gross = grossRankMap.get(row.playerId)!;
      const net = netRankMap.get(row.playerId)!;
      const stableford = stablefordRankMap.get(row.playerId)!;
      const inactive = row.isWithdrawn || row.isDisqualified;

      const existing = await ctx.db
        .query("leaderboard")
        .withIndex("by_tournamentId_and_playerId", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("playerId", row.playerId)
        )
        .unique();

      const entry = {
        tournamentId: args.tournamentId,
        playerId: row.playerId,
        totalStrokes: inactive ? 0 : row.totalStrokes,
        totalNetScore: inactive ? undefined : row.totalNetScore,
        totalStablefordPoints: inactive ? undefined : row.totalStablefordPoints,
        scoreToPar: inactive ? 0 : row.scoreToPar,
        roundScores: row.roundScores,
        rank: gross.rank,
        rankDisplay: gross.rankDisplay,
        isTied: gross.isTied,
        rankNet: net.rank,
        rankNetDisplay: net.rankDisplay,
        isTiedNet: net.isTied,
        rankStableford: isStableford ? stableford.rank : undefined,
        rankStablefordDisplay: isStableford ? stableford.rankDisplay : undefined,
        currentRound: row.roundScores.length,
        holesCompleted: row.holesCompleted,
        isWithdrawn: row.isWithdrawn,
        isDisqualified: row.isDisqualified,
        updatedAt: Date.now(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, entry);
      } else {
        await ctx.db.insert("leaderboard", entry);
      }
    }

    if (tournament.format === "match_play") {
      await ctx.scheduler.runAfter(0, internal.mutations.matches.resolveWinners, {
        tournamentId: args.tournamentId,
      });
    }

    return { updated: rows.length };
  },
});
