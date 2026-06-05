"use node";
/**
 * ─── JWT Signing & Verification (Node.js runtime) ────────────────────────────
 * Menggunakan `jose` library untuk HS256 JWT.
 * File ini HANYA boleh berisi actions.
 *
 * JWT_SECRET harus di-set di environment variable Convex:
 *   npx convex env set JWT_SECRET "your-256-bit-secret"
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID } from "crypto";
import {
  ACCESS_TOKEN_TTL_MS,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string;          // userId
  email: string;
  role: string;
  clubId?: string;
  jti: string;          // session identifier
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string; // opaque random token (tidak di-sign, disimpan sebagai hash)
  jti: string;
  expiresAt: number;    // access token expiry (Unix ms)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable tidak di-set");
  return new TextEncoder().encode(secret);
}

/** Generate cryptographically secure opaque refresh token */
function generateRefreshToken(): string {
  return randomUUID() + "-" + randomUUID();
}

/** SHA-256 hash dari refresh token untuk disimpan di DB */
async function hashRefreshToken(token: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(token).digest("hex");
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Sign access token + generate refresh token */
export const signTokens = internalAction({
  args: {
    userId: v.string(),
    email: v.string(),
    role: v.string(),
    clubId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<TokenPair> => {
    const secret = getSecret();
    const jti = randomUUID();
    const now = Date.now();
    const expiresAt = now + ACCESS_TOKEN_TTL_MS;

    const accessToken = await new SignJWT({
      email: args.email,
      role: args.role,
      clubId: args.clubId,
    } as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(args.userId)
      .setJti(jti)
      .setIssuedAt(Math.floor(now / 1000))
      .setExpirationTime(Math.floor(expiresAt / 1000))
      .setAudience(JWT_AUDIENCE)
      .setIssuer(JWT_ISSUER)
      .sign(secret);

    const rawRefreshToken = generateRefreshToken();
    const refreshToken = rawRefreshToken; // kirim raw ke client

    return { accessToken, refreshToken, jti, expiresAt };
  },
});

/** Verify access token — returns payload atau throws */
export const verifyAccessToken = internalAction({
  args: { token: v.string() },
  handler: async (_ctx, args): Promise<AccessTokenPayload> => {
    const secret = getSecret();
    const { payload } = await jwtVerify(args.token, secret, {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });
    return payload as AccessTokenPayload;
  },
});

/** Hash refresh token untuk lookup di DB */
export const hashToken = internalAction({
  args: { token: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    return await hashRefreshToken(args.token);
  },
});
