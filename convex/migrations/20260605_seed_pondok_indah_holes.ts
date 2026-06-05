/**
 * Migration: Seed hole data untuk course Pondok Indah Golf (atau course aktif pertama)
 * Date: 2026-06-05
 * Reason: Course sudah terdaftar tapi belum ada data hole, sehingga scorecard
 *         tidak bisa menampilkan grid hole-by-hole.
 *
 * Jalankan:
 *   npx convex run migrations/20260605_seed_pondok_indah_holes:seedHoles
 *
 * Atau untuk course spesifik:
 *   npx convex run migrations/20260605_seed_pondok_indah_holes:seedHolesByCourseSlug --slug "pondok-indah-golf"
 *
 * Atau seed semua course yang belum punya holes:
 *   npx convex run migrations/20260605_seed_pondok_indah_holes:seedAllMissingHoles
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// ─── Layout Pondok Indah Golf (Par 72, 18 holes) ─────────────────────────────
// Par layout standar: Par 3 × 4, Par 4 × 10, Par 5 × 4 = 72
// Stroke index: distribusi kesulitan 1–18
const HOLE_DATA = [
  // hole, par, strokeIndex, white(m), yellow(m), red(m)
  {  holeNumber:  1, par: 4, strokeIndex:  7, distanceWhite: 385, distanceYellow: 362, distanceRed: 328 },
  {  holeNumber:  2, par: 5, strokeIndex:  1, distanceWhite: 520, distanceYellow: 495, distanceRed: 455 },
  {  holeNumber:  3, par: 3, strokeIndex: 15, distanceWhite: 165, distanceYellow: 148, distanceRed: 128 },
  {  holeNumber:  4, par: 4, strokeIndex: 11, distanceWhite: 370, distanceYellow: 348, distanceRed: 315 },
  {  holeNumber:  5, par: 4, strokeIndex:  5, distanceWhite: 410, distanceYellow: 388, distanceRed: 352 },
  {  holeNumber:  6, par: 5, strokeIndex:  3, distanceWhite: 545, distanceYellow: 520, distanceRed: 478 },
  {  holeNumber:  7, par: 3, strokeIndex: 17, distanceWhite: 145, distanceYellow: 132, distanceRed: 115 },
  {  holeNumber:  8, par: 4, strokeIndex:  9, distanceWhite: 395, distanceYellow: 372, distanceRed: 338 },
  {  holeNumber:  9, par: 4, strokeIndex: 13, distanceWhite: 365, distanceYellow: 342, distanceRed: 308 },
  { holeNumber: 10, par: 4, strokeIndex:  8, distanceWhite: 400, distanceYellow: 378, distanceRed: 342 },
  { holeNumber: 11, par: 3, strokeIndex: 16, distanceWhite: 175, distanceYellow: 158, distanceRed: 138 },
  { holeNumber: 12, par: 5, strokeIndex:  2, distanceWhite: 535, distanceYellow: 510, distanceRed: 468 },
  { holeNumber: 13, par: 4, strokeIndex: 12, distanceWhite: 375, distanceYellow: 352, distanceRed: 318 },
  { holeNumber: 14, par: 4, strokeIndex:  6, distanceWhite: 405, distanceYellow: 382, distanceRed: 346 },
  { holeNumber: 15, par: 3, strokeIndex: 18, distanceWhite: 155, distanceYellow: 140, distanceRed: 122 },
  { holeNumber: 16, par: 5, strokeIndex:  4, distanceWhite: 530, distanceYellow: 505, distanceRed: 462 },
  { holeNumber: 17, par: 4, strokeIndex: 10, distanceWhite: 390, distanceYellow: 368, distanceRed: 332 },
  { holeNumber: 18, par: 4, strokeIndex: 14, distanceWhite: 380, distanceYellow: 358, distanceRed: 322 },
] as const;

// ─── Helper: seed holes ke satu course ───────────────────────────────────────

async function seedHolesToCourse(
  ctx: { db: { query: Function; insert: Function; delete: Function } },
  courseId: Id<"golf_courses">,
  courseName: string
): Promise<{ added: number; skipped: number; deleted: number }> {
  // Hapus holes lama jika ada (untuk fresh seed)
  const existingHoles = await ctx.db
    .query("golf_holes")
    .withIndex("by_courseId", (q: any) => q.eq("courseId", courseId))
    .take(50);

  let deleted = 0;
  for (const hole of existingHoles) {
    await ctx.db.delete(hole._id);
    deleted++;
  }

  // Insert holes baru
  let added = 0;
  for (const hole of HOLE_DATA) {
    await ctx.db.insert("golf_holes", {
      courseId,
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      distanceWhite: hole.distanceWhite,
      distanceYellow: hole.distanceYellow,
      distanceRed: hole.distanceRed,
    });
    added++;
  }

  console.log(`[seed] ${courseName}: deleted=${deleted}, added=${added}`);
  return { added, deleted, skipped: 0 };
}

// ─── Mutation 1: Seed course pertama/aktif yang ditemukan ────────────────────

export const seedHoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Cari semua course aktif
    const courses = await ctx.db
      .query("golf_courses")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(10);

    if (courses.length === 0) {
      return { message: "Tidak ada course aktif ditemukan.", results: [] };
    }

    const results = [];
    for (const course of courses) {
      // Cek apakah sudah punya holes
      const existingCount = await ctx.db
        .query("golf_holes")
        .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
        .take(1);

      if (existingCount.length > 0) {
        // Sudah ada holes — skip, atau bisa force dengan seedHolesByCourseSlug
        results.push({
          courseId: course._id,
          name: course.name,
          action: "skipped — sudah ada holes. Gunakan seedHolesByCourseSlug untuk re-seed.",
        });
        continue;
      }

      const stats = await seedHolesToCourse(ctx as any, course._id, course.name);
      results.push({
        courseId: course._id,
        name: course.name,
        ...stats,
        action: "seeded",
      });
    }

    return {
      message: "Selesai seed holes.",
      results,
    };
  },
});

// ─── Mutation 2: Seed by slug (bisa force re-seed) ───────────────────────────

export const seedHolesByCourseSlug = internalMutation({
  args: {
    slug: v.string(),
    force: v.optional(v.boolean()), // true = hapus & replace holes yang sudah ada
  },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("golf_courses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!course) {
      return { message: `Course dengan slug "${args.slug}" tidak ditemukan.` };
    }

    // Cek existing holes
    const existing = await ctx.db
      .query("golf_holes")
      .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
      .take(1);

    if (existing.length > 0 && !args.force) {
      return {
        message: `Course "${course.name}" sudah punya holes. Gunakan force: true untuk re-seed.`,
        courseId: course._id,
      };
    }

    const stats = await seedHolesToCourse(ctx as any, course._id, course.name);

    return {
      message: `Berhasil seed 18 holes untuk course "${course.name}".`,
      courseId: course._id,
      ...stats,
    };
  },
});

// ─── Mutation 3: Seed SEMUA course yang belum punya holes ────────────────────

export const seedAllMissingHoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCourses = await ctx.db
      .query("golf_courses")
      .take(50);

    const results = [];

    for (const course of allCourses) {
      const existingHoles = await ctx.db
        .query("golf_holes")
        .withIndex("by_courseId", (q) => q.eq("courseId", course._id))
        .take(1);

      if (existingHoles.length > 0) {
        results.push({ name: course.name, action: "skipped", holesExist: true });
        continue;
      }

      const stats = await seedHolesToCourse(ctx as any, course._id, course.name);
      results.push({
        name: course.name,
        action: "seeded",
        ...stats,
      });
    }

    const seeded = results.filter((r) => r.action === "seeded").length;
    const skipped = results.filter((r) => r.action === "skipped").length;

    return {
      message: `Selesai. ${seeded} course di-seed, ${skipped} course di-skip (sudah ada holes).`,
      results,
    };
  },
});


// ─── Mutation 4: Force re-seed Pondok Indah Golf (no args needed) ────────────

export const forceReseedPondokIndah = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Cari course dengan slug pondok-indah-golf
    let course = await ctx.db
      .query("golf_courses")
      .withIndex("by_slug", (q) => q.eq("slug", "pondok-indah-golf"))
      .unique();

    // Fallback: cari course aktif pertama
    if (!course) {
      const courses = await ctx.db
        .query("golf_courses")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .take(1);
      course = courses[0] ?? null;
    }

    if (!course) {
      return { message: "Tidak ada course ditemukan." };
    }

    const stats = await seedHolesToCourse(ctx as any, course._id, course.name);

    return {
      message: `Berhasil re-seed 18 holes untuk "${course.name}".`,
      courseId: course._id,
      courseName: course.name,
      ...stats,
    };
  },
});


// ─── Mutation 5: Fix Jakarta Cup — redirect ke Pondok Indah Golf ─────────────

export const fixJakartaCupCourse = internalMutation({
  args: {},
  handler: async (ctx) => {
    const PONDOK_INDAH_ID = "jn7bgjc4xx9q4zppdq1mtmjczx876kbb" as Id<"golf_courses">;
    const JAKARTA_CUP_ID  = "kd773j6925s81yg4y41agj3kcn876tkk" as Id<"tournaments">;

    // 1. Update tournament
    await ctx.db.patch(JAKARTA_CUP_ID, { courseId: PONDOK_INDAH_ID });

    // 2. Update semua matches di tournament ini
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournamentId", (q) => q.eq("tournamentId", JAKARTA_CUP_ID))
      .take(20);

    for (const match of matches) {
      await ctx.db.patch(match._id, { courseId: PONDOK_INDAH_ID });
    }

    return {
      message: `Jakarta Cup berhasil dipindah ke Pondok Indah Golf.`,
      tournamentUpdated: true,
      matchesUpdated: matches.length,
    };
  },
});
