import { mutation } from "../_generated/server";
import { v } from "convex/values";

/** Tandai satu notifikasi sebagai sudah dibaca */
export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) throw new Error("User tidak ditemukan");

    const notif = await ctx.db.get(args.id);
    if (!notif) throw new Error("Notifikasi tidak ditemukan");
    if (notif.userId !== user._id) throw new Error("Akses ditolak");

    await ctx.db.patch(args.id, { read: true });
  },
});

/** Tandai semua notifikasi user sebagai sudah dibaca */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) throw new Error("User tidak ditemukan");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .take(100);

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return unread.length;
  },
});
