/**
 * ─── Broadcast Comments Queries ───────────────────────────────────────────────
 * Komentar live dari penonton di TV mode.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/** Komentar yang sudah diapprove — untuk ditampilkan di TV mode (realtime) */
export const approved = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("broadcast_comments")
      .withIndex("by_tournamentId_and_isApproved", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("isApproved", true)
      )
      .order("desc")
      .take(50);

    // Pinned di atas, sisanya urut terbaru
    const pinned = comments.filter((c) => c.isPinned);
    const rest = comments.filter((c) => !c.isPinned);
    return [...pinned, ...rest];
  },
});

/** Semua komentar (termasuk pending) — untuk panel moderasi admin */
export const all = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("broadcast_comments")
      .withIndex("by_tournamentId_and_createdAt", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("desc")
      .take(100);
  },
});

/** Jumlah komentar pending (belum diapprove) */
export const pendingCount = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("broadcast_comments")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(200);
    return all.filter((c) => !c.isApproved).length;
  },
});
