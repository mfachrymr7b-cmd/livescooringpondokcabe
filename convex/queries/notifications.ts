import { query } from "../_generated/server";
import { v } from "convex/values";

/** List notifikasi untuk user yang sedang login, terbaru dulu */
export const myNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return [];

    const limit = Math.min(args.limit ?? 20, 50);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      timestamp: n._creationTime,
      tournamentId: n.tournamentId,
      matchId: n.matchId,
      scorecardId: n.scorecardId,
    }));
  },
});

/** Jumlah notifikasi yang belum dibaca */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .take(100);

    return unread.length;
  },
});
