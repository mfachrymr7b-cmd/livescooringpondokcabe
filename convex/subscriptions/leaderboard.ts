/**
 * ─── Leaderboard Subscriptions ───────────────────────────────────────────────
 * Real-time queries untuk leaderboard. Convex queries otomatis menjadi
 * reactive — setiap perubahan data akan push update ke semua subscriber.
 *
 * Gunakan `useQuery(api.subscriptions.leaderboard.live, { tournamentId })`
 * di client untuk mendapatkan live leaderboard.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Live leaderboard lengkap untuk satu turnamen.
 * Diurutkan berdasarkan rank (gross score).
 * Otomatis push update ke client setiap ada perubahan skor.
 */
export const live = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(256);

    // Enrich dengan data player + user (nama, avatar, handicap)
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          rank: entry.rank,
          rankDisplay: entry.rankDisplay ?? String(entry.rank),
          rankNet: entry.rankNet,
          rankNetDisplay: entry.rankNetDisplay,
          isTied: entry.isTied,
          isTiedNet: entry.isTiedNet,
          rankStableford: entry.rankStableford,
          rankStablefordDisplay: entry.rankStablefordDisplay,
          totalStablefordPoints: entry.totalStablefordPoints,
          playerId: entry.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          handicapIndex: player?.handicapIndex,
          handicapCategory: player?.handicapCategory,
          bibNumber: player?.bibNumber,
          totalStrokes: entry.totalStrokes,
          totalNetScore: entry.totalNetScore,
          scoreToPar: entry.scoreToPar,
          roundScores: entry.roundScores,
          currentRound: entry.currentRound,
          holesCompleted: entry.holesCompleted,
          isWithdrawn: entry.isWithdrawn,
          isDisqualified: entry.isDisqualified,
          updatedAt: entry.updatedAt,
        };
      })
    );

    return enriched;
  },
});

/**
 * Live leaderboard berdasarkan net score (dengan handicap).
 * Diurutkan berdasarkan rankNet.
 */
export const liveNet = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(256);

    // Sort by rankNet client-side (tidak ada index untuk rankNet)
    const sorted = [...entries].sort((a, b) => {
      const rankA = a.rankNet ?? 9999;
      const rankB = b.rankNet ?? 9999;
      return rankA - rankB;
    });

    const enriched = await Promise.all(
      sorted.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          rank: entry.rankNet ?? entry.rank,
          rankDisplay: entry.rankNetDisplay ?? entry.rankDisplay ?? String(entry.rankNet ?? entry.rank),
          rankGross: entry.rank,
          rankGrossDisplay: entry.rankDisplay ?? String(entry.rank),
          isTied: entry.isTiedNet ?? entry.isTied,
          playerId: entry.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          handicapIndex: player?.handicapIndex,
          bibNumber: player?.bibNumber,
          totalStrokes: entry.totalStrokes,
          totalNetScore: entry.totalNetScore,
          scoreToPar: entry.scoreToPar,
          roundScores: entry.roundScores,
          currentRound: entry.currentRound,
          holesCompleted: entry.holesCompleted,
          isWithdrawn: entry.isWithdrawn,
          isDisqualified: entry.isDisqualified,
          updatedAt: entry.updatedAt,
        };
      })
    );

    return enriched;
  },
});

/**
 * Live posisi satu player di leaderboard.
 * Berguna untuk tampilan "My Position" di app player.
 */
export const myPosition = query({
  args: {
    tournamentId: v.id("tournaments"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_playerId", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("playerId", args.playerId)
      )
      .unique();

    if (!entry) return null;

    // Total players untuk menampilkan "X of Y"
    const totalPlayers = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(256);

    const player = await ctx.db.get(entry.playerId);

    return {
      ...entry,
      rankDisplay: entry.rankDisplay ?? String(entry.rank),
      rankNetDisplay: entry.rankNetDisplay,
      displayName: player?.displayName,
      totalPlayers: totalPlayers.length,
    };
  },
});

/**
 * Live top N leaderboard — untuk widget/preview di halaman turnamen.
 */
export const top = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit, 50); // cap at 50

    const entries = await ctx.db
      .query("leaderboard")
      .withIndex("by_tournamentId_and_rank", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .order("asc")
      .take(limit);

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const player = await ctx.db.get(entry.playerId);
        const user = player ? await ctx.db.get(player.userId) : null;
        return {
          rank: entry.rank,
          rankDisplay: entry.rankDisplay ?? String(entry.rank),
          isTied: entry.isTied,
          playerId: entry.playerId,
          displayName: player?.displayName ?? user?.name ?? "Unknown",
          avatarUrl: user?.avatarUrl,
          totalStrokes: entry.totalStrokes,
          scoreToPar: entry.scoreToPar,
          holesCompleted: entry.holesCompleted,
          isWithdrawn: entry.isWithdrawn,
          isDisqualified: entry.isDisqualified,
        };
      })
    );

    return enriched;
  },
});
