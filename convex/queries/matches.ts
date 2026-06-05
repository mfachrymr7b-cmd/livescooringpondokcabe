import { query } from "../_generated/server";
import { v } from "convex/values";

/** List matches ordered by scheduled date, newest first, bounded to 100 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_scheduledDate")
      .order("desc")
      .take(100);
  },
});

/** List matches filtered by status, bounded to 100 */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("scheduled"),
      v.literal("ongoing"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("walkover")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(100);
  },
});

/** Get a single match by ID */
export const get = query({
  args: { id: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
