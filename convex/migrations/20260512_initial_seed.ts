/**
 * Migration: Initial seed data untuk development
 * Date: 2026-05-12
 * Reason: Setup data awal untuk testing — golf course contoh + admin user
 *
 * Jalankan: npx convex run migrations/20260512_initial_seed:seedCourse
 *           npx convex run migrations/20260512_initial_seed:seedDevUser
 *           npx convex run migrations/20260512_initial_seed:clearAll (hati-hati!)
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/** Seed satu golf course contoh untuk development */
export const seedCourse = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Cek apakah sudah ada
    const existing = await ctx.db
      .query("golf_courses")
      .withIndex("by_slug", (q) => q.eq("slug", "lapangan-golf-contoh"))
      .unique();

    if (existing) {
      return { message: "Course sudah ada, skip.", id: existing._id };
    }

    const courseId = await ctx.db.insert("golf_courses", {
      name: "Lapangan Golf Contoh",
      slug: "lapangan-golf-contoh",
      description: "Lapangan golf contoh untuk development dan testing.",
      address: "Jl. Golf Raya No. 1",
      city: "Jakarta",
      province: "DKI Jakarta",
      country: "Indonesia",
      totalHoles: 18,
      par: 72,
      courseRating: 71.5,
      slopeRating: 125,
      difficulty: "intermediate",
      isActive: true,
    });

    // Seed 18 holes
    const holePars = [4, 5, 3, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4];
    const strokeIndexes = [7, 1, 15, 11, 5, 3, 17, 9, 13, 8, 16, 2, 12, 6, 18, 4, 10, 14];

    for (let i = 0; i < 18; i++) {
      await ctx.db.insert("golf_holes", {
        courseId,
        holeNumber: i + 1,
        par: holePars[i],
        distanceWhite: 350 + Math.floor(Math.random() * 200),
        distanceYellow: 320 + Math.floor(Math.random() * 180),
        distanceRed: 280 + Math.floor(Math.random() * 150),
        strokeIndex: strokeIndexes[i],
      });
    }

    return { message: "Course dan 18 holes berhasil dibuat.", courseId };
  },
});

/**
 * Hapus semua data development — HANYA untuk dev environment!
 * Proses dalam batch untuk menghindari transaction limit.
 */
export const clearAll = internalMutation({
  args: { confirm: v.literal("DELETE_ALL_DEV_DATA") },
  handler: async (ctx, _args) => {
    const tables = [
      "tee_time_slots",
      "tee_times",
      "leaderboard",
      "scorecard_holes",
      "scorecards",
      "players",
      "matches",
      "tournaments",
      "golf_holes",
      "golf_courses",
      "users",
    ] as const;

    const counts: Record<string, number> = {};

    for (const table of tables) {
      let deleted = 0;
      let hasMore = true;
      while (hasMore) {
        const batch = await ctx.db.query(table).take(100);
        if (batch.length === 0) {
          hasMore = false;
        } else {
          for (const doc of batch) {
            await ctx.db.delete(doc._id);
            deleted++;
          }
        }
      }
      counts[table] = deleted;
    }

    return { message: "Semua data dihapus.", counts };
  },
});
