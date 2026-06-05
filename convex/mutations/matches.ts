import { internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { matchStatusValidator } from "../types";
import { internal } from "../_generated/api";
import { resolveHeadToHeadMatch } from "../lib/matchplay";

/** Update status match */
export const updateStatus = mutation({
  args: {
    id: v.id("matches"),
    status: matchStatusValidator,
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.id);
    if (!match) throw new Error("Match tidak ditemukan");

    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "ongoing") patch.startedAt = Date.now();
    if (args.status === "completed") patch.completedAt = Date.now();
    await ctx.db.patch(args.id, patch);

    if (args.status === "completed") {
      await resolveMatchWinnersForMatch(ctx, match._id);
    }

    // Trigger leaderboard update on any match status change
    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: match.tournamentId,
    });
  },
});

/** Resolve winners for all matches in a tournament (match play). */
export const resolveWinners = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", args.tournamentId))
      .take(32);

    for (const match of matches) {
      await resolveMatchWinnersForMatch(ctx, match._id);
    }
  },
});

async function resolveMatchWinnersForMatch(ctx: MutationCtx, matchId: Id<"matches">) {
  const match = await ctx.db.get(matchId);
  if (!match) return;

  const scorecards = await ctx.db
    .query("scorecards")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .take(4);

  if (scorecards.length < 2) {
    if (scorecards.length === 1) {
      const only = scorecards[0];
      const won = only.matchplayHolesWon ?? 0;
      const lost = only.matchplayHolesLost ?? 0;
      const diff = won - lost;
      await ctx.db.patch(only._id, {
        matchOutcome: diff > 0 ? "won" : diff < 0 ? "lost" : "halved",
        isMatchWinner: diff > 0,
      });
    }
    return;
  }

  const [playerA, playerB] = scorecards;
  const holesDecided =
    (playerA.matchplayHolesWon ?? 0) +
    (playerA.matchplayHolesLost ?? 0) +
    (playerA.matchplayHolesHalved ?? 0);

  const resolution = resolveHeadToHeadMatch({
    playerAId: playerA.playerId,
    playerBId: playerB.playerId,
    playerAWon: playerA.matchplayHolesWon ?? 0,
    playerALost: playerA.matchplayHolesLost ?? 0,
    playerAStanding: playerA.matchplayStanding,
    playerBWon: playerB.matchplayHolesWon ?? 0,
    playerBLost: playerB.matchplayHolesLost ?? 0,
    playerBStanding: playerB.matchplayStanding,
    holesPlayed: match.holesPlayed,
    holesDecided,
  });

  await ctx.db.patch(matchId, {
    winnerPlayerId: resolution.winnerPlayerId ?? undefined,
    matchResult: resolution.matchResult,
  });

  await ctx.db.patch(playerA._id, {
    matchOutcome: resolution.playerA.outcome === "pending" ? "pending" : resolution.playerA.outcome,
    isMatchWinner: resolution.winnerPlayerId === playerA.playerId,
  });
  await ctx.db.patch(playerB._id, {
    matchOutcome: resolution.playerB.outcome === "pending" ? "pending" : resolution.playerB.outcome,
    isMatchWinner: resolution.winnerPlayerId === playerB.playerId,
  });
}
