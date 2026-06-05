import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/** Get course by ID */
export const get = query({
  args: { id: v.id("golf_courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Get course by slug */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("golf_courses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** List active courses, paginated */
export const listActive = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("golf_courses")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .paginate(args.paginationOpts);
  },
});

/** List all courses (active + inactive), paginated — for admin */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("golf_courses")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Search courses by name */
export const search = query({
  args: {
    query: v.string(),
    /** Jika true, hanya kembalikan course aktif (default: false = semua) */
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("golf_courses")
      .withSearchIndex("search_name", (sq) => {
        const base = sq.search("name", args.query);
        return args.activeOnly ? base.eq("isActive", true) : base;
      });
    return await q.take(20);
  },
});

/** Get semua holes untuk satu course */
export const getHoles = query({
  args: { courseId: v.id("golf_courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId", (q) => q.eq("courseId", args.courseId))
      .order("asc")
      .take(18);
  },
});

/** Get satu hole spesifik */
export const getHole = query({
  args: { courseId: v.id("golf_courses"), holeNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId_and_holeNumber", (q) =>
        q.eq("courseId", args.courseId).eq("holeNumber", args.holeNumber)
      )
      .unique();
  },
});

/** Resolve a storage ID to a signed URL */
export const getStorageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get all holes for the course associated with a scorecard.
 * Digunakan di ScoreInputPanel untuk mendapatkan holeId saat input skor.
 */
export const getHolesByScorecardId = query({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) return [];
    const match = await ctx.db.get(scorecard.matchId);
    if (!match) return [];
    return await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId", (q) => q.eq("courseId", match.courseId))
      .order("asc")
      .take(18);
  },
});
