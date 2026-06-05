export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  holesPlayed: number;
  parScore?: number;
}

export interface ScorecardEntry {
  playerName: string;
  holeNumber: number;
  par: number;
  score: number;
  result: string; // "birdie", "par", "bogey", etc.
}

export interface TournamentReport {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalMatches: number;
  status: string;
  winner?: string;
}

export interface LeaderboardReport {
  matchId: string;
  tournamentName: string;
  courseName: string;
  date: string;
  entries: LeaderboardEntry[];
}

export interface ScorecardReport {
  matchId: string;
  tournamentName: string;
  courseName: string;
  date: string;
  entries: ScorecardEntry[];
}

export function generateLeaderboardReport(report: LeaderboardReport) {
  const csvContent = [
    ["LEADERBOARD REPORT", "", ""],
    [""],
    [`Tournament: ${report.tournamentName}`, "", ""],
    [`Course: ${report.courseName}`, "", ""],
    [`Date: ${report.date}`, "", ""],
    [`Match ID: ${report.matchId}`, "", ""],
    [""],
    ["Rank", "Player Name", "Total Score", "Holes Played", "Par Score"],
    ...report.entries.map((entry) => [
      entry.rank,
      entry.playerName,
      entry.totalScore,
      entry.holesPlayed,
      entry.parScore || "-",
    ]),
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}

export function generateScorecardReport(report: ScorecardReport) {
  const csvContent = [
    ["SCORECARD REPORT", "", ""],
    [""],
    [`Tournament: ${report.tournamentName}`, "", ""],
    [`Course: ${report.courseName}`, "", ""],
    [`Date: ${report.date}`, "", ""],
    [`Match ID: ${report.matchId}`, "", ""],
    [""],
    ["Player Name", "Hole", "Par", "Score", "Result"],
    ...report.entries.map((entry) => [
      entry.playerName,
      entry.holeNumber,
      entry.par,
      entry.score,
      entry.result,
    ]),
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}

export function generateTournamentReport(report: TournamentReport) {
  const csvContent = [
    ["TOURNAMENT REPORT", "", ""],
    [""],
    [`Tournament Name: ${report.tournamentName}`, "", ""],
    [`Tournament ID: ${report.tournamentId}`, "", ""],
    [`Start Date: ${report.startDate}`, "", ""],
    [`End Date: ${report.endDate}`, "", ""],
    [`Status: ${report.status}`, "", ""],
    [""],
    ["Total Participants", report.totalParticipants, ""],
    ["Total Matches", report.totalMatches, ""],
    ["Winner", report.winner || "TBD", ""],
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return csvContent;
}

export function generatePDFContent(
  type: "leaderboard" | "scorecard" | "tournament",
  data: LeaderboardReport | ScorecardReport | TournamentReport
): string {
  let content = "";

  if (type === "leaderboard") {
    const report = data as LeaderboardReport;
    content = `LEADERBOARD REPORT
${"=".repeat(60)}

Tournament: ${report.tournamentName}
Course: ${report.courseName}
Date: ${report.date}
Match ID: ${report.matchId}

${"=".repeat(60)}

Rank  | Player Name              | Total Score | Holes Played | Par Score
${"-".repeat(60)}
${report.entries
  .map(
    (entry) =>
      `${entry.rank.toString().padStart(5)} | ${entry.playerName.padEnd(24)} | ${entry.totalScore.toString().padStart(11)} | ${entry.holesPlayed.toString().padStart(12)} | ${entry.parScore || "-"}`
  )
  .join("\n")}
`;
  } else if (type === "scorecard") {
    const report = data as ScorecardReport;
    content = `SCORECARD REPORT
${"=".repeat(60)}

Tournament: ${report.tournamentName}
Course: ${report.courseName}
Date: ${report.date}
Match ID: ${report.matchId}

${"=".repeat(60)}

Player Name       | Hole | Par | Score | Result
${"-".repeat(60)}
${report.entries
  .map(
    (entry) =>
      `${entry.playerName.padEnd(17)} | ${entry.holeNumber.toString().padStart(4)} | ${entry.par.toString().padStart(3)} | ${entry.score.toString().padStart(5)} | ${entry.result}`
  )
  .join("\n")}
`;
  } else if (type === "tournament") {
    const report = data as TournamentReport;
    content = `TOURNAMENT REPORT
${"=".repeat(60)}

Tournament Name: ${report.tournamentName}
Tournament ID: ${report.tournamentId}
Start Date: ${report.startDate}
End Date: ${report.endDate}
Status: ${report.status}

${"=".repeat(60)}

Total Participants: ${report.totalParticipants}
Total Matches: ${report.totalMatches}
Winner: ${report.winner || "TBD"}
`;
  }

  return content;
}
