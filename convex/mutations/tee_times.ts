import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  createTeeTimeValidator,
  assignTeeTimeSlotValidator,
  updateTeeTimeStatusValidator,
} from "../validators";

/** Buat jadwal tee time */
export const create = mutation({
  args: createTeeTimeValidator,
  handler: async (ctx, args) => {
    return await ctx.db.insert("tee_times", {
      ...args,
      status: "scheduled",
    });
  },
});

/** Assign player ke slot tee time */
export const assignPlayer = mutation({
  args: assignTeeTimeSlotValidator,
  handler: async (ctx, args) => {
    // Cek player belum ada di tee time ini
    const existing = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId_and_playerId", (q) =>
        q.eq("teeTimeId", args.teeTimeId).eq("playerId", args.playerId)
      )
      .unique();
    if (existing) throw new Error("Player sudah ada di tee time ini");

    // Cek kapasitas
    const teeTime = await ctx.db.get(args.teeTimeId);
    if (!teeTime) throw new Error("Tee time tidak ditemukan");

    const currentSlots = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", args.teeTimeId))
      .take(10);

    if (currentSlots.length >= teeTime.maxPlayers) {
      throw new Error("Tee time sudah penuh");
    }

    return await ctx.db.insert("tee_time_slots", {
      ...args,
      assignedAt: Date.now(),
    });
  },
});

/** Hapus player dari tee time */
export const removePlayer = mutation({
  args: {
    teeTimeId: v.id("tee_times"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId_and_playerId", (q) =>
        q.eq("teeTimeId", args.teeTimeId).eq("playerId", args.playerId)
      )
      .unique();
    if (!slot) throw new Error("Slot tidak ditemukan");
    await ctx.db.delete(slot._id);
  },
});

/** Update status tee time */
export const updateStatus = mutation({
  args: updateTeeTimeStatusValidator,
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "checked_in") patch.checkedInAt = Date.now();
    if (args.status === "started") patch.startedAt = Date.now();
    if (args.status === "completed") patch.completedAt = Date.now();
    await ctx.db.patch(args.id, patch);
  },
});
