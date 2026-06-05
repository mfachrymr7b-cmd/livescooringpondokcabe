import { query } from "../_generated/server";
import { v } from "convex/values";

/** List players dalam satu turnamen, paginated */
export const listByTournament = query({
  args: {
    tournamentId: v.id("tournaments"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .paginate(args.paginationOpts);
  },
});

/** List players confirmed dalam satu turnamen */
export const listConfirmed = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_tournamentId_and_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "confirmed")
      )
      .take(256);
  },
});

/** Get player by ID */
export const get = query({
  args: { id: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Get player berdasarkan user + tournament */
export const getByUserAndTournament = query({
  args: {
    userId: v.id("users"),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_tournamentId_and_userId", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();
  },
});

/** List semua turnamen yang diikuti satu user */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
