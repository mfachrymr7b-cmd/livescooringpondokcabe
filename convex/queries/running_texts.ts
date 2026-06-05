/**
 * ─── Running Texts Queries ────────────────────────────────────────────────────
 * Query untuk teks berjalan yang ditampilkan di halaman Live Scoring.
 */

import { query } from "../_generated/server";

/** Semua running texts (untuk admin dashboard) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const texts = await ctx.db
      .query("running_texts")
      .withIndex("by_order")
      .order("asc")
      .take(100);

    return texts.map((t) => ({
      id: t._id,
      text: t.text,
      isActive: t.isActive,
      order: t.order,
      updatedAt: t.updatedAt,
    }));
  },
});

/** Hanya running texts yang aktif — digunakan di halaman Live Scoring publik */
export const activeTexts = query({
  args: {},
  handler: async (ctx) => {
    const texts = await ctx.db
      .query("running_texts")
      .withIndex("by_isActive_and_order", (q) => q.eq("isActive", true))
      .order("asc")
      .take(50);

    return texts.map((t) => ({
      id: t._id,
      text: t.text,
      order: t.order,
    }));
  },
});
