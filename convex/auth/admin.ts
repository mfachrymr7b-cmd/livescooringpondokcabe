"use node";
/**
 * ─── Admin Auth Operations ────────────────────────────────────────────────────
 * Operasi yang hanya bisa dilakukan oleh super_admin atau club_admin.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { internal } from "../_generated/api";
import { BCRYPT_ROUNDS } from "./constants";
import { assignableRoles, hasMinRole } from "./roles";
import { userRoleValidator, userStatusValidator } from "../types";
import type { UserRole } from "../types";
import type { UserContext } from "./validate";

/** Buat user baru dengan role tertentu. Hanya super_admin / club_admin. */
export const createUser = action({
  args: {
    accessToken: v.string(),
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: userRoleValidator,
    clubId: v.optional(v.id("golf_courses")),
  },
  handler: async (ctx, args): Promise<{ userId: string; email: string; role: string }> => {
    const caller: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );
    if (!hasMinRole(caller.role, "club_admin")) {
      throw new Error("Forbidden: Butuh role minimal club_admin");
    }

    const allowed = assignableRoles(caller.role);
    if (!allowed.includes(args.role as UserRole)) {
      throw new Error(`Forbidden: Role "${caller.role}" tidak bisa membuat user dengan role "${args.role}"`);
    }

    const email = args.email.toLowerCase().trim();
    const existing = await ctx.runQuery(internal.auth.helpers.getUserByEmail, { email });
    if (existing) throw new Error("Email sudah terdaftar");

    const passwordHash = await bcrypt.hash(args.password, BCRYPT_ROUNDS);
    const userId = await ctx.runMutation(internal.auth.helpers.createUser, {
      email,
      passwordHash,
      name: args.name.trim(),
      role: args.role as UserRole,
      clubId: args.clubId,
    });

    return { userId, email, role: args.role };
  },
});

/** Update role user. Hanya super_admin / club_admin. */
export const updateUserRole = action({
  args: {
    accessToken: v.string(),
    targetUserId: v.id("users"),
    newRole: userRoleValidator,
    clubId: v.optional(v.id("golf_courses")),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const caller: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );
    if (!hasMinRole(caller.role, "club_admin")) {
      throw new Error("Forbidden: Butuh role minimal club_admin");
    }

    const allowed = assignableRoles(caller.role);
    if (!allowed.includes(args.newRole as UserRole)) {
      throw new Error(`Forbidden: Tidak bisa assign role "${args.newRole}"`);
    }

    await ctx.runMutation(internal.auth.helpers.adminPatchUser, {
      userId: args.targetUserId,
      role: args.newRole as UserRole,
      clubId: args.clubId,
    });

    // Revoke semua session agar role baru berlaku segera
    await ctx.runMutation(internal.auth.helpers.revokeAllUserSessions, {
      userId: args.targetUserId,
    });

    return { success: true };
  },
});

/** Suspend atau aktifkan user. */
export const setUserStatus = action({
  args: {
    accessToken: v.string(),
    targetUserId: v.id("users"),
    status: userStatusValidator,
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const caller: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );
    if (!hasMinRole(caller.role, "club_admin")) {
      throw new Error("Forbidden: Butuh role minimal club_admin");
    }

    await ctx.runMutation(internal.auth.helpers.adminPatchUser, {
      userId: args.targetUserId,
      status: args.status,
    });

    if (args.status !== "active") {
      await ctx.runMutation(internal.auth.helpers.revokeAllUserSessions, {
        userId: args.targetUserId,
      });
    }

    return { success: true };
  },
});

/** Reset password user (admin). */
export const resetUserPassword = action({
  args: {
    accessToken: v.string(),
    targetUserId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const caller: UserContext = await ctx.runAction(
      internal.auth.validate.validateToken,
      { accessToken: args.accessToken }
    );
    if (!hasMinRole(caller.role, "club_admin")) {
      throw new Error("Forbidden: Butuh role minimal club_admin");
    }

    const passwordHash = await bcrypt.hash(args.newPassword, BCRYPT_ROUNDS);
    await ctx.runMutation(internal.auth.helpers.updatePassword, {
      userId: args.targetUserId,
      passwordHash,
    });

    await ctx.runMutation(internal.auth.helpers.revokeAllUserSessions, {
      userId: args.targetUserId,
    });

    return { success: true };
  },
});
