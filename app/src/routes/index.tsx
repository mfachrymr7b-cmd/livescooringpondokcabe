/**
 * Route definitions — all app routes.
 *
 * Public (no auth):
 *   /live                          → Flashscore-style live scoring homepage
 *   /live/:tournamentId            → Live leaderboard per tournament
 *
 * Guest-only (redirect to /dashboard if logged in):
 *   /login, /register, /forgot-password
 *
 * Protected (redirect to /login if not logged in):
 *   /dashboard
 *   /courses, /courses/:id, /courses/:id/holes
 *   /tournaments, /tournaments/create, /tournaments/:id
 *   /tournaments/:id/leaderboard
 *   /tournaments/:id/broadcast        (fullscreen, no sidebar)
 *   /tournaments/:id/matches/:id/scoring
 *   /tournaments/:id/team-match
 *   /tournaments/:id/start-round
 *   /scorecards
 *   /scorecards/:id
 *   /profile
 *   /admin/users                   (super_admin, club_admin)
 *   /admin/reports                 (super_admin, club_admin, tournament_admin)
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { GuestRoute } from "@/components/shared/GuestRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { MobileGuard } from "@/components/shared/MobileGuard";

// Auth
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

// Dashboard
import { DashboardPage } from "@/pages/dashboard/DashboardPage";

// Courses
import { CoursesPage } from "@/pages/courses/CoursesPage";
import { CourseDetailPage } from "@/pages/courses/CourseDetailPage";
import { CourseHolesPage } from "@/pages/courses/CourseHolesPage";

// Tournaments
import { TournamentsPage } from "@/pages/tournaments/TournamentsPage";
import { CreateTournamentPage } from "@/pages/tournaments/CreateTournamentPage";
import { TournamentDetailPage } from "@/pages/tournaments/TournamentDetailPage";
import { LeaderboardPage } from "@/pages/tournaments/LeaderboardPage";
import { BroadcastLeaderboardPage } from "@/pages/tournaments/BroadcastLeaderboardPage";
import { LiveMatchScoringPage } from "@/pages/tournaments/LiveMatchScoringPage";
import { TeamMatchPage } from "@/pages/tournaments/TeamMatchPage";

// Scorecards
import { ScorecardPage } from "@/pages/scorecards/ScorecardPage";
import { StartRoundPage } from "@/pages/scorecards/StartRoundPage";
import { ScorecardsListPage } from "@/pages/scorecards/ScorecardsListPage";

// Player
import { ProfilePage } from "@/pages/player/ProfilePage";

// Admin
import { UsersPage } from "@/pages/admin/UsersPage";
import { ReportsPage } from "@/pages/admin/ReportsPage";

// Public live scoring (no auth required)
import { LiveScoringPage } from "@/pages/live/LiveScoringPage";
import { LiveTournamentPage } from "@/pages/live/LiveTournamentPage";
import { LiveCommentPage } from "@/pages/live/LiveCommentPage";

// Error
import { NotFoundPage } from "@/pages/NotFoundPage";
import { MobileLandingPage } from "@/pages/MobileLandingPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Public live scoring (no auth) ── */}
      <Route path="/live" element={<LiveScoringPage />} />
      <Route path="/live/:tournamentId" element={<LiveTournamentPage />} />
      <Route path="/live/:tournamentId/comment" element={<LiveCommentPage />} />

      <Route element={<RootLayout />}>

        {/* ── Mobile landing ── */}
        <Route path="/mobile" element={<MobileLandingPage />} />

        {/* ── Guest-only ── */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        {/* ── Protected ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MobileGuard />}>
            {/* Fullscreen pages (no sidebar) */}
            <Route path="/tournaments/:tournamentId/broadcast" element={<BroadcastLeaderboardPage />} />

            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Courses */}
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route path="/courses/:courseId/holes" element={<CourseHolesPage />} />

              {/* Tournaments */}
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/create" element={<CreateTournamentPage />} />
              <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
              <Route path="/tournaments/:tournamentId/leaderboard" element={<LeaderboardPage />} />
              <Route path="/tournaments/:tournamentId/matches/:matchId/scoring" element={<LiveMatchScoringPage />} />
              <Route path="/tournaments/:tournamentId/team-match" element={<TeamMatchPage />} />
              <Route path="/tournaments/:tournamentId/start-round" element={<StartRoundPage />} />

              {/* Scorecards — allowed on mobile */}
              <Route path="/scorecards" element={<ScorecardsListPage />} />
              <Route path="/scorecards/:scorecardId" element={<ScorecardPage />} />
              <Route path="/tournaments/:tournamentId/scorecards" element={<ScorecardsListPage />} />

              {/* Player */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* Admin */}
              <Route element={<RoleGuard allowed={["super_admin", "club_admin"]} />}>
                <Route path="/admin/users" element={<UsersPage />} />
              </Route>
              <Route element={<RoleGuard allowed={["super_admin", "club_admin", "tournament_admin"]} />}>
                <Route path="/admin/reports" element={<ReportsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
