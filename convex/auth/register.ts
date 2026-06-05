"use node";
/**
 * ─── Register API ─────────────────────────────────────────────────────────────
 * POST /api/auth/register
 *
 * Body: { email, password, name }
 * Response: { accessToken, refreshToken, expiresAt, user }
 *
 * Registrasi publik hanya untuk role "super_admin".
 * Untuk membuat user dengan role lain, gunakan admin.createUser.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { internal } from "../_generated/api";
import { validatePasswordStrength } from "./password";
import { BCRYPT_ROUNDS } from "./constants";

export const register = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: { id: string; email: string; name: string; role: string };
  }> => {
    // ── 1. Validasi email format ──────────────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Format email tidak valid");
    }
    const email = args.email.toLowerCase().trim();

    // ── 2. Validasi password strength ─────────────────────────────────────────
    const pwCheck = validatePasswordStrength(args.password);
    if (!pwCheck.valid) throw new Error(pwCheck.reason);

    // ── 3. Cek email sudah terdaftar ──────────────────────────────────────────
    const existing = await ctx.runQuery(internal.auth.helpers.getUserByEmail, {
      email,
    });
    if (existing) throw new Error("Email sudah terdaftar");

    // ── 4. Hash password ──────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(args.password, BCRYPT_ROUNDS);

    // ── 5. Buat user dengan role super_admin ───────────────────────────────
    const userId = await ctx.runMutation(internal.auth.helpers.createUser, {
      email,
      passwordHash,
      name: args.name.trim(),
      role: "super_admin",
    });

    // ── 6. Ambil user yang baru dibuat ────────────────────────────────────────
    const user = await ctx.runQuery(internal.auth.helpers.getUserById, {
      userId,
    });
    if (!user) throw new Error("Gagal membuat user");

    // ── 7. Sign tokens ────────────────────────────────────────────────────────
    const tokens = await ctx.runAction(internal.auth.jwt.signTokens, {
      userId: userId,
      email: user.email,
      role: user.role,
    });

    // ── 8. Simpan session ─────────────────────────────────────────────────────
    const sessionId = await ctx.runMutation(
      internal.auth.helpers.createSession,
      {
        userId,
        jti: tokens.jti,
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      }
    );

    // ── 9. Hash & simpan refresh token ────────────────────────────────────────
    const tokenHash = await ctx.runAction(internal.auth.jwt.hashToken, {
      token: tokens.refreshToken,
    });
    await ctx.runMutation(internal.auth.helpers.createRefreshToken, {
      userId,
      sessionId,
      tokenHash,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },
});
