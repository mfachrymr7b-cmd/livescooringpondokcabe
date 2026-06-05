"use node";
/**
 * ─── Login API ────────────────────────────────────────────────────────────────
 * POST /api/auth/login
 *
 * Body: { email, password, userAgent?, ipAddress? }
 * Response: { accessToken, refreshToken, expiresAt, user }
 *
 * Proteksi:
 * - Brute-force: lockout setelah MAX_FAILED_ATTEMPTS gagal berturut-turut
 * - User enumeration: pesan error generik untuk email/password salah
 * - Suspended/inactive: pesan spesifik (tidak bocorkan apakah email ada)
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { internal } from "../_generated/api";
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "./constants";

export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: {
      id: string;
      email: string;
      name: string;
      displayName?: string;
      role: string;
      clubId?: string;
      avatarUrl?: string;
    };
  }> => {
    const email = args.email.toLowerCase().trim();
    const INVALID_MSG = "Email atau password salah";

    // ── 1. Cek rate limit / lockout ───────────────────────────────────────────
    const attempts = await ctx.runQuery(
      internal.auth.helpers.checkLoginAttempts,
      { email }
    );

    if (attempts.locked) {
      const remainingMs = (attempts.lockedUntil ?? 0) - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      throw new Error(
        `Terlalu banyak percobaan login. Coba lagi dalam ${remainingMin} menit.`
      );
    }

    // ── 2. Cari user ──────────────────────────────────────────────────────────
    const user = await ctx.runQuery(internal.auth.helpers.getUserByEmail, {
      email,
    });

    if (!user) {
      // Tetap catat attempt meski user tidak ada (mencegah timing attack)
      await ctx.runMutation(internal.auth.helpers.recordFailedLogin, {
        email,
        maxAttempts: MAX_FAILED_ATTEMPTS,
        lockoutDurationMs: LOCKOUT_DURATION_MS,
      });
      throw new Error(INVALID_MSG);
    }

    // ── 3. Cek status akun ────────────────────────────────────────────────────
    if (user.status === "suspended") {
      throw new Error("Akun Anda telah disuspend. Hubungi administrator.");
    }
    if (user.status === "inactive") {
      throw new Error("Akun Anda tidak aktif. Hubungi administrator.");
    }

    // ── 4. Verifikasi password ────────────────────────────────────────────────
    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    if (!isValid) {
      const result = await ctx.runMutation(
        internal.auth.helpers.recordFailedLogin,
        {
          email,
          maxAttempts: MAX_FAILED_ATTEMPTS,
          lockoutDurationMs: LOCKOUT_DURATION_MS,
        }
      );

      // Beri tahu berapa attempt tersisa sebelum lockout
      const remaining = MAX_FAILED_ATTEMPTS - result.failedCount;
      if (remaining > 0 && remaining <= 2) {
        throw new Error(
          `${INVALID_MSG}. ${remaining} percobaan tersisa sebelum akun dikunci.`
        );
      }
      if (result.locked) {
        const lockMin = Math.ceil(LOCKOUT_DURATION_MS / 60_000);
        throw new Error(
          `Terlalu banyak percobaan login. Akun dikunci selama ${lockMin} menit.`
        );
      }
      throw new Error(INVALID_MSG);
    }

    // ── 5. Login berhasil — reset attempt counter ─────────────────────────────
    await ctx.runMutation(internal.auth.helpers.clearLoginAttempts, { email });

    // ── 6. Sign tokens ────────────────────────────────────────────────────────
    const tokens = await ctx.runAction(internal.auth.jwt.signTokens, {
      userId: user._id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
    });

    // ── 7. Simpan session ─────────────────────────────────────────────────────
    const sessionId = await ctx.runMutation(
      internal.auth.helpers.createSession,
      {
        userId: user._id,
        jti: tokens.jti,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      }
    );

    // ── 8. Hash & simpan refresh token ────────────────────────────────────────
    const tokenHash = await ctx.runAction(internal.auth.jwt.hashToken, {
      token: tokens.refreshToken,
    });
    await ctx.runMutation(internal.auth.helpers.createRefreshToken, {
      userId: user._id,
      sessionId,
      tokenHash,
    });

    // ── 9. Update last active ─────────────────────────────────────────────────
    await ctx.runMutation(internal.auth.helpers.updateLastActive, {
      userId: user._id,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        clubId: user.clubId,
        avatarUrl: user.avatarUrl,
      },
    };
  },
});
