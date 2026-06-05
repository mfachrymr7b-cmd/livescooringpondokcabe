/**
 * ─── HANDICAP CATEGORY GUIDE ─────────────────────────────────────────────────
 *
 * Indonesian Golf Association Handicap Category System
 * Based on World Handicap System (WHS) Index
 *
 * This guide documents the 6 handicap categories used throughout the system.
 * Categories are automatically assigned based on a player's Handicap Index.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CATEGORY DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Category 1 (Elit)      |  HI < 5.5
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Professional / Elite Players
 * Description: Pemain paling berbakat dengan handicap index sangat rendah.
 *              Mampu bermain mendekati par atau lebih baik.
 * Typical Play: Scratch to +4
 * Examples:    Tour professionals, top amateurs
 *
 * Category 2 (Lanjut)    |  5.5 ≤ HI ≤ 12.4
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Advanced / Skilled Players
 * Description: Pemain berpengalaman dengan kemampuan tinggi.
 *              Konsisten bermain pada atau sedikit di atas par.
 * Typical Play: +4 to +12
 * Examples:    Club champions, regional competitors
 *
 * Category 3 (Menengah)  |  12.5 ≤ HI ≤ 18.4
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Intermediate / Competent Players
 * Description: Pemain dengan pengalaman bermain golf yang baik.
 *              Dapat bermain konsisten dengan strategi yang tepat.
 * Typical Play: +12 to +18
 * Examples:    Active club members, tournament participants
 *
 * Category 4 (Rekreasi)  |  18.5 ≤ HI ≤ 26.4
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Recreational / Casual Players
 * Description: Pemain rekreasi yang bermain regular tapi masih developing.
 *              Dapat menikamati golf dengan strategi sederhana.
 * Typical Play: +18 to +26
 * Examples:    Regular weekend golfers, club members
 *
 * Category 5 (Amatir)    |  26.5 ≤ HI ≤ 36.0
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Amateur / Developing Players
 * Description: Pemain amatir yang masih dalam fase pembelajaran.
 *              Pengalaman bermain masih terbatas, teknik masih dikembangkan.
 * Typical Play: +26 to +36
 * Examples:    Players taking lessons, newer golfers
 *
 * Category 6 (Pemula)    |  37.0 ≤ HI ≤ 54.0 (WHS max)
 * ────────────────────────────────────────────────────────────────────────────
 * Level:       Beginner / New Players
 * Description: Pemain pemula atau sangat baru di golf.
 *              Masih belajar fundamental game.
 * Typical Play: +36 and above
 * Examples:    New to golf, beginners
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TECHNICAL DETAILS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Type Definitions (convex/types.ts):
 *   export type HandicapCategory =
 *     | "scratch"      // HI ≤ 0 (special case)
 *     | "category_1"   // Elit
 *     | "category_2"   // Lanjut
 *     | "category_3"   // Menengah
 *     | "category_4"   // Rekreasi
 *     | "category_5"   // Amatir
 *     | "category_6"   // Pemula
 *
 * Category Function (convex/lib/handicap.ts):
 *   export function handicapCategory(index: number): string
 *
 * Implementation:
 *   - Automatically calculates category from handicap index
 *   - Used for player flighting and handicap allowances
 *   - Called after handicap index is updated
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Get category for a player's handicap index:
 *    import { handicapCategory } from "./lib/handicap";
 *    const category = handicapCategory(15.2); // Returns "category_3" (Menengah)
 *
 * 2. Store category in player record:
 *    await db.insert("players", {
 *      userId: userId,
 *      handicapIndex: 15.2,
 *      handicapCategory: handicapCategory(15.2), // "category_3"
 *      // ...other fields
 *    });
 *
 * 3. Use for flighting tournaments:
 *    const players = groupBy(players, (p) => p.handicapCategory);
 *    // Creates flights by category level
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REFERENCE MATERIALS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * World Handicap System (WHS):
 *   - Maximum handicap index: 54.0
 *   - Based on best 8 of last 20 rounds
 *   - Formula: average of best 8 × 0.96
 *
 * Indonesian Golf Association (PGI):
 *   - These categories follow PGI standards
 *   - Used for tournament classification
 *   - Helps create fair competition
 */

export type CategoryLevel = {
  code: string;
  name_en: string;
  name_id: string;
  minIndex: number;
  maxIndex: number;
  description: string;
};

export const HANDICAP_CATEGORIES: Record<string, CategoryLevel> = {
  scratch: {
    code: "scratch",
    name_en: "Scratch",
    name_id: "Scratch",
    minIndex: 0,
    maxIndex: 0,
    description: "Handicap Index sama dengan atau lebih rendah dari 0",
  },
  category_1: {
    code: "category_1",
    name_en: "Elite",
    name_id: "Elit",
    minIndex: 0.1,
    maxIndex: 5.4,
    description: "Pemain paling berbakat, mampu bermain mendekati par atau lebih baik",
  },
  category_2: {
    code: "category_2",
    name_en: "Advanced",
    name_id: "Lanjut",
    minIndex: 5.5,
    maxIndex: 12.4,
    description: "Pemain berpengalaman dengan kemampuan tinggi, konsisten bermain pada atau sedikit di atas par",
  },
  category_3: {
    code: "category_3",
    name_en: "Intermediate",
    name_id: "Menengah",
    minIndex: 12.5,
    maxIndex: 18.4,
    description: "Pemain dengan pengalaman bermain golf yang baik, dapat bermain konsisten dengan strategi tepat",
  },
  category_4: {
    code: "category_4",
    name_en: "Recreational",
    name_id: "Rekreasi",
    minIndex: 18.5,
    maxIndex: 26.4,
    description: "Pemain rekreasi yang bermain regular, dapat menikmati golf dengan strategi sederhana",
  },
  category_5: {
    code: "category_5",
    name_en: "Amateur",
    name_id: "Amatir",
    minIndex: 26.5,
    maxIndex: 36.0,
    description: "Pemain amatir yang masih dalam fase pembelajaran, teknik masih dikembangkan",
  },
  category_6: {
    code: "category_6",
    name_en: "Beginner",
    name_id: "Pemula",
    minIndex: 37.0,
    maxIndex: 54.0,
    description: "Pemain pemula atau baru di golf, masih belajar fundamental game",
  },
};

/**
 * Get category level metadata
 */
export function getCategoryLevel(category: string): CategoryLevel | undefined {
  return HANDICAP_CATEGORIES[category];
}

/**
 * Get category name in Indonesian
 */
export function getCategoryNameID(category: string): string {
  return HANDICAP_CATEGORIES[category]?.name_id ?? category;
}

/**
 * Get category name in English
 */
export function getCategoryNameEN(category: string): string {
  return HANDICAP_CATEGORIES[category]?.name_en ?? category;
}
