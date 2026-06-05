/**
 * Migration: Seed 100 temporary players (50 male + 50 female)
 * Date: 2026-05-22
 * Reason: Populate tournament with sample player data for testing/demo
 *
 * Jalankan: npx convex run migrations/20260522_seed_100_players:seedPlayers
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

type PlayerData = {
  displayName: string;
  handicap: number;
};

const MALE_PLAYERS: PlayerData[] = [
  { displayName: "Aditya Pratama", handicap: 4.2 },
  { displayName: "Budi Santoso", handicap: 8.5 },
  { displayName: "Chandra Wijaya", handicap: 12.4 },
  { displayName: "Dedi Kurniawan", handicap: 15.0 },
  { displayName: "Eko Prasetyo", handicap: 20.1 },
  { displayName: "Fajar Ramadhan", handicap: 28.5 },
  { displayName: "Guntur Saputra", handicap: 38.0 },
  { displayName: "Hendra Setiawan", handicap: 2.1 },
  { displayName: "Indra Jaya", handicap: 10.2 },
  { displayName: "Joko Widodo", handicap: 18.4 },
  { displayName: "Kevin Sanjaya", handicap: 5.0 },
  { displayName: "Lukman Hakim", handicap: 14.2 },
  { displayName: "Mahendra Putra", handicap: 22.5 },
  { displayName: "Nanang Kosim", handicap: 30.0 },
  { displayName: "Okky Lukman", handicap: 45.2 },
  { displayName: "Pandu Dewanata", handicap: 7.8 },
  { displayName: "Qomarudin", handicap: 13.5 },
  { displayName: "Rian Ardianto", handicap: 19.2 },
  { displayName: "Surya Kencana", handicap: 26.0 },
  { displayName: "Taufik Hidayat", handicap: 3.5 },
  { displayName: "Utama Putra", handicap: 11.0 },
  { displayName: "Victor Igbonefo", handicap: 16.5 },
  { displayName: "Wahyu Nugroho", handicap: 24.8 },
  { displayName: "Xander Yusuf", handicap: 32.1 },
  { displayName: "Yosep Iskandar", handicap: 40.0 },
  { displayName: "Zaki Anwar", handicap: 9.2 },
  { displayName: "Ahmad Dhani", handicap: 14.8 },
  { displayName: "Bambang Pamungkas", handicap: 18.0 },
  { displayName: "Catur Pamungkas", handicap: 21.4 },
  { displayName: "Dicky Wahyudi", handicap: 5.4 },
  { displayName: "Erlangga Putra", handicap: 12.0 },
  { displayName: "Farhan Abas", handicap: 17.2 },
  { displayName: "Gilang Dirga", handicap: 25.5 },
  { displayName: "Harry Maulana", handicap: 33.0 },
  { displayName: "Iwan Fals", handicap: 11.5 },
  { displayName: "Junaedi Ali", handicap: 19.8 },
  { displayName: "Komang Teguh", handicap: 6.2 },
  { displayName: "Lucky Perdana", handicap: 15.6 },
  { displayName: "Mario Lawalata", handicap: 13.1 },
  { displayName: "Nico Siahaan", handicap: 20.5 },
  { displayName: "Onky Alexander", handicap: 35.0 },
  { displayName: "Putu Gede", handicap: 4.8 },
  { displayName: "Risky Ridho", handicap: 8.9 },
  { displayName: "Syamsul Arif", handicap: 16.0 },
  { displayName: "Tommy Sugiarto", handicap: 12.2 },
  { displayName: "Usman Harun", handicap: 23.4 },
  { displayName: "Vidi Aldiano", handicap: 27.2 },
  { displayName: "Wisnu Wardhana", handicap: 5.2 },
  { displayName: "Yudha Pratama", handicap: 14.5 },
  { displayName: "Zainuddin MZ", handicap: 18.2 },
];

const FEMALE_PLAYERS: PlayerData[] = [
  { displayName: "Anisa Rahma", handicap: 6.5 },
  { displayName: "Bella Shofie", handicap: 12.0 },
  { displayName: "Citra Kirana", handicap: 18.2 },
  { displayName: "Dian Sastro", handicap: 22.4 },
  { displayName: "Erina Gudono", handicap: 30.5 },
  { displayName: "Fitri Carlina", handicap: 40.2 },
  { displayName: "Gita Gutawa", handicap: 5.1 },
  { displayName: "Hesty Purwadinata", handicap: 15.5 },
  { displayName: "Isyana Sarasvati", handicap: 24.0 },
  { displayName: "Jessica Mila", handicap: 32.8 },
  { displayName: "Krisdayanti", handicap: 14.0 },
  { displayName: "Luna Maya", handicap: 9.5 },
  { displayName: "Maudy Ayunda", handicap: 11.2 },
  { displayName: "Nia Ramadhani", handicap: 19.8 },
  { displayName: "Olla Ramlan", handicap: 26.5 },
  { displayName: "Puspita Sari", handicap: 38.2 },
  { displayName: "Queenaya Maryam", handicap: 7.2 },
  { displayName: "Raisa Andriana", handicap: 13.4 },
  { displayName: "Sandra Dewi", handicap: 21.0 },
  { displayName: "Tatjana Saphira", handicap: 28.0 },
  { displayName: "Ussy Sulistiawaty", handicap: 16.8 },
  { displayName: "Velove Vexia", handicap: 5.3 },
  { displayName: "Wulan Guritno", handicap: 12.5 },
  { displayName: "Xena Alexandra", handicap: 20.2 },
  { displayName: "Yuki Kato", handicap: 35.5 },
  { displayName: "Zaskia Adya Mecca", handicap: 42.0 },
  { displayName: "Agnez Mo", handicap: 4.5 },
  { displayName: "Bunga Citra Lestari", handicap: 17.4 },
  { displayName: "Chelsea Islan", handicap: 23.6 },
  { displayName: "Dewi Perssik", handicap: 11.8 },
  { displayName: "Enzy Storia", handicap: 19.0 },
  { displayName: "Febby Rastanty", handicap: 27.5 },
  { displayName: "Gracia Indri", handicap: 34.0 },
  { displayName: "Haico Van der Veken", handicap: 8.8 },
  { displayName: "Inul Daratista", handicap: 21.2 },
  { displayName: "Julie Estelle", handicap: 10.6 },
  { displayName: "Kimberly Ryder", handicap: 16.2 },
  { displayName: "Laudya Chintya Bella", handicap: 29.4 },
  { displayName: "Mikha Tambayong", handicap: 13.8 },
  { displayName: "Nagita Slavina", handicap: 25.2 },
  { displayName: "Nikita Willy", handicap: 7.5 },
  { displayName: "Prilly Latuconsina", handicap: 31.0 },
  { displayName: "Rossa", handicap: 18.8 },
  { displayName: "Syahrini", handicap: 14.5 },
  { displayName: "Titi Kamal", handicap: 20.0 },
  { displayName: "Uhu-uhu Amanda", handicap: 48.0 },
  { displayName: "Vanesha Prescilla", handicap: 9.0 },
  { displayName: "Winona Willy", handicap: 15.2 },
  { displayName: "Yasmin Napper", handicap: 22.8 },
  { displayName: "Zara Adhisty", handicap: 36.5 },
];

export const seedPlayers = internalAction({
  args: {},
  handler: async (ctx): Promise<{ message: string; count: number }> => {
    const allPlayers = [...MALE_PLAYERS, ...FEMALE_PLAYERS];
    let createdCount = 0;

    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];
      const email = `player${String(i + 1).padStart(3, "0")}@pondokcabe.local`;

      try {
        // Check if email already exists
        const existing = await ctx.runQuery(internal.auth.helpers.getUserByEmail, {
          email,
        });

        if (existing) {
          continue; // Skip if already exists
        }

        // Create user using auth helper
        await ctx.runMutation(internal.auth.helpers.createUser, {
          email,
          passwordHash: "$2b$10$empty", // Placeholder hash
          name: player.displayName,
          role: "player",
        });

        createdCount++;
      } catch (error) {
        console.error(`Error creating player ${player.displayName}:`, error);
      }
    }

    return {
      message: `✅ Berhasil membuat ${createdCount} pemain (${MALE_PLAYERS.length} pria + ${FEMALE_PLAYERS.length} wanita)`,
      count: createdCount,
    };
  },
});
