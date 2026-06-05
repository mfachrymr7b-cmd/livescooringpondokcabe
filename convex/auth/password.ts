"use node";
/**
 * ─── Password Hashing (Node.js runtime) ──────────────────────────────────────
 * bcrypt hashing dan verification.
 * File ini HANYA boleh berisi actions — tidak boleh ada query/mutation.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, MIN_PASSWORD_LENGTH } from "./constants";

/** Validasi kekuatan password */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  reason?: string;
} {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      reason: `Password minimal ${MIN_PASSWORD_LENGTH} karakter`,
    };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password harus mengandung huruf kapital" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password harus mengandung angka" };
  }
  return { valid: true };
}

/** Hash password menggunakan bcrypt */
export const hashPassword = internalAction({
  args: { password: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    return await bcrypt.hash(args.password, BCRYPT_ROUNDS);
  },
});

/** Verifikasi password terhadap hash */
export const verifyPassword = internalAction({
  args: { password: v.string(), hash: v.string() },
  handler: async (_ctx, args): Promise<boolean> => {
    return await bcrypt.compare(args.password, args.hash);
  },
});
