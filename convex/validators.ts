/**
 * ─── Shared Validators ───────────────────────────────────────────────────────
 * Reusable argument validators untuk mutations dan queries.
 * Import dari sini agar tidak duplikasi definisi di setiap file.
 */

import { v } from "convex/values";
import {
  userRoleValidator,
  userStatusValidator,
  courseDifficultyValidator,
  tournamentStatusValidator,
  tournamentFormatValidator,
  matchStatusValidator,
  playerStatusValidator,
  handicapCategoryValidator,
  scorecardStatusValidator,
  teeTimeStatusValidator,
} from "./types";

// ─── User Validators ─────────────────────────────────────────────────────────

export const createUserValidator = {
  tokenIdentifier: v.optional(v.string()),  // optional — custom auth users tidak punya ini
  email: v.string(),
  name: v.string(),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
  handicapIndex: v.optional(v.number()),
  handicapCategory: v.optional(handicapCategoryValidator),
  membershipNumber: v.optional(v.string()),
  role: userRoleValidator,
};

export const updateUserValidator = {
  id: v.id("users"),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  phoneNumber: v.optional(v.string()),
  handicapIndex: v.optional(v.number()),
  handicapCategory: v.optional(handicapCategoryValidator),
  membershipNumber: v.optional(v.string()),
  status: v.optional(userStatusValidator),
  role: v.optional(userRoleValidator),
};

// ─── Golf Course Validators ───────────────────────────────────────────────────

