/**
 * ─── Running Texts Mutations ──────────────────────────────────────────────────
 * CRUD untuk teks berjalan di halaman Live Scoring.
 * Hanya bisa diakses oleh user yang sudah login.
 */

import { mutation } from "../_generated/server";
import { v } from "convex/values";

/** Helper: ambil user yang sedang login */
async function getAuthUser(ctx: { auth: { getUserIdentity: () => Promise<{ tokenIdentifier: string } | null> }; db: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q: any) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
  if (!user) throw new Error("User tidak ditemukan");
  return user;
}

/** Tambah running text baru */
export const create = mutation({
  args: {
    text: v.string(),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Tentukan order: ambil order tertinggi + 1
    const existing = await ctx.db
      .query("running_texts")
      .withIndex("by_order")
      .order("desc")
      .take(1);
    const nextOrder = existing.length > 0 ? existing[0].order + 1 : 1;

    const id = await ctx.db.insert("running_texts", {
      text: args.text.trim(),
      isActive: args.isActive ?? true,
      order: args.order ?? nextOrder,
      createdBy: user._id,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/** Update teks atau status aktif */
export const update = mutation({
  args: {
    id: v.id("running_texts"),
    text: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Running text tidak ditemukan");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.text !== undefined) patch.text = args.text.trim();
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    if (args.order !== undefined) patch.order = args.order;

    await ctx.db.patch(args.id, patch);
  },
});

/** Toggle aktif/nonaktif */
export const toggleActive = mutation({
  args: { id: v.id("running_texts") },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Running text tidak ditemukan");

    await ctx.db.patch(args.id, {
      isActive: !existing.isActive,
      updatedAt: Date.now(),
    });
  },
});

/** Hapus running text */
export const remove = mutation({
  args: { id: v.id("running_texts") },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Running text tidak ditemukan");

    await ctx.db.delete(args.id);
  },
});

/** Reorder: swap order dua item */
export const reorder = mutation({
  args: {
    id: v.id("running_texts"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx);

    const current = await ctx.db.get(args.id);
    if (!current) throw new Error("Running text tidak ditemukan");

    // Cari tetangga
    const all = await ctx.db
      .query("running_texts")
      .withIndex("by_order")
      .order("asc")
      .take(100);

    const idx = all.findIndex((t: { _id: string }) => t._id === args.id);
    if (idx === -1) return;

    const swapIdx = args.direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= all.length) return;

    const neighbor = all[swapIdx];
    const currentOrder = current.order;
    const neighborOrder = neighbor.order;

    await Promise.all([
      ctx.db.patch(args.id, { order: neighborOrder, updatedAt: Date.now() }),
      ctx.db.patch(neighbor._id, { order: currentOrder, updatedAt: Date.now() }),
    ]);
  },
});
