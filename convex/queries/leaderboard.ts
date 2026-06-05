import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Get live leaderboard untuk satu turnamen — REALTIME
 * Setiap perubahan skor akan push update ke semua client yang subscribe
 */
export const byTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(256);

    // Enrich dengan data player
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          ...entry,
          player,
          user,
        };
      })
    );

    return enriched;
  },
});

/** Get posisi satu player di leaderboard */
export const getPlayerPosition = query({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_playerId", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();
  },
});

/** Get top N players dari leaderboard */
export const getTop = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(args.limit);

    // Enrich dengan data player
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          ...entry,
          player,
          user,
        };
      })
    );

    return enriched;
  },
});