export const createCourseValidator = {
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  address: v.string(),
  city: v.string(),
  province: v.string(),
  country: v.string(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  totalHoles: v.number(),
  par: v.number(),
  courseRating: v.optional(v.number()),
  slopeRating: v.optional(v.number()),
  difficulty: courseDifficultyValidator,
  logoUrl: v.optional(v.string()),
  coverImageUrl: v.optional(v.string()),
  establishedYear: v.optional(v.number()),
  website: v.optional(v.string()),
  phone: v.optional(v.string()),
};

export const updateCourseValidator = {
  id: v.id("golf_courses"),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  province: v.optional(v.string()),
  courseRating: v.optional(v.number()),
  slopeRating: v.optional(v.number()),
  difficulty: v.optional(courseDifficultyValidator),
  logoUrl: v.optional(v.string()),
  coverImageUrl: v.optional(v.string()),
  website: v.optional(v.string()),
  phone: v.optional(v.string()),
  isActive: v.optional(v.boolean()),
};

// ─── Golf Hole Validators ─────────────────────────────────────────────────────

export const createHoleValidator = {
  courseId: v.id("golf_courses"),
  holeNumber: v.number(),
  par: v.number(),
  distanceBlack: v.optional(v.number()),
  distanceBlue: v.optional(v.number()),
  distanceWhite: v.optional(v.number()),
  distanceYellow: v.optional(v.number()),
  distanceRed: v.optional(v.number()),
  strokeIndex: v.number(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
};

// ─── Tournament Validators ────────────────────────────────────────────────────

export const createTournamentValidator = {
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  courseId: v.id("golf_courses"),
  format: tournamentFormatValidator,
  totalRounds: v.number(),
  holesPerRound: v.number(),
  useHandicap: v.boolean(),
  maxParticipants: v.optional(v.number()),
  minHandicap: v.optional(v.number()),
  maxHandicap: v.optional(v.number()),
  entryFee: v.optional(v.number()),
  currency: v.optional(v.string()),
  registrationOpenAt: v.number(),
  registrationCloseAt: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  bannerUrl: v.optional(v.string()),
  rulesUrl: v.optional(v.string()),
  prizePool: v.optional(v.number()),
};

export const updateTournamentStatusValidator = {
  id: v.id("tournaments"),
  status: tournamentStatusValidator,
  userId: v.optional(v.string()),
};

export const updateTournamentValidator = {
  id: v.id("tournaments"),
  name: v.optional(v.string()),
  slug: v.optional(v.string()),
  description: v.optional(v.string()),
  courseId: v.optional(v.id("golf_courses")),
  format: v.optional(tournamentFormatValidator),
  status: v.optional(tournamentStatusValidator),
  totalRounds: v.optional(v.number()),
  holesPerRound: v.optional(v.number()),
  useHandicap: v.optional(v.boolean()),
  maxParticipants: v.optional(v.number()),
  minHandicap: v.optional(v.number()),
  maxHandicap: v.optional(v.number()),
  entryFee: v.optional(v.number()),
  currency: v.optional(v.string()),
  registrationOpenAt: v.optional(v.number()),
  registrationCloseAt: v.optional(v.number()),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  bannerUrl: v.optional(v.string()),
  rulesUrl: v.optional(v.string()),
  prizePool: v.optional(v.number()),
  userId: v.optional(v.string()),
};

export const generateFlightsValidator = {
  tournamentId: v.id("tournaments"),
  matchId: v.optional(v.id("matches")),
  roundNumber: v.number(),
  maxPlayersPerFlight: v.number(),
  namePrefix: v.optional(v.string()),
  seedMethod: v.optional(
    v.union(
      v.literal("registration_order"),
      v.literal("handicap_asc"),
      v.literal("handicap_desc"),
      v.literal("balanced"),
      v.literal("random")
    )
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
  randomSeed: v.optional(v.number()),
  includeStatuses: v.optional(v.array(playerStatusValidator)),
  replaceExisting: v.optional(v.boolean()),
  userId: v.optional(v.string()),
};

export const generateTeeTimesValidator = {
  tournamentId: v.id("tournaments"),
  matchId: v.id("matches"),
  roundNumber: v.number(),
  firstTeeTime: v.number(),
  intervalMinutes: v.number(),
  maxPlayersPerTeeTime: v.optional(v.number()),
  startingHole: v.optional(v.number()),
  shotgun: v.optional(v.boolean()),
  replaceExisting: v.optional(v.boolean()),
  userId: v.optional(v.string()),
};

export const pairPlayersValidator = {
  tournamentId: v.id("tournaments"),
  roundNumber: v.number(),
  pairingStrategy: v.union(
    v.literal("random"),
    v.literal("handicap_balanced"),
    v.literal("team_balanced"),
    v.literal("sequential")
  ),
  teamSize: v.optional(v.number()),
  randomSeed: v.optional(v.number()),
  userId: v.optional(v.string()),
};

// ─── Match Validators ─────────────────────────────────────────────────────────

export const createMatchValidator = {
  tournamentId: v.id("tournaments"),
  courseId: v.id("golf_courses"),
  roundNumber: v.number(),
  flightName: v.optional(v.string()),
  scheduledDate: v.number(),
  holesPlayed: v.number(),
  startingHole: v.number(),
  notes: v.optional(v.string()),
  // Fallback untuk custom JWT auth (token tidak dikenali Convex native auth)
  userId: v.optional(v.string()),
};

export const updateMatchStatusValidator = {
  id: v.id("matches"),
  status: matchStatusValidator,
  userId: v.optional(v.string()),
};

// ─── Player Validators ────────────────────────────────────────────────────────

export const registerPlayerValidator = {
  tournamentId: v.id("tournaments"),
  userId: v.id("users"),
  displayName: v.string(),
  handicapIndex: v.optional(v.number()),
  handicapCategory: v.optional(handicapCategoryValidator),
  bibNumber: v.optional(v.string()),
};

export const updatePlayerStatusValidator = {
  id: v.id("players"),
  status: playerStatusValidator,
  withdrawalReason: v.optional(v.string()),
};

// ─── Scorecard Validators ─────────────────────────────────────────────────────

export const createScorecardValidator = {
  playerId: v.id("players"),
  tournamentId: v.id("tournaments"),
  matchId: v.id("matches"),
  roundNumber: v.number(),
  playingHandicap: v.optional(v.number()),
  markerId: v.optional(v.id("players")),
};

export const recordHoleScoreValidator = {
  scorecardId: v.id("scorecards"),
  holeId: v.id("golf_holes"),
  holeNumber: v.number(),
  strokes: v.number(),
  putts: v.optional(v.number()),
  penaltyStrokes: v.optional(v.number()),
  isGir: v.optional(v.boolean()),
  isFairwayHit: v.optional(v.boolean()),
};

export const updateScorecardStatusValidator = {
  id: v.id("scorecards"),
  status: scorecardStatusValidator,
};

// ─── Tee Time Validators ──────────────────────────────────────────────────────

export const createTeeTimeValidator = {
  tournamentId: v.id("tournaments"),
  matchId: v.id("matches"),
  flightId: v.optional(v.id("tournament_flights")),
  roundNumber: v.number(),
  scheduledTime: v.number(),
  startingHole: v.number(),
  maxPlayers: v.number(),
  groupName: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const assignTeeTimeSlotValidator = {
  teeTimeId: v.id("tee_times"),
  playerId: v.id("players"),
  tournamentId: v.id("tournaments"),
  slotOrder: v.number(),
  pairNumber: v.optional(v.number()),
  teamNumber: v.optional(v.number()),
};

export const updateTeeTimeStatusValidator = {
  id: v.id("tee_times"),
  status: teeTimeStatusValidator,
};
