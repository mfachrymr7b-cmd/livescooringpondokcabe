/**
 * ─── Auth Constants ───────────────────────────────────────────────────────────
 * Semua konstanta auth di satu tempat.
 */

/** Access token TTL: 15 menit */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Refresh token TTL: 30 hari */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Bcrypt salt rounds */
export const BCRYPT_ROUNDS = 12;

/** JWT audience claim */
export const JWT_AUDIENCE = "live-scoring-pondokcabe";

/** JWT issuer claim */
export const JWT_ISSUER = "live-scoring-pondokcabe-api";

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8;

/** Max failed login attempts sebelum account di-lock sementara */
export const MAX_FAILED_ATTEMPTS = 5;

/** Lock duration setelah max failed attempts: 15 menit */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
