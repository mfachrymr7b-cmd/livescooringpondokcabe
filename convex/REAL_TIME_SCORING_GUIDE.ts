/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LIVE SCORE UPDATE & SYNCHRONIZATION GUIDE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file documents the complete real-time scoring and synchronization flow.
 *
 * ARCHITECTURE OVERVIEW
 * ─────────────────────
 *
 * 1. CLIENT INITIATES SCORE ENTRY
 *    Player/Marker records hole score via recordHoleScore mutation
 *
 * 2. MUTATION FLOW
 *    - recordHoleScore mutation processes the score
 *    - _recalculateTotals helper updates scorecard totals
 *    - _syncMatchplayForHole handles match play scoring (if applicable)
 *    - Scheduler queues leaderboard.recalculate for next tick
 *
 * 3. REAL-TIME SUBSCRIPTIONS TRIGGER
 *    Convex automatically pushes updates to all subscribed clients:
 *    - api.subscriptions.scorecards.liveHoles
 *    - api.subscriptions.scorecards.liveMatchScoring
 *    - api.subscriptions.leaderboard.live
 *    - api.subscriptions.matches.liveMatch
 *    - api.subscriptions.holeProgress.matchProgress
 *
 * SUBSCRIPTION CATALOG
 * ─────────────────────
 *
 * SCORECARD UPDATES
 * • liveHoles(scorecardId) - Single player's hole-by-hole scores
 * • liveMatchScoring(matchId) - All players' scores in a match
 * • scorecardHolesByRecent(scorecardId, limit) - Recent holes for display
 *
 * LEADERBOARD UPDATES
 * • leaderboard.live(tournamentId) - Full leaderboard (gross)
 * • leaderboard.liveNet(tournamentId) - Net score leaderboard
 * • leaderboard.myPosition(tournamentId, playerId) - Single player position
 * • leaderboard.top(tournamentId, limit) - Top N players
 *
 * MATCH SYNCHRONIZATION
 * • matches.liveMatch(matchId) - Match status + all scorecards
 * • matches.livePlayerProgress(matchId, playerId) - Single player match detail
 * • matches.liveActivity(tournamentId) - Active + scheduled matches
 *
 * HOLE PROGRESS TRACKING
 * • holeProgress.matchProgress(matchId) - All players' current holes
 * • holeProgress.tournamentProgress(tournamentId) - Tournament-wide progress
 * • holeProgress.liveScorecardsForTournament(tournamentId) - All scorecards
 *
 * REAL-TIME FLOW DIAGRAM
 * ──────────────────────
 *
 *   Player Records Score
 *          ↓
 *   recordHoleScore(scorecard, hole)
 *          ↓
 *   ┌──────────────────────────────┐
 *   │ MUTATION PROCESSING          │
 *   ├──────────────────────────────┤
 *   │ 1. Insert/update hole score  │
 *   │ 2. _recalculateTotals()      │
 *   │    - Recompute scorecard     │
 *   │    - Update total strokes    │
 *   │ 3. _syncMatchplayForHole()   │
 *   │    - Determine hole winner   │
 *   │    - Update match standing   │
 *   │ 4. Schedule recalculate()    │
 *   │    - Rank all players        │
 *   │    - Update leaderboard      │
 *   └──────────────────────────────┘
 *          ↓
 *   Convex Subscriptions Push Updates
 *          ↓
 *   ┌─────────────────────────────────────────┐
 *   │ All Subscribed Clients Receive          │
 *   ├─────────────────────────────────────────┤
 *   │ • Live leaderboard changes              │
 *   │ • Scorecard total updates               │
 *   │ • Match scoring changes                 │
 *   │ • Hole progress status                  │
 *   │ • Player position updates               │
 *   └─────────────────────────────────────────┘
 *
 * PERFORMANCE OPTIMIZATION
 * ────────────────────────
 *
 * 1. SCHEDULED UPDATES (Deferred)
 *    - Leaderboard recalculation uses scheduler
 *    - Batches multiple score changes
 *    - Reduces recalculation overhead
 *
 * 2. INDEX-BASED QUERIES
 *    - All subscriptions use existing indexes
 *    - No N+1 query patterns
 *    - Optimized for tournament-scale data
 *
 * 3. DENORMALIZED DATA
 *    - Leaderboard table maintains precomputed ranks
 *    - Match standings stored on scorecard
 *    - Avoids expensive ranking calculations
 *
 * 4. MUTATION FLOW
 *    - Single mutation per score entry
 *    - Atomic scorecard updates
 *    - Match play resolution deferred
 *
 * CLIENT USAGE EXAMPLES
 * ──────────────────────
 *
 * LIVE LEADERBOARD (Dashboard)
 * ─────────────────────────────
 *
 *   import { useQuery } from 'convex/react';
 *   import { api } from '@/modules/convex/api';
 *
 *   export function LiveLeaderboard({ tournamentId }: { tournamentId: Id<'tournaments'> }) {
 *     const leaderboard = useQuery(api.subscriptions.leaderboard.live, {
 *       tournamentId,
 *     });
 *
 *     return (
 *       <div>
 *         {leaderboard?.map((entry) => (
 *           <div key={entry.playerId}>
 *             {entry.rank}. {entry.displayName}: {entry.totalStrokes}
 *           </div>
 *         ))}
 *       </div>
 *     );
 *   }
 *
 * LIVE MATCH SCORING (Marker/Admin View)
 * ──────────────────────────────────────
 *
 *   export function MatchScoringTable({ matchId }: { matchId: Id<'matches'> }) {
 *     const match = useQuery(api.subscriptions.matches.liveMatch, { matchId });
 *
 *     return (
 *       <table>
 *         <tbody>
 *           {match?.scorecards.map((sc) => (
 *             <tr key={sc.scorecardId}>
 *               <td>{sc.displayName}</td>
 *               <td>{sc.totalStrokes}</td>
 *               <td>{sc.holesCompleted}/18</td>
 *             </tr>
 *           ))}
 *         </tbody>
 *       </table>
 *     );
 *   }
 *
 * HOLE PROGRESS TRACKING (Tournament Ops)
 * ───────────────────────────────────────
 *
 *   export function TournamentProgress({ tournamentId }: { tournamentId: Id<'tournaments'> }) {
 *     const progress = useQuery(api.subscriptions.holeProgress.tournamentProgress, {
 *       tournamentId,
 *     });
 *
 *     return (
 *       <div>
 *         <p>Active Matches: {progress?.activeMatchCount}</p>
 *         <p>Average Progress: Hole {progress?.averageHoleProgress}/18</p>
 *       </div>
 *     );
 *   }
 *
 * MATCH PLAY STANDING (Live Display)
 * ───────────────────────────────────
 *
 *   export function MatchPlayStanding({ matchId }: { matchId: Id<'matches'> }) {
 *     const match = useQuery(api.subscriptions.matches.liveMatch, { matchId });
 *
 *     if (!match) return null;
 *
 *     return (
 *       <div>
 *         {match.scorecards.map((sc) => (
 *           <div key={sc.scorecardId}>
 *             <p>{sc.displayName}</p>
 *             <p>
 *               {sc.matchplayHolesWon}UP / {sc.matchplayHolesLost}DN
 *             </p>
 *           </div>
 *         ))}
 *       </div>
 *     );
 *   }
 *
 * TROUBLESHOOTING
 * ───────────────
 *
 * Q: Leaderboard not updating immediately?
 * A: Leaderboard updates via scheduler (0ms delay). If still not updating:
 *    - Check recordHoleScore mutation completed successfully
 *    - Verify leaderboard.recalculate ran (check logs)
 *    - Ensure subscription query is properly subscribed (useQuery not skipped)
 *
 * Q: Match play standing not reflecting new hole score?
 * A: Match play scoring syncs per hole via _syncMatchplayForHole.
 *    - Verify tournament format is 'match_play'
 *    - Check opponent scorecard exists
 *    - Verify holeId matches opponent's hole
 *
 * Q: Hole progress showing wrong count?
 * A: Hole count is derived from scorecard_holes entries.
 *    - Verify all hole scores were persisted
 *    - Check for any failed recordHoleScore mutations
 *    - Ensure holes are inserted in order
 *
 * FUTURE ENHANCEMENTS
 * ───────────────────
 *
 * 1. SNAPSHOT BACKUP
 *    - Store leaderboard snapshots per round
 *    - Enable historical comparison
 *
 * 2. REAL-TIME NOTIFICATIONS
 *    - Push alerts on score changes
 *    - Leader changes notification
 *
 * 3. ANALYTICS TRACKING
 *    - Measure leaderboard recalc latency
 *    - Track subscription health
 *    - Monitor mutation performance
 */

export {};
