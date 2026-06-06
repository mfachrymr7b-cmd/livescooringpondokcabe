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

/**
 * List scorecard per match, dikelompokkan per flight.
 * Dipakai di ScorecardsListPage untuk tampilan folder Flight.
 */
export const listByMatchGroupedByFlight = query({
  args: {
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Ambil semua flight untuk match ini
    const match = await ctx.db.get(args.matchId);
    if (!match) return [];

    const flights = await ctx.db
      .query("tournament_flights")
      .withIndex("by_tournamentId_and_roundNumber", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("roundNumber", match.roundNumber)
      )
      .take(50);

    // Ambil semua scorecard untuk match ini
    const scorecards = await ctx.db
      .query("scorecards")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .take(256);

    // Enrich scorecard dengan data player
    const enrichedScorecards = await Promise.all(
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

    // Build map: playerId → flightName
    const playerFlightMap = new Map<string, { flightId: string; flightName: string; sequence: number }>();
    for (const flight of flights) {
      const members = await ctx.db
        .query("flight_players")
        .withIndex("by_flightId", (q) => q.eq("flightId", flight._id))
        .take(50);
      for (const m of members) {
        playerFlightMap.set(m.playerId, {
          flightId: flight._id,
          flightName: flight.name,
          sequence: flight.sequence,
        });
      }
    }

    // Group scorecard by flight
    const flightGroups = new Map<string, {
      flightId: string;
      flightName: string;
      sequence: number;
      scorecards: typeof enrichedScorecards;
    }>();

    // Inisialisasi semua flight (termasuk yang belum ada scorecard)
    for (const flight of flights) {
      flightGroups.set(flight._id, {
        flightId: flight._id,
        flightName: flight.name,
        sequence: flight.sequence,
        scorecards: [],
      });
    }

    // Tambahkan group "Tanpa Flight" untuk yang tidak ter-assign
    flightGroups.set("no_flight", {
      flightId: "no_flight",
      flightName: "Tanpa Flight",
      sequence: 999,
      scorecards: [],
    });

    for (const sc of enrichedScorecards) {
      const flightInfo = playerFlightMap.get(sc.playerId);
      const key = flightInfo?.flightId ?? "no_flight";
      if (!flightGroups.has(key)) {
        flightGroups.set(key, {
          flightId: key,
          flightName: flightInfo?.flightName ?? "Tanpa Flight",
          sequence: flightInfo?.sequence ?? 999,
          scorecards: [],
        });
      }
      flightGroups.get(key)!.scorecards.push(sc);
    }

    // Sort tiap grup by displayName, sort grup by sequence
    return Array.from(flightGroups.values())
      .filter((g) => g.scorecards.length > 0) // hanya tampilkan flight yang ada scorecard-nya
      .sort((a, b) => a.sequence - b.sequence)
      .map((g) => ({
        ...g,
        scorecards: g.scorecards.sort((a, b) =>
          (a.player?.displayName ?? "").localeCompare(b.player?.displayName ?? "")
        ),
      }));
  },
});
