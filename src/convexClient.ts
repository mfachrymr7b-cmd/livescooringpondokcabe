import { ConvexClient } from "convex/browser";

/**
 * Singleton Convex client untuk environment non-React (Node.js, CLI, dll).
 *
 * Untuk React, gunakan ConvexProvider di root app:
 *
 *   import { ConvexProvider, ConvexReactClient } from "convex/react";
 *   const convex = new ConvexReactClient(process.env.CONVEX_URL!);
 *   <ConvexProvider client={convex}><App /></ConvexProvider>
 */

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error(
    "[Convex] CONVEX_URL belum di-set.\n" +
      "Jalankan `npx convex dev` lalu copy URL ke .env.local"
  );
}

export const convexClient = new ConvexClient(CONVEX_URL);
