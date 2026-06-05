/**
 * Convex client singleton.
 * Import ini di ConvexProvider.
 */
import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is not set. Add it to your .env file.\n" +
      "Run `npx convex dev` to get your deployment URL."
  );
}

export const convex = new ConvexReactClient(convexUrl);
