import { query } from "../_generated/server";
import { v } from "convex/values";

/** Get scorecard by ID */
export const get = query({
  args: { id: v.id("scorecards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Get scorecard player untuk ronde tertentu */
export const getByPlayerAndRound = query({
  args: {
    playerId: v.id("players"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scorecards")
      .withIndex("by_playerId_and_roundNumber", (q) =>
        q.eq("playerId", args.playerId).eq("roundNumber", args.roundNumber)
      )
      .unique();
  },
});

/** Get semua scorecard player dalam satu turnamen */
export const listByPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scorecards")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .order("asc")
      .take(10);
  },
});

/** Get semua scorecard dalam satu match */
export const listByMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(100);
  },
});

/** Get semua hole scores untuk satu scorecard — live subscription */
export const getHoleScores = query({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) =>
        q.eq("scorecardId", args.scorecardId)
      )
      .order("asc")
      .take(18);
  },
});

/** Get scorecard lengkap dengan semua hole scores */
export const getWithHoles = query({
  args: { scorecardId: v.id("scorecards") },
  handler: async (ctx, args) => {
    const scorecard = await ctx.db.get(args.scorecardId);
    if (!scorecard) return null;

    const holes = await ctx.db
      .query("scorecard_holes")
      .withIndex("by_scorecardId_and_holeNumber", (q) =>
        q.eq("scorecardId", args.scorecardId)
      )
      .order("asc")
      .take(18);

    return { ...scorecard, holes };
  },
});

/**
 * List semua scorecard dalam satu turnamen per ronde,
 * di-enrich dengan data player. Dipakai di halaman daftar scorecard peserta.
 */
export const listByTournamentAndRound = query({
  args: {
    tournamentId: v.id("tournaments"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q
          .eq("tournamentId", args.tournamentId)
          .eq("roundNumber", args.roundNumber)
      )
      .take(256);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const player = await ctx.db.get(sc.playerId);
        return {
          ...sc,
          player: player
            ? {
                _id: player._id,
                displayName: player.displayName,
                bibNumber: player.bibNumber,
                handicapIndex: player.handicapIndex,
                status: player.status,
              }
            : null,
        };
      })
    );

    // Sort by player displayName
    enriched.sort((a, b) =>
      (a.player?.displayName ?? "").localeCompare(b.player?.displayName ?? "")
    );

    return enriched;
  },
});

/**
 * List recent scorecards across all tournaments.
 * Dipakai untuk halaman /scorecards agar nama peserta langsung terlihat.
 */
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scorecards = await ctx.db
      .query("scorecards")
      .take(args.limit ?? 50);

    const enriched = await Promise.all(
      scorecards.map(async (sc) => {
        const [player, tournament] = await Promise.all([
          ctx.db.get(sc.playerId),
          ctx.db.get(sc.tournamentId),
        ]);

        return {
          ...sc,
          player: player
            ? {
                _id: player._id,
                displayName: player.displayName,
                bibNumber: player.bibNumber,
                handicapIndex: player.handicapIndex,
                status: player.status,
              }
            : null,
          tournament: tournament
            ? {
                _id: tournament._id,
                name: tournament.name,
                holesPerRound: tournament.holesPerRound,
              }
            : null,
        };
      })
    );

    enriched.sort((a, b) =>
      (a.player?.displayName ?? "").localeCompare(b.player?.displayName ?? "")
    );

    return enriched;
  },
});

/**
 * List semua players dalam satu turnamen yang BELUM punya scorecard
 * untuk ronde tertentu. Dipakai untuk tombol "Buat Scorecard" massal.
 */
export const playersWithoutScorecard = query({
  args: {
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Ambil semua scorecard yang sudah ada untuk match ini
    const existing = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(256);

    const existingPlayerIds = new Set(existing.map((sc) => sc.playerId));

    // Ambil semua player confirmed/registered di turnamen
    const players = await ctx.db
      .query("players")
      .withIndex("by_tournamentId", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .take(256);

    return players.filter(
      (p) =>
        !existingPlayerIds.has(p._id) &&
        (p.status === "confirmed" || p.status === "registered")
    );
  },
});
