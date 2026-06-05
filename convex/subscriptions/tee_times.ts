/**
 * ─── Tee Time Subscriptions ───────────────────────────────────────────────────
 * Real-time queries untuk jadwal tee time.
 * Berguna untuk tampilan papan jadwal di clubhouse atau app player.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live jadwal tee time untuk satu ronde, lengkap dengan daftar player.
 * Diurutkan berdasarkan scheduledTime ascending.
 */
export const liveSchedule = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const teeTimes = await ctx.db
      .query("tee_times")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .order("asc")
      .take(100);

    const enriched = await Promise.all(
      teeTimes.map(async (tt) => {
        const slots = await ctx.db
          .query("tee_time_slots")
          .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", tt._id))
          .order("asc")
          .take(6);

        const players = await Promise.all(
          slots.map(async (slot) => {
            const player = await ctx.db.get(slot.playerId);
            const user = player ? await ctx.db.get(player.userId) : null;
            return {
              slotOrder: slot.slotOrder,
              playerId: slot.playerId,
              displayName: player?.displayName ?? user?.name ?? "Unknown",
              bibNumber: player?.bibNumber,
              handicapIndex: player?.handicapIndex,
              avatarUrl: user?.avatarUrl,
            };
          })
        );

        return {
          teeTimeId: tt._id,
          groupName: tt.groupName,
          scheduledTime: tt.scheduledTime,
          startingHole: tt.startingHole,
          status: tt.status,
          maxPlayers: tt.maxPlayers,
          currentPlayers: slots.length,
          players: players.sort((a, b) => a.slotOrder - b.slotOrder),
        };
      })
    );

    return enriched;
  },
});

/**
 * Live tee time seorang player — untuk tampilan "My Tee Time".
 */
export const myTeeTime = query({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.id("players"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Cari slot player di ronde ini
    const slot = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_tournamentId_and_playerId", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!slot) return null;

    const teeTime = await ctx.db.get(slot.teeTimeId);
    if (!teeTime || teeTime.roundNumber !== args.roundNumber) return null;

    // Ambil semua player dalam grup yang sama
    const groupSlots = await ctx.db
      .query("tee_time_slots")
      .withIndex("by_teeTimeId", (q) => q.eq("teeTimeId", slot.teeTimeId))
      .order("asc")
      .take(6);

    const groupPlayers = await Promise.all(
      groupSlots.map(async (s) => {
        const player = await ctx.db.get(s.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          slotOrder: s.slotOrder,
          playerId: s.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          bibNumber: player?.bibNumber,
          handicapIndex: player?.handicapIndex,
          isMe: s.playerId === args.playerId,
        };
      })
    );

    return {
      teeTimeId: teeTime._id,
      groupName: teeTime.groupName,
      scheduledTime: teeTime.scheduledTime,
      startingHole: teeTime.startingHole,
      status: teeTime.status,
      roundNumber: teeTime.roundNumber,
      groupPlayers: groupPlayers.sort((a, b) => a.slotOrder - b.slotOrder),
    };
  },
});
