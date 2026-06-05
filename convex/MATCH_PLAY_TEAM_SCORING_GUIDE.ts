/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MATCH PLAY & TEAM SCORING GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete reference for match play scoring, team formats, and nine-hole tracking.
 *
 * MATCH PLAY SCORING OVERVIEW
 * ────────────────────────────
 *
 * 1. HOLE WINNER DETERMINATION
 *    - Each hole is won individually
 *    - Determined by lowest NET score (after handicap strokes)
 *    - Functions: determineHoleWinner(), getHolePoints()
 *
 * 2. MATCH STANDING (Match Play Points)
 *    - +1 = Player won hole
 *    - 0 = Hole halved (tied)
 *    - -1 = Player lost hole
 *    - Stored in scorecard_holes.matchplayPoints
 *
 * 3. HOLE ACCUMULATION
 *    - Holes Won (count of +1s)
 *    - Holes Lost (count of -1s)
 *    - Holes Halved (count of 0s)
 *    - Stored on scorecard: matchplayHolesWon, matchplayHolesLost, matchplayHolesHalved
 *
 * 4. STANDING DISPLAY
 *    Format: "2 UP", "AS", "1 DOWN"
 *    - UP = Leading (more holes won than lost)
 *    - AS = All Square (equal holes won/lost)
 *    - DOWN = Trailing (fewer holes won than lost)
 *    Function: formatMatchPlayStanding()
 *
 * HOLE WINNER CALCULATION FLOW
 * ────────────────────────────
 *
 *   Player A Records Score → Hole calculated (gross, net, par)
 *                ↓
 *   _syncMatchplayForHole() triggered
 *                ↓
 *   Fetch Player B's hole score
 *                ↓
 *   Compare NET strokes
 *   Player A: 4 strokes → -1 handicap = NET 3
 *   Player B: 5 strokes → 0 handicap = NET 5
 *                ↓
 *   Player A wins hole (lower net)
 *   matchplayPoints: A = +1, B = -1
 *                ↓
 *   Update scorecard totals
 *   A: 1 hole won, 0 lost → "1 UP"
 *   B: 0 holes won, 1 lost → "1 DOWN"
 *
 * MATCH STANDING STATUS
 * ─────────────────────
 *
 * Leading: "X UP"
 *   - More holes won than holes lost
 *   - Player has advantage
 *   - Can clinch match early if lead > holes remaining
 *
 * All Square: "AS"
 *   - Equal holes won and lost
 *   - Level match
 *   - Sudden death after 18 holes if tied
 *
 * Trailing: "X DOWN"
 *   - Fewer holes won than holes lost
 *   - Player behind
 *   - Can catch up if holes remaining > deficit
 *
 * Clinched/Cannot Win:
 *   - If up 5 with 4 holes left → mathematically won
 *   - If down 5 with 4 holes left → mathematically lost
 *   - Functions: calculateMatchPlayStanding(), canWin, canLose
 *
 * TEAM SCORING FORMATS
 * ───────────────────
 *
 * 1. BEST BALL (Four Ball)
 *    - Each team plays best (lowest) score per hole
 *    - Compare team lows each hole
 *    - Format: bestBallWinner(playerA1, playerA2, playerB1, playerB2)
 *    - Win condition: Team's low < Other team's low
 *
 * 2. ALTERNATE SHOT (Chapman)
 *    - Each player hits once, select best shot
 *    - Partner plays final shot from selected spot
 *    - Score: Combined net of both shots or just final score
 *    - Format: alternateShotWinner(playerA1, playerA2, playerB1, playerB2)
 *
 * 3. BETTER BALL
 *    - Each team accumulates their best scores
 *    - E.g., Player A shoots 4, Player B shoots 5 → Team uses 4
 *    - Format: betterBallTotal(player1, player2, par)
 *
 * NINE-HOLE TRACKING
 * ──────────────────
 *
 * Front Nine: Holes 1-9
 * Back Nine: Holes 10-18
 *
 * Calculation:
 *   Front 9 Strokes: Sum of holes 1-9
 *   Front 9 Par: Typically 36 (half of 72)
 *   Front 9 Score to Par: Strokes - Par
 *
 * Examples:
 *   Holes 1-9: 4,3,5,4,3,4,5,3,4 = 35 strokes
 *   Front Par: 36
 *   To Par: 35 - 36 = -1 (1 under)
 *
 *   Holes 10-18: 5,4,4,3,4,5,4,3,5 = 37 strokes
 *   Back Par: 36
 *   To Par: 37 - 36 = +1 (1 over)
 *
 * Functions:
 *   - calculateFrontNine()
 *   - calculateBackNine()
 *   - splitNinesForComparison() [for head-to-head]
 *
 * CLIENT SUBSCRIPTION USAGE
 * ─────────────────────────
 *
 * LIVE MATCH DISPLAY (Leaderboard/Broadcast)
 * ──────────────────────────────────────────
 *
 *   import { useQuery } from 'convex/react';
 *   import { api } from '@/modules/convex/api';
 *
 *   export function MatchPlayDisplay({ matchId }: { matchId: Id<'matches'> }) {
 *     const display = useQuery(api.subscriptions.matchplay.matchDisplay, {
 *       matchId,
 *     });
 *
 *     if (!display) return <div>Loading...</div>;
 *
 *     return (
 *       <div>
 *         <h2>Match Play</h2>
 *         <div>
 *           <p>{display.display.playerA.displayName}</p>
 *           <p>{display.display.playerA.standing}</p>
 *           <p>{display.display.playerA.holesWon}W - {display.display.playerA.holesLost}L</p>
 *         </div>
 *         <div>
 *           <p>{display.display.playerB.displayName}</p>
 *           <p>{display.display.playerB.standing}</p>
 *           <p>{display.display.playerB.holesWon}W - {display.display.playerB.holesLost}L</p>
 *         </div>
 *       </div>
 *     );
 *   }
 *
 * DETAILED MATCH COMPARISON (Score Card View)
 * ────────────────────────────────────────────
 *
 *   export function MatchPlayComparison({ matchId }: { matchId: Id<'matches'> }) {
 *     const comparison = useQuery(api.subscriptions.matchplay.matchPlayComparison, {
 *       matchId,
 *     });
 *
 *     if (!comparison) return null;
 *
 *     const [p1, p2] = comparison.players;
 *
 *     return (
 *       <table>
 *         <thead>
 *           <tr>
 *             <th>Player</th>
 *             <th>Front 9</th>
 *             <th>Back 9</th>
 *             <th>Total</th>
 *           </tr>
 *         </thead>
 *         <tbody>
 *           <tr>
 *             <td>{p1.name}</td>
 *             <td>{p1.front9?.scoreToPar}</td>
 *             <td>{p1.back9?.scoreToPar}</td>
 *             <td>{p1.total.scoreToPar}</td>
 *           </tr>
 *           <tr>
 *             <td>{p2.name}</td>
 *             <td>{p2.front9?.scoreToPar}</td>
 *             <td>{p2.back9?.scoreToPar}</td>
 *             <td>{p2.total.scoreToPar}</td>
 *           </tr>
 *         </tbody>
 *       </table>
 *     );
 *   }
 *
 * NINE-HOLE BREAKDOWN (Display)
 * ────────────────────────────
 *
 *   export function NineHoleBreakdown({ scorecardId }: { scorecardId: Id<'scorecards'> }) {
 *     const nines = useQuery(api.subscriptions.matchplay.nineHoles, {
 *       scorecardId,
 *     });
 *
 *     if (!nines) return null;
 *
 *     return (
 *       <div>
 *         <div>
 *           <h3>Front 9</h3>
 *           <p>Strokes: {nines.frontNine?.strokes}</p>
 *           <p>To Par: {nines.frontNine?.scoreToPar}</p>
 *           <p>Stableford: {nines.frontNine?.stablefordPoints}</p>
 *         </div>
 *         <div>
 *           <h3>Back 9</h3>
 *           <p>Strokes: {nines.backNine?.strokes}</p>
 *           <p>To Par: {nines.backNine?.scoreToPar}</p>
 *           <p>Stableford: {nines.backNine?.stablefordPoints}</p>
 *         </div>
 *         <div>
 *           <h3>Total (All Holes)</h3>
 *           <p>Strokes: {nines.total.strokes}</p>
 *           <p>To Par: Not shown (use scorecard total)</p>
 *         </div>
 *       </div>
 *     );
 *   }
 *
 * TEAM STANDINGS (Tournament)
 * ──────────────────────────
 *
 *   export function TeamStandings({ tournamentId, roundNumber }: ...) {
 *     const standings = useQuery(api.subscriptions.matchplay.teamStandings, {
 *       tournamentId,
 *       roundNumber,
 *     });
 *
 *     return (
 *       <div>
 *         {standings?.matches.map((match) => (
 *           <div key={match.matchId}>
 *             <p>{match.team1.players.join(' & ')}</p>
 *             <p>{match.team1.holesWon} holes, {match.team1.totalScore} strokes</p>
 *             <p>vs</p>
 *             <p>{match.team2.players.join(' & ')}</p>
 *             <p>{match.team2.holesWon} holes, {match.team2.totalScore} strokes</p>
 *           </div>
 *         ))}
 *       </div>
 *     );
 *   }
 *
 * COMMON PATTERNS
 * ───────────────
 *
 * Check if match is clinched:
 *   const standing = calculateMatchPlayStanding(
 *     holesWon, holesLost, holesHalved, totalHoles
 *   );
 *   if (!standing.canLose) { // Player already won }
 *   if (!standing.canWin) { // Player already lost }
 *
 * Format result for scorecard after match:
 *   const result = formatMatchResult(
 *     holesWon, holesLost, 18, holesDecided
 *   );
 *   // Returns "2&1", "1 UP", "Halved", etc
 *
 * Compare front/back for analysis:
 *   const comparison = splitNinesForComparison(
 *     playerAHoles, playerBHoles, 36, 36
 *   );
 *   if (comparison.front.playerA.strokes < comparison.back.playerA.strokes) {
 *     // Player stronger on front 9
 *   }
 */

export {};
