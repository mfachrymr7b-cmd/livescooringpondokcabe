import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { registerPlayerValidator, updatePlayerStatusValidator } from "../validators";

/** Daftarkan player ke turnamen */
export const register = mutation({
  args: registerPlayerValidator,
  handler: async (ctx, args) => {
    // Cek tidak double-register
    const existing = await ctx.db
      .query("players")
      .withIndex("by_tournamentId_and_userId", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .unique();
    if (existing) throw new Error("Player sudah terdaftar di turnamen ini");

    // Cek kapasitas turnamen
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Turnamen tidak ditemukan");
    if (
      tournament.maxParticipants !== undefined &&
      tournament.participantCount >= tournament.maxParticipants
    ) {
      throw new Error("Turnamen sudah penuh");
    }

    const playerId = await ctx.db.insert("players", {
      tournamentId: args.tournamentId,
      userId: args.userId,
      displayName: args.displayName,
      handicapIndex: args.handicapIndex,
      handicapCategory: args.handicapCategory,
      bibNumber: args.bibNumber,
      status: "registered",
      registeredAt: Date.now(),
    });

    // Update counter
    await ctx.db.patch(args.tournamentId, {
      participantCount: tournament.participantCount + 1,
    });

    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: args.tournamentId,
    });

    return playerId;
  },
});

/** Update status player */
export const updateStatus = mutation({
  args: updatePlayerStatusValidator,
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.id);
    if (!player) throw new Error("Player tidak ditemukan");

    const patch: Record<string, unknown> = { status: args.status };

    if (args.status === "confirmed") patch.confirmedAt = Date.now();
    if (args.status === "withdrawn") {
      patch.withdrawnAt = Date.now();
      if (args.withdrawalReason) patch.withdrawalReason = args.withdrawalReason;

      // Kurangi counter
      const tournament = await ctx.db.get(player.tournamentId);
      if (tournament && tournament.participantCount > 0) {
        await ctx.db.patch(player.tournamentId, {
          participantCount: tournament.participantCount - 1,
        });
      }
    }

    await ctx.db.patch(args.id, patch);

    await ctx.scheduler.runAfter(0, internal.mutations.leaderboard.recalculate, {
      tournamentId: player.tournamentId,
    });
  },
});

/** Assign bib number ke player */
export const assignBib = mutation({
  args: { id: v.id("players"), bibNumber: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { bibNumber: args.bibNumber });
  },
});
