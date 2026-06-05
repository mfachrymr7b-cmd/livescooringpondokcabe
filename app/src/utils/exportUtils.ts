import {
  generateLeaderboardReport,
  generateScorecardReport,
  generateTournamentReport,
  generatePDFContent,
  type LeaderboardReport,
  type ScorecardReport,
  type TournamentReport,
} from "./reportGenerator";

export interface ScorecardData {
  matchId: string;
  tournamentName: string;
  courseName: string;
  date: string;
  players: Array<{
    name: string;
    scores: number[];
    totalScore: number;
  }>;
}

export interface LeaderboardData {
  matchId: string;
  tournamentName: string;
  date: string;
  entries: Array<{
    rank: number;
    playerName: string;
    totalScore: number;
    holesPlayed: number;
  }>;
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  // Simple CSV export as Excel-compatible format
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value ?? "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv");
}

export function exportLeaderboardToExcel(report: LeaderboardReport) {
  const csvContent = generateLeaderboardReport(report);
  downloadFile(csvContent, `leaderboard-${report.matchId}.csv`, "text/csv");
}

export function exportScorecardToExcel(report: ScorecardReport) {
  const csvContent = generateScorecardReport(report);
  downloadFile(csvContent, `scorecard-${report.matchId}.csv`, "text/csv");
}

export function exportTournamentToExcel(report: TournamentReport) {
  const csvContent = generateTournamentReport(report);
  downloadFile(csvContent, `tournament-${report.tournamentId}.csv`, "text/csv");
}

export function exportToPDF(content: string, filename: string) {
  // For PDF export, we'll create a simple text-based representation
  // In a real implementation, you'd use a library like jsPDF or react-pdf
  downloadFile(content, `${filename}.txt`, "text/plain");
}

export function exportLeaderboardToPDF(report: LeaderboardReport) {
  const content = generatePDFContent("leaderboard", report);
  downloadFile(content, `leaderboard-${report.matchId}.txt`, "text/plain");
}

export function exportScorecardToPDF(report: ScorecardReport) {
  const content = generatePDFContent("scorecard", report);
  downloadFile(content, `scorecard-${report.matchId}.txt`, "text/plain");
}

export function exportTournamentToPDF(report: TournamentReport) {
  const content = generatePDFContent("tournament", report);
  downloadFile(content, `tournament-${report.tournamentId}.txt`, "text/plain");
}

export function downloadScorecard(data: ScorecardData) {
  const content = generateScorecardContent(data);
  downloadFile(content, `scorecard-${data.matchId}.txt`, "text/plain");
}

export function downloadLeaderboard(data: LeaderboardData) {
  const content = generateLeaderboardContent(data);
  downloadFile(content, `leaderboard-${data.matchId}.txt`, "text/plain");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateScorecardContent(data: ScorecardData): string {
  let content = `SCORECARD\n`;
  content += `${"=".repeat(50)}\n\n`;
  content += `Tournament: ${data.tournamentName}\n`;
  content += `Course: ${data.courseName}\n`;
  content += `Date: ${data.date}\n`;
  content += `Match ID: ${data.matchId}\n\n`;
  content += `${"=".repeat(50)}\n\n`;

  data.players.forEach((player, index) => {
    content += `Player ${index + 1}: ${player.name}\n`;
    content += `Scores: ${player.scores.join(" | ")}\n`;
    content += `Total Score: ${player.totalScore}\n\n`;
  });

  return content;
}

function generateLeaderboardContent(data: LeaderboardData): string {
  let content = `LEADERBOARD\n`;
  content += `${"=".repeat(50)}\n\n`;
  content += `Tournament: ${data.tournamentName}\n`;
  content += `Date: ${data.date}\n`;
  content += `Match ID: ${data.matchId}\n\n`;
  content += `${"=".repeat(50)}\n\n`;
  content += `Rank | Player | Total Score | Holes Played\n`;
  content += `${"-".repeat(50)}\n`;

  data.entries.forEach((entry) => {
    content += `${entry.rank.toString().padStart(4)} | ${entry.playerName.padEnd(20)} | ${entry.totalScore.toString().padStart(10)} | ${entry.holesPlayed}\n`;
  });

  return content;
}
