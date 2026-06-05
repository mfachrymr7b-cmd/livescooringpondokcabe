import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
/**
 * Auto-start tournaments when startDate is reached.
 * Mengubah status turnamen ke "ongoing" saat startDate sudah lewat.
 */
export const autoStartTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Ambil turnamen yang belum ongoing/completed/cancelled
    // dan startDate-nya sudah lewat
    const statuses = [
      "draft",
      "registration_open",
      "registration_closed",
    ] as const;

    for (const status of statuses) {
      const tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(50);

      for (const tournament of tournaments) {
        if (tournament.startDate <= now) {
          await ctx.db.patch(tournament._id, { status: "ongoing" });
          console.log(`Auto-started tournament: ${tournament.name} (${tournament._id})`);
        }
      }
    }
  },
});

/**
 * Auto-complete tournaments when endDate is reached.
 * Mengubah status "ongoing" ke "completed" saat endDate sudah lewat.
 */
export const autoCompleteTournaments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const ongoingTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "ongoing"))
      .take(50);

    for (const tournament of ongoingTournaments) {
      if (tournament.endDate <= now) {
        await ctx.db.patch(tournament._id, { status: "completed" });
        console.log(`Auto-completed tournament: ${tournament.name} (${tournament._id})`);
      }
    }
  },
});

// ─── Cron schedules ──────────────────────────────────────────────────────────

const crons = cronJobs();

// Cek setiap 1 menit untuk auto-start
crons.interval(
  "auto-start tournaments",
  { minutes: 1 },
  internal.crons.autoStartTournaments,
  {}
);

// Cek setiap 5 menit untuk auto-complete
crons.interval(
  "auto-complete tournaments",
  { minutes: 5 },
  internal.crons.autoCompleteTournaments,
  {}
);

export default crons;
