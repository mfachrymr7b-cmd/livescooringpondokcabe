"use node";
/**
 * Migration: Seed 100 member Pondokcabe (50 pria + 50 wanita)
 * Date: 2026-05-22
 *
 * Jalankan:
 *   npx convex run migrations/20260522_seed_members:seedMembers
 *
 * Password default semua member: "pondokcabe123"
 * Email format: nama.lengkap@pondokcabe.golf
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import bcrypt from "bcryptjs";
import type { HandicapCategory } from "../types";

type MemberData = {
  displayName: string;
  handicap: number;
  category: HandicapCategory;
};

// ─── Data 50 Pria ─────────────────────────────────────────────────────────────
const MALE_MEMBERS: MemberData[] = [
  { displayName: "Aditya Pratama",       handicap: 4.2,  category: "category_1" },
  { displayName: "Budi Santoso",         handicap: 8.5,  category: "category_2" },
  { displayName: "Chandra Wijaya",       handicap: 12.4, category: "category_2" },
  { displayName: "Dedi Kurniawan",       handicap: 15.0, category: "category_3" },
  { displayName: "Eko Prasetyo",         handicap: 20.1, category: "category_4" },
  { displayName: "Fajar Ramadhan",       handicap: 28.5, category: "category_5" },
  { displayName: "Guntur Saputra",       handicap: 38.0, category: "category_6" },
  { displayName: "Hendra Setiawan",      handicap: 2.1,  category: "category_1" },
  { displayName: "Indra Jaya",           handicap: 10.2, category: "category_2" },
  { displayName: "Joko Widodo",          handicap: 18.4, category: "category_3" },
  { displayName: "Kevin Sanjaya",        handicap: 5.0,  category: "category_1" },
  { displayName: "Lukman Hakim",         handicap: 14.2, category: "category_3" },
  { displayName: "Mahendra Putra",       handicap: 22.5, category: "category_4" },
  { displayName: "Nanang Kosim",         handicap: 30.0, category: "category_5" },
  { displayName: "Okky Lukman",          handicap: 45.2, category: "category_6" },
  { displayName: "Pandu Dewanata",       handicap: 7.8,  category: "category_2" },
  { displayName: "Qomarudin",            handicap: 13.5, category: "category_3" },
  { displayName: "Rian Ardianto",        handicap: 19.2, category: "category_4" },
  { displayName: "Surya Kencana",        handicap: 26.0, category: "category_4" },
  { displayName: "Taufik Hidayat",       handicap: 3.5,  category: "category_1" },
  { displayName: "Utama Putra",          handicap: 11.0, category: "category_2" },
  { displayName: "Victor Igbonefo",      handicap: 16.5, category: "category_3" },
  { displayName: "Wahyu Nugroho",        handicap: 24.8, category: "category_4" },
  { displayName: "Xander Yusuf",         handicap: 32.1, category: "category_5" },
  { displayName: "Yosep Iskandar",       handicap: 40.0, category: "category_6" },
  { displayName: "Zaki Anwar",           handicap: 9.2,  category: "category_2" },
  { displayName: "Ahmad Dhani",          handicap: 14.8, category: "category_3" },
  { displayName: "Bambang Pamungkas",    handicap: 18.0, category: "category_3" },
  { displayName: "Catur Pamungkas",      handicap: 21.4, category: "category_4" },
  { displayName: "Dicky Wahyudi",        handicap: 5.4,  category: "category_1" },
  { displayName: "Erlangga Putra",       handicap: 12.0, category: "category_2" },
  { displayName: "Farhan Abas",          handicap: 17.2, category: "category_3" },
  { displayName: "Gilang Dirga",         handicap: 25.5, category: "category_4" },
  { displayName: "Harry Maulana",        handicap: 33.0, category: "category_5" },
  { displayName: "Iwan Fals",            handicap: 11.5, category: "category_2" },
  { displayName: "Junaedi Ali",          handicap: 19.8, category: "category_4" },
  { displayName: "Komang Teguh",         handicap: 6.2,  category: "category_2" },
  { displayName: "Lucky Perdana",        handicap: 15.6, category: "category_3" },
  { displayName: "Mario Lawalata",       handicap: 13.1, category: "category_3" },
  { displayName: "Nico Siahaan",         handicap: 20.5, category: "category_4" },
  { displayName: "Onky Alexander",       handicap: 35.0, category: "category_5" },
  { displayName: "Putu Gede",            handicap: 4.8,  category: "category_1" },
  { displayName: "Risky Ridho",          handicap: 8.9,  category: "category_2" },
  { displayName: "Syamsul Arif",         handicap: 16.0, category: "category_3" },
  { displayName: "Tommy Sugiarto",       handicap: 12.2, category: "category_2" },
  { displayName: "Usman Harun",          handicap: 23.4, category: "category_4" },
  { displayName: "Vidi Aldiano",         handicap: 27.2, category: "category_5" },
  { displayName: "Wisnu Wardhana",       handicap: 5.2,  category: "category_1" },
  { displayName: "Yudha Pratama",        handicap: 14.5, category: "category_3" },
  { displayName: "Zainuddin MZ",         handicap: 18.2, category: "category_3" },
];

// ─── Data 50 Wanita ───────────────────────────────────────────────────────────
const FEMALE_MEMBERS: MemberData[] = [
  { displayName: "Anisa Rahma",          handicap: 6.5,  category: "category_2" },
  { displayName: "Bella Shofie",         handicap: 12.0, category: "category_2" },
  { displayName: "Citra Kirana",         handicap: 18.2, category: "category_3" },
  { displayName: "Dian Sastro",          handicap: 22.4, category: "category_4" },
  { displayName: "Erina Gudono",         handicap: 30.5, category: "category_5" },
  { displayName: "Fitri Carlina",        handicap: 40.2, category: "category_6" },
  { displayName: "Gita Gutawa",          handicap: 5.1,  category: "category_1" },
  { displayName: "Hesty Purwadinata",    handicap: 15.5, category: "category_3" },
  { displayName: "Isyana Sarasvati",     handicap: 24.0, category: "category_4" },
  { displayName: "Jessica Mila",         handicap: 32.8, category: "category_5" },
  { displayName: "Krisdayanti",          handicap: 14.0, category: "category_3" },
  { displayName: "Luna Maya",            handicap: 9.5,  category: "category_2" },
  { displayName: "Maudy Ayunda",         handicap: 11.2, category: "category_2" },
  { displayName: "Nia Ramadhani",        handicap: 19.8, category: "category_4" },
  { displayName: "Olla Ramlan",          handicap: 26.5, category: "category_5" },
  { displayName: "Puspita Sari",         handicap: 38.2, category: "category_6" },
  { displayName: "Queenaya Maryam",      handicap: 7.2,  category: "category_2" },
  { displayName: "Raisa Andriana",       handicap: 13.4, category: "category_3" },
  { displayName: "Sandra Dewi",          handicap: 21.0, category: "category_4" },
  { displayName: "Tatjana Saphira",      handicap: 28.0, category: "category_5" },
  { displayName: "Ussy Sulistiawaty",    handicap: 16.8, category: "category_3" },
  { displayName: "Velove Vexia",         handicap: 5.3,  category: "category_1" },
  { displayName: "Wulan Guritno",        handicap: 12.5, category: "category_3" },
  { displayName: "Xena Alexandra",       handicap: 20.2, category: "category_4" },
  { displayName: "Yuki Kato",            handicap: 35.5, category: "category_5" },
  { displayName: "Zaskia Adya Mecca",    handicap: 42.0, category: "category_6" },
  { displayName: "Agnez Mo",             handicap: 4.5,  category: "category_1" },
  { displayName: "Bunga Citra Lestari",  handicap: 17.4, category: "category_3" },
  { displayName: "Chelsea Islan",        handicap: 23.6, category: "category_4" },
  { displayName: "Dewi Perssik",         handicap: 11.8, category: "category_2" },
  { displayName: "Enzy Storia",          handicap: 19.0, category: "category_4" },
  { displayName: "Febby Rastanty",       handicap: 27.5, category: "category_5" },
  { displayName: "Gracia Indri",         handicap: 34.0, category: "category_5" },
  { displayName: "Haico Van der Veken",  handicap: 8.8,  category: "category_2" },
  { displayName: "Inul Daratista",       handicap: 21.2, category: "category_4" },
  { displayName: "Julie Estelle",        handicap: 10.6, category: "category_2" },
  { displayName: "Kimberly Ryder",       handicap: 16.2, category: "category_3" },
  { displayName: "Laudya Chintya Bella", handicap: 29.4, category: "category_5" },
  { displayName: "Mikha Tambayong",      handicap: 13.8, category: "category_3" },
  { displayName: "Nagita Slavina",       handicap: 25.2, category: "category_4" },
  { displayName: "Nikita Willy",         handicap: 7.5,  category: "category_2" },
  { displayName: "Prilly Latuconsina",   handicap: 31.0, category: "category_5" },
  { displayName: "Rossa",                handicap: 18.8, category: "category_4" },
  { displayName: "Syahrini",             handicap: 14.5, category: "category_3" },
  { displayName: "Titi Kamal",           handicap: 20.0, category: "category_4" },
  { displayName: "Uhu-uhu Amanda",       handicap: 48.0, category: "category_6" },
  { displayName: "Vanesha Prescilla",    handicap: 9.0,  category: "category_2" },
  { displayName: "Winona Willy",         handicap: 15.2, category: "category_3" },
  { displayName: "Yasmin Napper",        handicap: 22.8, category: "category_4" },
  { displayName: "Zara Adhisty",         handicap: 36.5, category: "category_5" },
];

/** Konversi display name ke email: "Aditya Pratama" → "aditya.pratama@pondokcabe.golf" */
function toEmail(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")   // hapus karakter non-alfanumerik
    .trim()
    .replace(/\s+/g, ".")           // spasi → titik
    + "@pondokcabe.golf";
}

export const seedMembers = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    message: string;
    created: number;
    updated: number;
    failed: number;
  }> => {
    const DEFAULT_PASSWORD = "pondokcabe123";
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const allMembers = [...MALE_MEMBERS, ...FEMALE_MEMBERS];
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const member of allMembers) {
      const email = toEmail(member.displayName);
      try {
        const result = await ctx.runMutation(
          internal.migrations["20260522_seed_members_mutations"].upsertMember,
          {
            email,
            name: member.displayName,
            displayName: member.displayName,
            passwordHash,
            handicapIndex: member.handicap,
            handicapCategory: member.category,
          }
        );
        if (result.created) {
          created++;
        } else {
          updated++;
        }
      } catch (err) {
        failed++;
        errors.push(`${member.displayName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const summary = [
      `✅ ${created} member baru dibuat`,
      `🔄 ${updated} member diupdate`,
      failed > 0 ? `❌ ${failed} gagal: ${errors.slice(0, 3).join(", ")}` : null,
      ``,
      `Password default: ${DEFAULT_PASSWORD}`,
      `Format email: nama.lengkap@pondokcabe.golf`,
    ].filter(Boolean).join("\n");

    return { message: summary, created, updated, failed };
  },
});
