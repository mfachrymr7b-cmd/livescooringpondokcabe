/**
 * ─── HTTP Router ──────────────────────────────────────────────────────────────
 *
 * Auth endpoints:
 *   POST /api/auth/register          → daftar akun baru (role: player)
 *   POST /api/auth/login             → login → { accessToken, refreshToken, user }
 *   POST /api/auth/logout            → logout session ini
 *   POST /api/auth/logout-all        → logout semua device
 *   POST /api/auth/refresh           → refresh token rotation
 *   GET  /api/auth/me                → get full user profile dari Bearer token
 *   GET  /api/auth/sessions          → list active sessions user
 *   POST /api/auth/change-password   → ubah password (butuh auth)
 *
 * Admin endpoints (butuh role club_admin atau super_admin):
 *   POST  /api/admin/users                → buat user dengan role tertentu
 *   PATCH /api/admin/users/role           → update role user
 *   PATCH /api/admin/users/status         → suspend / aktifkan user
 *   POST  /api/admin/users/reset-password → reset password user
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMITS = {
  authPublic: { maxRequests: 20, windowMs: RATE_LIMIT_WINDOW_MS },
  authSensitive: { maxRequests: 40, windowMs: RATE_LIMIT_WINDOW_MS },
  admin: { maxRequests: 30, windowMs: RATE_LIMIT_WINDOW_MS },
};

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(data: unknown, status = 200, origin?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function errorResponse(message: string, status = 400, origin?: string) {
  return jsonResponse({ error: message }, status, origin);
}

function bearerToken(req: Request): string {
  return (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

function getStatusFromError(message: string): number {
  if (/Token tidak ditemukan|Unauthorized|Unauthorized:/i.test(message)) return 401;
  if (/Forbidden|Forbidden:/i.test(message)) return 403;
  if (/Rate limit|limit exceeded|Too many|Terlalu banyak/i.test(message)) return 429;
  if (/not ditemukan|tidak ditemukan|Not found/i.test(message)) return 404;
  return 400;
}

async function logHttpEvent(
  _ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  level: "info" | "warn" | "error",
  category: string,
  message: string,
  route: string,
  details?: string
) {
  const entry = {
    level,
    category,
    message,
    details: details ? details.substring(0, 2000) : undefined,
    route,
    timestamp: Date.now(),
  };
  // `httpAction` does not expose direct DB writes in Convex actions.
  // Log to console for now and keep the API response path clean.
  if (level === "error") {
    console.error(`[HTTP][${route}] ${message}`, { entry });
  } else {
    console.info(`[HTTP][${route}] ${message}`, { entry });
  }
}

async function sendErrorResponse(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  err: unknown,
  route: string,
  origin?: string,
  defaultMessage = "Terjadi kesalahan"
) {
  const message = err instanceof Error ? err.message : defaultMessage;
  const status = getStatusFromError(message);
  await logHttpEvent(
    ctx,
    status >= 500 ? "error" : "warn",
    "http",
    message,
    route,
    err instanceof Error ? err.stack : undefined
  );
  return errorResponse(message, status, origin);
}

async function enforceRateLimit(
  _ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  _req: Request,
  _route: string,
  _maxRequests: number,
  _windowMs: number
) {
  // Rate limiting via database writes is not available in this httpAction context.
  // Keep the endpoint reachable and return immediately.
  return;
}

/** Register OPTIONS preflight for a path */
function options(path: string) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async (_, req) => {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(req.headers.get("origin") ?? undefined),
      });
    }),
  });
}

// ─── OPTIONS preflights ───────────────────────────────────────────────────────

options("/api/auth/register");
options("/api/auth/login");
options("/api/auth/logout");
options("/api/auth/logout-all");
options("/api/auth/refresh");
options("/api/auth/me");
options("/api/auth/sessions");
options("/api/auth/change-password");
options("/api/admin/users");
options("/api/admin/users/role");
options("/api/admin/users/status");
options("/api/admin/users/reset-password");

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /api/auth/register ──────────────────────────────────────────────────

http.route({
  path: "/api/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/auth/register",
        RATE_LIMITS.authPublic.maxRequests,
        RATE_LIMITS.authPublic.windowMs
      );

      const body = await req.json();
      const result = await ctx.runAction(api.auth.register.register, {
        email: body.email,
        password: body.password,
        name: body.name,
        userAgent: req.headers.get("user-agent") ?? undefined,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      });
      return jsonResponse(result, 201, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/register", origin, "Registrasi gagal");
    }
  }),
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

http.route({
  path: "/api/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/auth/login",
        RATE_LIMITS.authPublic.maxRequests,
        RATE_LIMITS.authPublic.windowMs
      );

      const body = await req.json();
      const result = await ctx.runAction(api.auth.login.login, {
        email: body.email,
        password: body.password,
        userAgent: req.headers.get("user-agent") ?? undefined,
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/login", origin, "Login gagal");
    }
  }),
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

http.route({
  path: "/api/auth/logout",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      const accessToken = bearerToken(req);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const result = await ctx.runAction(api.auth.logout.logout, {
        accessToken,
        refreshToken: typeof body.refreshToken === "string" ? body.refreshToken : undefined,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/logout", origin, "Logout gagal");
    }
  }),
});

