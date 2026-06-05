import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { createCourseValidator, updateCourseValidator, createHoleValidator } from "../validators";

/** Buat lapangan golf baru */
export const create = mutation({
  args: createCourseValidator,
  handler: async (ctx, args) => {
    // Validasi slug unik
    const existing = await ctx.db
      .query("golf_courses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error(`Slug "${args.slug}" sudah dipakai`);

    return await ctx.db.insert("golf_courses", {
      ...args,
      isActive: true,
    });
  },
});

/** Update data lapangan */
export const update = mutation({
  args: updateCourseValidator,
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

/** Nonaktifkan lapangan */
export const deactivate = mutation({
  args: { id: v.id("golf_courses") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

/** Hapus lapangan secara permanen */
async function deleteCourseHoles(ctx: MutationCtx, courseId: Id<"golf_courses">) {
  const holes = await ctx.db
    .query("golf_holes")
    .withIndex("by_courseId", (q) => q.eq("courseId", courseId))
    .take(200);

  for (const hole of holes) {
    await ctx.db.delete(hole._id);
  }
}

export const remove = mutation({
  args: { id: v.id("golf_courses") },
  handler: async (ctx, args) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .filter((q) => q.eq(q.field("courseId"), args.id))
      .take(1);

    if (tournaments.length > 0) {
      throw new Error(
        "Lapangan ini masih terkait dengan turnamen. Hapus turnamen terlebih dahulu sebelum menghapus lapangan."
      );
    }

    const relatedMatch = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("courseId"), args.id))
      .take(1);

    if (relatedMatch.length > 0) {
      throw new Error(
        "Lapangan ini masih terkait dengan match. Hapus match terkait terlebih dahulu sebelum menghapus lapangan."
      );
    }

    await deleteCourseHoles(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

/** Tambah satu hole ke lapangan */
export const addHole = mutation({
  args: createHoleValidator,
  handler: async (ctx, args) => {
    // Validasi hole number unik dalam course
    const existing = await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId_and_holeNumber", (q) =>
        q.eq("courseId", args.courseId).eq("holeNumber", args.holeNumber)
      )
      .unique();
    if (existing) {
      throw new Error(`Hole ${args.holeNumber} sudah ada di course ini`);
    }

    return await ctx.db.insert("golf_holes", args);
  },
});

/** Update data hole */
export const updateHole = mutation({
  args: {
    id: v.id("golf_holes"),
    par: v.optional(v.number()),
    distanceBlack: v.optional(v.number()),
    distanceBlue: v.optional(v.number()),
    distanceWhite: v.optional(v.number()),
    distanceYellow: v.optional(v.number()),
    distanceRed: v.optional(v.number()),
    strokeIndex: v.optional(v.number()),
    description: v.optional(v.string()),
    /** Pass null to clear the image */
    imageUrl: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

/** Hapus satu hole */
export const removeHole = mutation({
  args: { id: v.id("golf_holes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/** Generate upload URL untuk Convex file storage */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
