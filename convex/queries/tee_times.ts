import { query } from "../_generated/server";
import { v } from "convex/values";

/** Get tee time by ID */
export const get = query({
  args: { id: v.id("tee_times") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** List tee times untuk satu match, ordered by scheduledTime */
export const listByMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tee_times")
      .withIndex("by_matchId_and_scheduledTime", (q) =>
        q.eq("matchId", args.matchId)
      )
      .order("asc")
      .take(100);
  },
});

/** List tee times untuk satu ronde dalam turnamen */
export const listByRound = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tee_times")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .order("asc")
      .take(100);
  },
});

/** Get tee time lengkap dengan semua player dalam grup */
export const getWithPlayers = query({
  args: { id: v.id("tee_times") },
  handler: async (ctx, args) => {
    const teeTime = await ctx.db.get(args.id);
    if (!teeTime) return null;

    const slots = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", args.id))
      .order("asc")
      .take(6);

    const players = await Promise.all(
      slots.map(async (slot) => {
        const player = await ctx.db.get(slot.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return { ...slot, player, user };
      })
    );

    return { ...teeTime, players };
  },
});

/** Get tee time seorang player dalam satu ronde */
export const getPlayerTeeTime = query({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_tournamentId_and_playerId", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("playerId", args.playerId)
      )
      .unique();

    if (!slot) return null;
    return await ctx.db.get(slot.teeTimeId);
  },
});
