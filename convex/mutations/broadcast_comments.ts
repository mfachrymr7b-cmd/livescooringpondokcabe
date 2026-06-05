/**
 * ─── Broadcast Comments Mutations ─────────────────────────────────────────────
 * Kirim, approve, pin, dan hapus komentar live.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/** Kirim komentar baru (publik, tanpa login) */
export const submit = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    authorName: v.string(),
    message: v.string(),
    autoApprove: v.optional(v.boolean()), // true = langsung tampil (mode bebas moderasi)
  },
  handler: async (ctx, args) => {
    const name = args.authorName.trim().slice(0, 50);
    const msg = args.message.trim().slice(0, 200);

    if (!name) throw new Error("Nama tidak boleh kosong");
    if (!msg) throw new Error("Komentar tidak boleh kosong");

    // Cek turnamen ada
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Turnamen tidak ditemukan");

    return await ctx.db.insert("broadcast_comments", {
      tournamentId: args.tournamentId,
      authorName: name,
      message: msg,
      isApproved: args.autoApprove ?? false,
      isPinned: false,
      createdAt: Date.now(),
    });
  },
});

/** Approve komentar (admin) */
export const approve = mutation({
  args: { id: v.id("broadcast_comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Komentar tidak ditemukan");
    await ctx.db.patch(args.id, { isApproved: true });
  },
});

/** Reject / hapus komentar (admin) */
export const remove = mutation({
  args: { id: v.id("broadcast_comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Komentar tidak ditemukan");
    await ctx.db.delete(args.id);
  },
});

/** Toggle pin komentar (admin) */
export const togglePin = mutation({
  args: { id: v.id("broadcast_comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Komentar tidak ditemukan");
    await ctx.db.patch(args.id, { isPinned: !comment.isPinned });
  },
});

/** Approve semua komentar pending sekaligus (admin) */
export const approveAll = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("broadcast_comments")
      .withIndex("by_tournamentId_and_isApproved", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("isApproved", false)
      )
      .take(100);

    await Promise.all(pending.map((c) => ctx.db.patch(c._id, { isApproved: true })));
    return pending.length;
  },
});
