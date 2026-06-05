/**
 * ─── Database Schema ─────────────────────────────────────────────────────────
 *
 * Collections:
 *   users           → akun pengguna (auth identity + profil)
 *   golf_courses    → data lapangan golf
 *   golf_holes      → data per lubang (hole) dalam satu lapangan
 *   tournaments     → data turnamen
 *   matches         → pertandingan dalam turnamen
 *   players         → peserta terdaftar dalam turnamen
 *   scorecards      → kartu skor per pemain per ronde
 *   scorecard_holes → skor per lubang (child dari scorecard, tabel terpisah)
 *   leaderboard     → peringkat live per turnamen (denormalized)
 *   tee_times       → jadwal tee time per grup per ronde
 *   tee_time_slots  → anggota grup dalam satu tee time
 *
 * Relations:
 *   golf_holes      → golf_courses (courseId)
 *   tournaments     → golf_courses (courseId), users (organizerId)
 *   matches         → tournaments (tournamentId), golf_courses (courseId)
 *   players         → tournaments (tournamentId), users (userId)
 *   scorecards      → players (playerId), tournaments (tournamentId), matches (matchId)
 *   scorecard_holes → scorecards (scorecardId), golf_holes (holeId)
 *   leaderboard     → tournaments (tournamentId), players (playerId)
 *   tee_times       → tournaments (tournamentId), matches (matchId)
 *   tee_time_slots  → tee_times (teeTimeId), players (playerId)
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  userRoleValidator,
  userStatusValidator,
  courseDifficultyValidator,
  holeTeeValidator as _holeTeeValidator,
  tournamentStatusValidator,
  tournamentFormatValidator,
  tournamentFlightStatusValidator,
  matchStatusValidator,
  playerStatusValidator,
  handicapCategoryValidator,
  scorecardStatusValidator,
  teeTimeStatusValidator,
} from "./types";

export default defineSchema({
  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════
  users: defineTable({
    // Auth — email+password (custom JWT)
    email: v.string(),
    passwordHash: v.string(),          // bcrypt hash, NEVER expose to client
    // External auth (opsional, jika pakai OAuth di masa depan)
    tokenIdentifier: v.optional(v.string()),
    // Profil
    name: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    // Golf
    handicapIndex: v.optional(v.number()),
    handicapCategory: v.optional(handicapCategoryValidator),
    membershipNumber: v.optional(v.string()),
    // Role & Scope
    role: userRoleValidator,
    // club_admin & tournament_admin di-scope ke club tertentu
    clubId: v.optional(v.id("golf_courses")), // reuse golf_courses sebagai "club"
    // Status
    status: userStatusValidator,
    // Timestamps
    lastActiveAt: v.optional(v.number()),
    passwordChangedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_role_and_status", ["role", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH SESSIONS (high-churn — tabel terpisah sesuai guidelines)
  // Satu session = satu login aktif
  // ═══════════════════════════════════════════════════════════════════════════
  auth_sessions: defineTable({
    userId: v.id("users"),
    // JWT access token identifier (jti claim)
    jti: v.string(),
    // Device / client info
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    // Lifecycle
    expiresAt: v.number(),             // Unix ms
    revokedAt: v.optional(v.number()),
    lastUsedAt: v.number(),
  })
    .index("by_jti", ["jti"])
    .index("by_userId", ["userId"])
    .index("by_userId_and_expiresAt", ["userId", "expiresAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH LOGIN ATTEMPTS (high-churn — rate limiting & brute-force protection)
  // Satu dokumen per email — di-patch setiap attempt
  // ═══════════════════════════════════════════════════════════════════════════
  auth_login_attempts: defineTable({
    email: v.string(),
    failedCount: v.number(),           // jumlah gagal berturut-turut
    lastFailedAt: v.number(),          // Unix ms
    lockedUntil: v.optional(v.number()), // Unix ms — null jika tidak terkunci
  })
    .index("by_email", ["email"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH REFRESH TOKENS (high-churn — tabel terpisah)
  // ═══════════════════════════════════════════════════════════════════════════
  auth_refresh_tokens: defineTable({
    userId: v.id("users"),
    sessionId: v.id("auth_sessions"),
    // Hashed token (SHA-256 dari raw token yang dikirim ke client)
    tokenHash: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    replacedByTokenHash: v.optional(v.string()), // rotation chain
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // API RATE LIMITS / ERROR LOGGING
  // Used by HTTP auth endpoints and admin routes to protect sensitive API paths.
  api_rate_limits: defineTable({
    key: v.string(),
    route: v.string(),
    windowStart: v.number(),
    count: v.number(),
    lastRequestAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_route", ["route"]),

  api_logs: defineTable({
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    category: v.string(),
    message: v.string(),
    details: v.optional(v.string()),
    route: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_route", ["route"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // GOLF COURSES
  // ═══════════════════════════════════════════════════════════════════════════
  golf_courses: defineTable({
    name: v.string(),
    slug: v.string(),                  // URL-friendly unique identifier
    description: v.optional(v.string()),
    // Lokasi
    address: v.string(),
    city: v.string(),
    province: v.string(),
    country: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    // Spesifikasi
    totalHoles: v.number(),            // 9 atau 18
    par: v.number(),                   // total par lapangan
    courseRating: v.optional(v.number()),
    slopeRating: v.optional(v.number()),
    difficulty: courseDifficultyValidator,
    // Media
    logoUrl: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    // Meta
    isActive: v.boolean(),
    establishedYear: v.optional(v.number()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_city", ["city"])
    .index("by_isActive", ["isActive"])
    .index("by_city_and_isActive", ["city", "isActive"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["city", "isActive"] }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GOLF HOLES
  // Tabel terpisah dari golf_courses — satu course punya 9/18 holes
  // ═══════════════════════════════════════════════════════════════════════════
  golf_holes: defineTable({
    courseId: v.id("golf_courses"),
    holeNumber: v.number(),            // 1–18
    par: v.number(),                   // 3, 4, atau 5
    // Jarak per tee (dalam meter)
    distanceBlack: v.optional(v.number()),
    distanceBlue: v.optional(v.number()),
    distanceWhite: v.optional(v.number()),
    distanceYellow: v.optional(v.number()),
    distanceRed: v.optional(v.number()),
    // Handicap stroke index (1–18, urutan kesulitan)
    strokeIndex: v.number(),
    // Deskripsi
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index("by_courseId", ["courseId"])
    .index("by_courseId_and_holeNumber", ["courseId", "holeNumber"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TOURNAMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  tournaments: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    // Relasi
    courseId: v.id("golf_courses"),
    organizerId: v.id("users"),
    // Format & Aturan
    format: tournamentFormatValidator,
    status: tournamentStatusValidator,
    totalRounds: v.number(),           // jumlah ronde (1–4)
    holesPerRound: v.number(),         // 9 atau 18
    useHandicap: v.boolean(),
    maxParticipants: v.optional(v.number()),
    minHandicap: v.optional(v.number()),
    maxHandicap: v.optional(v.number()),
    entryFee: v.optional(v.number()),
    currency: v.optional(v.string()),  // "IDR", "USD", dll
    // Jadwal
    registrationOpenAt: v.number(),
    registrationCloseAt: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    // Media & Info
    bannerUrl: v.optional(v.string()),
    rulesUrl: v.optional(v.string()),
    prizePool: v.optional(v.number()),
    // Denormalized counters (update via mutation)
    participantCount: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_courseId", ["courseId"])
    .index("by_organizerId", ["organizerId"])
    .index("by_status", ["status"])
    .index("by_startDate", ["startDate"])
    .index("by_status_and_startDate", ["status", "startDate"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["status"] }),

  // ═══════════════════════════════════════════════════════════════════════════
  // MATCHES
  // Satu turnamen bisa punya banyak match (per ronde, per flight, dll)
  // ═══════════════════════════════════════════════════════════════════════════
  matches: defineTable({
    tournamentId: v.id("tournaments"),
    courseId: v.id("golf_courses"),
    // Identifikasi
    roundNumber: v.number(),           // ronde ke-1, 2, 3, 4
    flightName: v.optional(v.string()), // "Flight A", "Morning", dll
    // Status & Jadwal
    status: matchStatusValidator,
    scheduledDate: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Konfigurasi
    holesPlayed: v.number(),           // 9 atau 18
    startingHole: v.number(),          // biasanya 1 atau 10 (shotgun)
    notes: v.optional(v.string()),
    // Match play result (denormalized setelah skor final)
    winnerPlayerId: v.optional(v.id("players")),
    matchResult: v.optional(v.string()), // e.g. "2 UP", "Halved"
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournamentId_and_roundNumber", ["tournamentId", "roundNumber"])
    .index("by_status", ["status"])
    .index("by_scheduledDate", ["scheduledDate"])
    .index("by_tournamentId_and_status", ["tournamentId", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYERS (peserta turnamen)
  // Satu user bisa jadi player di banyak turnamen
  // ═══════════════════════════════════════════════════════════════════════════
  players: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    // Profil saat registrasi (snapshot, tidak berubah jika user update profil)
    displayName: v.string(),
    handicapIndex: v.optional(v.number()),
    handicapCategory: v.optional(handicapCategoryValidator),
    // Status
    status: playerStatusValidator,
    bibNumber: v.optional(v.string()),  // nomor peserta
    // Registrasi
    registeredAt: v.number(),
    confirmedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
    withdrawalReason: v.optional(v.string()),
    // Denormalized (update via mutation)
    totalScore: v.optional(v.number()),
    totalNetScore: v.optional(v.number()),
    currentRound: v.optional(v.number()),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_userId", ["userId"])
    .index("by_tournamentId_and_userId", ["tournamentId", "userId"])
    .index("by_tournamentId_and_status", ["tournamentId", "status"])
    .index("by_userId_and_status", ["userId", "status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TOURNAMENT FLIGHTS
  // Flight metadata and player membership are stored separately to avoid
  // unbounded player arrays on a tournament or flight document.
  // ═══════════════════════════════════════════════════════════════════════════
  tournament_flights: defineTable({
    tournamentId: v.id("tournaments"),
    matchId: v.optional(v.id("matches")),
    roundNumber: v.number(),
    name: v.string(),
    sequence: v.number(),
    maxPlayers: v.number(),
    status: tournamentFlightStatusValidator,
    seedMethod: v.union(
      v.literal("registration_order"),
      v.literal("handicap_asc"),
      v.literal("handicap_desc"),
      v.literal("balanced"),
      v.literal("random")
    ),
    pairingStrategy: v.optional(
      v.union(
        v.literal("none"),
        v.literal("random"),
        v.literal("handicap_balanced"),
        v.literal("team_balanced"),
        v.literal("sequential")
      )
    ),
    teamSize: v.optional(v.number()),
    generatedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournamentId_and_roundNumber", ["tournamentId", "roundNumber"])
    .index("by_tournamentId_and_roundNumber_and_sequence", [
      "tournamentId",
      "roundNumber",
      "sequence",
    ])
    .index("by_matchId", ["matchId"])
    .index("by_status", ["status"]),

  flight_players: defineTable({
    tournamentId: v.id("tournaments"),
    flightId: v.id("tournament_flights"),
    playerId: v.id("players"),
    slotOrder: v.number(),
    pairNumber: v.optional(v.number()),
    teamNumber: v.optional(v.number()),
    assignedAt: v.number(),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_flightId", ["flightId"])
    .index("by_flightId_and_slotOrder", ["flightId", "slotOrder"])
    .index("by_flightId_and_teamNumber", ["flightId", "teamNumber"])
    .index("by_flightId_and_playerId", ["flightId", "playerId"])
    .index("by_tournamentId_and_playerId", ["tournamentId", "playerId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORECARDS
  // Satu scorecard = satu pemain, satu ronde
  // ═══════════════════════════════════════════════════════════════════════════
  scorecards: defineTable({
    playerId: v.id("players"),
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    // Identifikasi ronde
    roundNumber: v.number(),
    // Skor agregat (dihitung dari scorecard_holes)
    totalStrokes: v.optional(v.number()),
    totalPutts: v.optional(v.number()),
    totalNetScore: v.optional(v.number()),
    scoreToPar: v.optional(v.number()),  // negatif = under par
    totalStablefordPoints: v.optional(v.number()),
    matchplayHolesWon: v.optional(v.number()),
    matchplayHolesLost: v.optional(v.number()),
    matchplayHolesHalved: v.optional(v.number()),
    matchplayStanding: v.optional(v.string()), // e.g. "2 UP", "AS"
    matchOutcome: v.optional(
      v.union(
        v.literal("won"),
        v.literal("lost"),
        v.literal("halved"),
        v.literal("pending")
      )
    ),
    isMatchWinner: v.optional(v.boolean()),
    // Handicap yang dipakai di ronde ini (snapshot)
    playingHandicap: v.optional(v.number()),
    // Status & Verifikasi
    status: scorecardStatusValidator,
    submittedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.id("users")),
    // Marker (pemain lain yang menandatangani kartu)
    markerId: v.optional(v.id("players")),
    notes: v.optional(v.string()),
  })
    .index("by_playerId", ["playerId"])
    .index("by_tournamentId", ["tournamentId"])
    .index("by_matchId", ["matchId"])
    .index("by_playerId_and_roundNumber", ["playerId", "roundNumber"])
    .index("by_tournamentId_and_roundNumber", ["tournamentId", "roundNumber"])
    .index("by_matchId_and_playerId", ["matchId", "playerId"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORECARD HOLES
  // Skor per lubang — tabel terpisah agar tidak hit 1MB limit
  // ═══════════════════════════════════════════════════════════════════════════
  scorecard_holes: defineTable({
    scorecardId: v.id("scorecards"),
    holeId: v.id("golf_holes"),
    holeNumber: v.number(),            // denormalized untuk query cepat
    // Skor
    strokes: v.number(),               // jumlah pukulan
    putts: v.optional(v.number()),
    penaltyStrokes: v.optional(v.number()),
    netStrokes: v.optional(v.number()), // strokes - handicap stroke
    handicapStrokes: v.optional(v.number()),
    grossScoreToPar: v.optional(v.number()),
    netScoreToPar: v.optional(v.number()),
    // Stableford points (jika format stableford)
    stablefordPoints: v.optional(v.number()),
    // Match play: +1 won, 0 halved, -1 lost
    matchplayPoints: v.optional(v.number()),
    // Flags (gross score vs par)
    isGir: v.optional(v.boolean()),    // Green In Regulation
    isFairwayHit: v.optional(v.boolean()),
    isBirdie: v.optional(v.boolean()),
    isEagle: v.optional(v.boolean()),
    isBogey: v.optional(v.boolean()),
    isDoubleBogey: v.optional(v.boolean()),
    recordedAt: v.number(),
  })
    .index("by_scorecardId", ["scorecardId"])
    .index("by_scorecardId_and_holeNumber", ["scorecardId", "holeNumber"])
    .index("by_holeId", ["holeId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // LEADERBOARD
  // Denormalized untuk realtime reads — di-update setiap skor masuk
  // ═══════════════════════════════════════════════════════════════════════════
  leaderboard: defineTable({
    tournamentId: v.id("tournaments"),
    playerId: v.id("players"),
    // Skor
    totalStrokes: v.number(),
    totalNetScore: v.optional(v.number()),
    scoreToPar: v.number(),
    // Per ronde (array kecil, max 4 elemen — aman di bawah 8192 limit)
    roundScores: v.array(
      v.object({
        roundNumber: v.number(),
        strokes: v.number(),
        netScore: v.optional(v.number()),
      })
    ),
    // Peringkat
    rank: v.number(),
    rankDisplay: v.optional(v.string()), // "1", "T2", …
    rankNet: v.optional(v.number()),
    rankNetDisplay: v.optional(v.string()),
    isTied: v.optional(v.boolean()),
    isTiedNet: v.optional(v.boolean()),
    totalStablefordPoints: v.optional(v.number()),
    rankStableford: v.optional(v.number()),
    rankStablefordDisplay: v.optional(v.string()),
    // Status pemain
    currentRound: v.number(),
    holesCompleted: v.number(),
    isWithdrawn: v.boolean(),
    isDisqualified: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournamentId_and_rank", ["tournamentId", "rank"])
    .index("by_tournamentId_and_playerId", ["tournamentId", "playerId"])
    .index("by_playerId", ["playerId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TEE TIMES
  // Jadwal tee time per grup per ronde
  // ═══════════════════════════════════════════════════════════════════════════
  tee_times: defineTable({
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    flightId: v.optional(v.id("tournament_flights")),
    roundNumber: v.number(),
    // Jadwal
    scheduledTime: v.number(),         // Unix timestamp
    startingHole: v.number(),          // hole pertama grup ini mulai
    // Status
    status: teeTimeStatusValidator,
    checkedInAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Info grup
    groupName: v.optional(v.string()), // "Group 1", "A1", dll
    maxPlayers: v.number(),            // biasanya 2–4
    notes: v.optional(v.string()),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_matchId", ["matchId"])
    .index("by_tournamentId_and_roundNumber", ["tournamentId", "roundNumber"])
    .index("by_tournamentId_and_roundNumber_and_flightId", [
      "tournamentId",
      "roundNumber",
      "flightId",
    ])
    .index("by_scheduledTime", ["scheduledTime"])
    .index("by_matchId_and_scheduledTime", ["matchId", "scheduledTime"])
    .index("by_status", ["status"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TEE TIME SLOTS
  // Anggota grup dalam satu tee time — tabel terpisah agar tidak unbounded
  // ═══════════════════════════════════════════════════════════════════════════
  tee_time_slots: defineTable({
    teeTimeId: v.id("tee_times"),
    playerId: v.id("players"),
    tournamentId: v.id("tournaments"), // denormalized untuk query langsung
    slotOrder: v.number(),             // urutan dalam grup (1, 2, 3, 4)
    pairNumber: v.optional(v.number()),
    teamNumber: v.optional(v.number()),
    assignedAt: v.number(),
  })
    .index("by_teeTimeId", ["teeTimeId"])
    .index("by_playerId", ["playerId"])
    .index("by_teeTimeId_and_playerId", ["teeTimeId", "playerId"])
    .index("by_tournamentId_and_playerId", ["tournamentId", "playerId"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // BROADCAST COMMENTS
  // Komentar live dari penonton yang tampil di TV mode
  // ═══════════════════════════════════════════════════════════════════════════
  broadcast_comments: defineTable({
    tournamentId: v.id("tournaments"),
    authorName: v.string(),            // nama pengirim (bebas, tanpa login)
    message: v.string(),               // isi komentar (max 200 char)
    isApproved: v.boolean(),           // moderasi — hanya tampil jika true
    isPinned: v.optional(v.boolean()), // pin komentar penting di atas
    createdAt: v.number(),
  })
    .index("by_tournamentId", ["tournamentId"])
    .index("by_tournamentId_and_isApproved", ["tournamentId", "isApproved"])
    .index("by_tournamentId_and_createdAt", ["tournamentId", "createdAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // RUNNING TEXTS
  // Teks berjalan yang ditampilkan di halaman Live Scoring
  // ═══════════════════════════════════════════════════════════════════════════
  running_texts: defineTable({
    text: v.string(),                  // isi teks
    isActive: v.boolean(),             // apakah sedang aktif ditampilkan
    order: v.number(),                 // urutan tampil (ascending)
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_order", ["order"])
    .index("by_isActive_and_order", ["isActive", "order"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // Per-user in-app notifications (tournament started, scorecard verified, etc.)
  // ═══════════════════════════════════════════════════════════════════════════
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("tournament"),
      v.literal("scorecard"),
      v.literal("match"),
      v.literal("system")
    ),
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    // Optional links
    tournamentId: v.optional(v.id("tournaments")),
    matchId: v.optional(v.id("matches")),
    scorecardId: v.optional(v.id("scorecards")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_read", ["userId", "read"]),
});
