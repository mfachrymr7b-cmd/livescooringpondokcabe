import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { updateUserValidator } from "../validators";

/**
 * Upsert user dari auth provider.
 * Dipanggil saat user pertama kali login atau update profil.
 */
export const upsertFromAuth = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        lastActiveAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: args.email,
      name: args.name,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      passwordHash: "",          // OAuth users have no password
      role: "super_admin",
      status: "active",
      lastActiveAt: Date.now(),
    });
  },
});

/** Update profil user (hanya bisa update diri sendiri) */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    handicapIndex: v.optional(v.number()),
    membershipNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) throw new Error("User tidak ditemukan");

    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    if (args.phoneNumber !== undefined) patch.phoneNumber = args.phoneNumber;
    if (args.handicapIndex !== undefined) patch.handicapIndex = args.handicapIndex;
    if (args.membershipNumber !== undefined) patch.membershipNumber = args.membershipNumber;

    await ctx.db.patch(user._id, patch);
    return user._id;
  },
});

/** Update role/status user — hanya super_admin atau club_admin */
export const adminUpdateUser = mutation({
  args: updateUserValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!adminUser) throw new Error("User tidak ditemukan");
    if (!["super_admin", "club_admin"].includes(adminUser.role)) {
      throw new Error("Akses ditolak: hanya admin yang bisa mengubah data user");
    }

    const { id, ...fields } = args;
    const patch: Record<string, unknown> = {};
    if (fields.role !== undefined) patch.role = fields.role;
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.displayName !== undefined) patch.displayName = fields.displayName;
    if (fields.phoneNumber !== undefined) patch.phoneNumber = fields.phoneNumber;
    if (fields.handicapIndex !== undefined) patch.handicapIndex = fields.handicapIndex;
    if (fields.handicapCategory !== undefined) patch.handicapCategory = fields.handicapCategory;
    if (fields.membershipNumber !== undefined) patch.membershipNumber = fields.membershipNumber;
    await ctx.db.patch(id, patch);
  },
});
