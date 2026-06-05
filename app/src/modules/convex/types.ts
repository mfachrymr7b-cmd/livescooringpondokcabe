/**
 * Local type definitions untuk dokumen Convex yang dipakai di UI.
 * Didefinisikan manual agar tidak perlu menarik seluruh convex source tree.
 */

export interface GolfCourse {
  _id: string;
  _creationTime: number;
  name: string;
  slug: string;
  city: string;
  province: string;
  country: string;
  address: string;
  totalHoles: number;
  par: number;
  difficulty: string;
  isActive: boolean;
  description?: string;
  courseRating?: number;
  slopeRating?: number;
  logoUrl?: string;
  coverImageUrl?: string;
  establishedYear?: number;
  website?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export interface GolfHole {
  _id: string;
  _creationTime: number;
  courseId: string;
  holeNumber: number;
  par: number;
  strokeIndex: number;
  distanceBlack?: number;
  distanceBlue?: number;
  distanceWhite?: number;
  distanceYellow?: number;
  distanceRed?: number;
  description?: string;
  imageUrl?: string;
}

export interface Tournament {
  _id: string;
  _creationTime: number;
  name: string;
  slug: string;
  courseId: string;
  organizerId: string;
  format: string;
  status: string;
  totalRounds: number;
  holesPerRound: number;
  useHandicap: boolean;
  participantCount: number;
  registrationOpenAt: number;
  registrationCloseAt: number;
  startDate: number;
  endDate: number;
  description?: string;
  maxParticipants?: number;
  entryFee?: number;
  currency?: string;
  bannerUrl?: string;
  rulesUrl?: string;
  prizePool?: number;
}

export interface Player {
  _id: string;
  _creationTime: number;
  tournamentId: string;
  userId: string;
  displayName: string;
  status: string;
  registeredAt: number;
  handicapIndex?: number;
  bibNumber?: string;
  confirmedAt?: number;
  withdrawnAt?: number;
  totalScore?: number;
  totalNetScore?: number;
  currentRound?: number;
}

export interface Scorecard {
  _id: string;
  _creationTime: number;
  playerId: string;
  tournamentId: string;
  matchId: string;
  roundNumber: number;
  status: string;
  totalStrokes?: number;
  totalPutts?: number;
  totalNetScore?: number;
  scoreToPar?: number;
  totalStablefordPoints?: number;
  matchplayHolesWon?: number;
  matchplayHolesLost?: number;
  matchplayHolesHalved?: number;
  matchplayStanding?: string;
  playingHandicap?: number;
  submittedAt?: number;
  verifiedAt?: number;
  notes?: string;
}

export interface ScorecardHole {
  _id: string;
  _creationTime: number;
  scorecardId: string;
  holeId: string;
  holeNumber: number;
  strokes: number;
  putts?: number;
  penaltyStrokes?: number;
  netStrokes?: number;
  handicapStrokes?: number;
  grossScoreToPar?: number;
  netScoreToPar?: number;
  stablefordPoints?: number;
  matchplayPoints?: number;
  recordedAt: number;
  isGir?: boolean;
  isFairwayHit?: boolean;
  isBirdie?: boolean;
  isEagle?: boolean;
  isBogey?: boolean;
  isDoubleBogey?: boolean;
}

export interface LeaderboardEntry {
  _id: string;
  _creationTime: number;
  tournamentId: string;
  playerId: string;
  totalStrokes: number;
  scoreToPar: number;
  rank: number;
  currentRound: number;
  holesCompleted: number;
  isWithdrawn: boolean;
  isDisqualified: boolean;
  updatedAt: number;
  totalNetScore?: number;
  rankNet?: number;
  roundScores: Array<{ roundNumber: number; strokes: number; netScore?: number }>;
  // Enriched fields dari query
  player?: Player | null;
  user?: { _id: string; name: string; email: string; avatarUrl?: string } | null;
}