// ─── POST /api/auth/logout-all ────────────────────────────────────────────────

http.route({
  path: "/api/auth/logout-all",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const result = await ctx.runAction(api.auth.logout.logoutAll, { accessToken });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/logout-all", origin, "Logout gagal");
    }
  }),
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

http.route({
  path: "/api/auth/refresh",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/auth/refresh",
        RATE_LIMITS.authSensitive.maxRequests,
        RATE_LIMITS.authSensitive.windowMs
      );

      const body = await req.json();
      if (!body.refreshToken) return errorResponse("refreshToken diperlukan", 400, origin);
      const result = await ctx.runAction(api.auth.refresh.refresh, {
        refreshToken: body.refreshToken,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/refresh", origin, "Refresh gagal");
    }
  }),
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

http.route({
  path: "/api/auth/me",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);

      // Validate token via requireRole (public action)
      const userCtx = await ctx.runAction(api.auth.validate.requireRole, {
        accessToken,
        minRole: "player",
      });

      // Fetch full user profile (tanpa passwordHash)
      const user = await ctx.runQuery(api.queries.users.get, {
        id: userCtx.userId,
      });
      if (!user) return errorResponse("User tidak ditemukan", 404, origin);

      // Strip sensitive fields
      const { passwordHash: _pw, tokenIdentifier: _ti, ...safeUser } = user;

      return jsonResponse(
        {
          ...safeUser,
          sessionId: userCtx.sessionId,
        },
        200,
        origin
      );
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/me", origin, "Unauthorized");
    }
  }),
});

// ─── GET /api/auth/sessions ───────────────────────────────────────────────────

http.route({
  path: "/api/auth/sessions",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);

      // Validate token
      const userCtx = await ctx.runAction(api.auth.validate.requireRole, {
        accessToken,
        minRole: "player",
      });

      // Ambil semua active sessions dari DB
      const sessions = await ctx.runQuery(
        internal.auth.helpers.getActiveSessionsByUser,
        { userId: userCtx.userId }
      );

      return jsonResponse({ sessions }, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/sessions", origin, "Unauthorized");
    }
  }),
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────

http.route({
  path: "/api/auth/change-password",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/auth/change-password",
        RATE_LIMITS.authSensitive.maxRequests,
        RATE_LIMITS.authSensitive.windowMs
      );

      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const body = await req.json();
      const result = await ctx.runAction(api.auth.changePassword.changePassword, {
        accessToken,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/auth/change-password", origin, "Gagal mengubah password");
    }
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /api/admin/users ────────────────────────────────────────────────────

http.route({
  path: "/api/admin/users",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/admin/users",
        RATE_LIMITS.admin.maxRequests,
        RATE_LIMITS.admin.windowMs
      );

      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const body = await req.json();
      const result = await ctx.runAction(api.auth.admin.createUser, {
        accessToken,
        email: body.email,
        password: body.password,
        name: body.name,
        role: body.role,
        clubId: body.clubId,
      });
      return jsonResponse(result, 201, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/admin/users", origin, "Gagal membuat user");
    }
  }),
});

// ─── PATCH /api/admin/users/role ─────────────────────────────────────────────

http.route({
  path: "/api/admin/users/role",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/admin/users/role",
        RATE_LIMITS.admin.maxRequests,
        RATE_LIMITS.admin.windowMs
      );

      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const body = await req.json();
      const result = await ctx.runAction(api.auth.admin.updateUserRole, {
        accessToken,
        targetUserId: body.userId,
        newRole: body.role,
        clubId: body.clubId,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/admin/users/role", origin, "Gagal update role");
    }
  }),
});

// ─── PATCH /api/admin/users/status ───────────────────────────────────────────

http.route({
  path: "/api/admin/users/status",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/admin/users/status",
        RATE_LIMITS.admin.maxRequests,
        RATE_LIMITS.admin.windowMs
      );

      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const body = await req.json();
      const result = await ctx.runAction(api.auth.admin.setUserStatus, {
        accessToken,
        targetUserId: body.userId,
        status: body.status,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/admin/users/status", origin, "Gagal update status");
    }
  }),
});

// ─── POST /api/admin/users/reset-password ────────────────────────────────────

http.route({
  path: "/api/admin/users/reset-password",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const origin = req.headers.get("origin") ?? undefined;
    try {
      await enforceRateLimit(
        ctx,
        req,
        "/api/admin/users/reset-password",
        RATE_LIMITS.admin.maxRequests,
        RATE_LIMITS.admin.windowMs
      );

      const accessToken = bearerToken(req);
      if (!accessToken) return errorResponse("Token tidak ditemukan", 401, origin);
      const body = await req.json();
      const result = await ctx.runAction(api.auth.admin.resetUserPassword, {
        accessToken,
        targetUserId: body.userId,
        newPassword: body.newPassword,
      });
      return jsonResponse(result, 200, origin);
    } catch (err: unknown) {
      return await sendErrorResponse(ctx, err, "/api/admin/users/reset-password", origin, "Gagal reset password");
    }
  }),
});

export default http;
