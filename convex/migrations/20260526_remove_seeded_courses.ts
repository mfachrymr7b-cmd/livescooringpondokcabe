/**
 * Migration: Remove four seeded golf courses from the database.
 * Date: 2026-05-26
 * Reason: Delete Riverside Golf Club, Bali National Golf, Taman Dayu Golf, and Royale Jakarta Golf Club.
 *
 * Jalankan:
 *   npx convex run migrations/20260526_remove_seeded_courses:removeSeededCourses
 */

import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";

const COURSE_SLUGS = [
  "royale-jakarta-golf",
  "taman-dayu-golf",
  "bali-national-golf",
  "riverside-golf-bogor",
] as const;

type CourseSlug = (typeof COURSE_SLUGS)[number];

async function removeCourse(ctx: MutationCtx, slug: CourseSlug) {
  const course = await ctx.db
    .query("golf_courses")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (!course) {
    return { slug, found: false, deletedHoles: 0, deletedCourse: false };
  }

  const holes = await ctx.db
    .query("golf_holes")
    .filter((q) => q.eq(q.field("courseId"), course._id))
    .take(200);

  for (const hole of holes) {
    await ctx.db.delete(hole._id);
  }

  await ctx.db.delete(course._id);

  return { slug, found: true, deletedHoles: holes.length, deletedCourse: true };
}

export const removeSeededCourses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = [] as Array<{
      slug: CourseSlug;
      found: boolean;
      deletedHoles: number;
      deletedCourse: boolean;
    }>;

    for (const slug of COURSE_SLUGS) {
      results.push(await removeCourse(ctx, slug));
    }

    return {
      message: "Selesai menghapus kursus yang diminta.",
      results,
    };
  },
});
