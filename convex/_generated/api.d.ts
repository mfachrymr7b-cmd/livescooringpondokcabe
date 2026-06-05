/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as HANDICAP_CATEGORY_GUIDE from "../HANDICAP_CATEGORY_GUIDE.js";
import type * as MATCH_PLAY_TEAM_SCORING_GUIDE from "../MATCH_PLAY_TEAM_SCORING_GUIDE.js";
import type * as REAL_TIME_SCORING_GUIDE from "../REAL_TIME_SCORING_GUIDE.js";
import type * as auth_admin from "../auth/admin.js";
import type * as auth_changePassword from "../auth/changePassword.js";
import type * as auth_constants from "../auth/constants.js";
import type * as auth_helpers from "../auth/helpers.js";
import type * as auth_jwt from "../auth/jwt.js";
import type * as auth_login from "../auth/login.js";
import type * as auth_logout from "../auth/logout.js";
import type * as auth_password from "../auth/password.js";
import type * as auth_refresh from "../auth/refresh.js";
import type * as auth_register from "../auth/register.js";
import type * as auth_roles from "../auth/roles.js";
import type * as auth_validate from "../auth/validate.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_handicap from "../lib/handicap.js";
import type * as lib_matchplay from "../lib/matchplay.js";
import type * as lib_ranking from "../lib/ranking.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_teamScoring from "../lib/teamScoring.js";
import type * as migrations_20260512_initial_seed from "../migrations/20260512_initial_seed.js";
import type * as migrations_20260516_schema_v1 from "../migrations/20260516_schema_v1.js";
import type * as migrations_20260518_reset_dev_password from "../migrations/20260518_reset_dev_password.js";
import type * as migrations_20260518_reset_dev_password_mutations from "../migrations/20260518_reset_dev_password_mutations.js";
import type * as migrations_20260522_seed_100_players from "../migrations/20260522_seed_100_players.js";
import type * as migrations_20260522_seed_members from "../migrations/20260522_seed_members.js";
import type * as migrations_20260522_seed_members_mutations from "../migrations/20260522_seed_members_mutations.js";
import type * as migrations_20260522_upgrade_to_super_admin from "../migrations/20260522_upgrade_to_super_admin.js";
import type * as migrations_20260526_remove_seeded_courses from "../migrations/20260526_remove_seeded_courses.js";
import type * as migrations_20260605_seed_pondok_indah_holes from "../migrations/20260605_seed_pondok_indah_holes.js";
import type * as mutations_broadcast_comments from "../mutations/broadcast_comments.js";
import type * as mutations_golf_courses from "../mutations/golf_courses.js";
import type * as mutations_handicap from "../mutations/handicap.js";
import type * as mutations_leaderboard from "../mutations/leaderboard.js";
import type * as mutations_matches from "../mutations/matches.js";
import type * as mutations_notifications from "../mutations/notifications.js";
import type * as mutations_players from "../mutations/players.js";
import type * as mutations_running_texts from "../mutations/running_texts.js";
import type * as mutations_scorecards from "../mutations/scorecards.js";
import type * as mutations_tee_times from "../mutations/tee_times.js";
import type * as mutations_tournaments from "../mutations/tournaments.js";
import type * as mutations_users from "../mutations/users.js";
import type * as queries_broadcast_comments from "../queries/broadcast_comments.js";
import type * as queries_dashboard from "../queries/dashboard.js";
import type * as queries_golf_courses from "../queries/golf_courses.js";
import type * as queries_leaderboard from "../queries/leaderboard.js";
import type * as queries_matches from "../queries/matches.js";
import type * as queries_notifications from "../queries/notifications.js";
import type * as queries_players from "../queries/players.js";
import type * as queries_running_texts from "../queries/running_texts.js";
import type * as queries_scorecards from "../queries/scorecards.js";
import type * as queries_tee_times from "../queries/tee_times.js";
import type * as queries_tournaments from "../queries/tournaments.js";
import type * as queries_users from "../queries/users.js";
import type * as subscriptions_holeProgress from "../subscriptions/holeProgress.js";
import type * as subscriptions_leaderboard from "../subscriptions/leaderboard.js";
import type * as subscriptions_liveScoring from "../subscriptions/liveScoring.js";
import type * as subscriptions_matches from "../subscriptions/matches.js";
import type * as subscriptions_matchplay from "../subscriptions/matchplay.js";
import type * as subscriptions_rounds from "../subscriptions/rounds.js";
import type * as subscriptions_scorecards from "../subscriptions/scorecards.js";
import type * as subscriptions_tee_times from "../subscriptions/tee_times.js";
import type * as types from "../types.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  HANDICAP_CATEGORY_GUIDE: typeof HANDICAP_CATEGORY_GUIDE;
  MATCH_PLAY_TEAM_SCORING_GUIDE: typeof MATCH_PLAY_TEAM_SCORING_GUIDE;
  REAL_TIME_SCORING_GUIDE: typeof REAL_TIME_SCORING_GUIDE;
  "auth/admin": typeof auth_admin;
  "auth/changePassword": typeof auth_changePassword;
  "auth/constants": typeof auth_constants;
  "auth/helpers": typeof auth_helpers;
  "auth/jwt": typeof auth_jwt;
  "auth/login": typeof auth_login;
  "auth/logout": typeof auth_logout;
  "auth/password": typeof auth_password;
  "auth/refresh": typeof auth_refresh;
  "auth/register": typeof auth_register;
  "auth/roles": typeof auth_roles;
  "auth/validate": typeof auth_validate;
  crons: typeof crons;
  http: typeof http;
  "lib/handicap": typeof lib_handicap;
  "lib/matchplay": typeof lib_matchplay;
  "lib/ranking": typeof lib_ranking;
  "lib/scoring": typeof lib_scoring;
  "lib/teamScoring": typeof lib_teamScoring;
  "migrations/20260512_initial_seed": typeof migrations_20260512_initial_seed;
  "migrations/20260516_schema_v1": typeof migrations_20260516_schema_v1;
  "migrations/20260518_reset_dev_password": typeof migrations_20260518_reset_dev_password;
  "migrations/20260518_reset_dev_password_mutations": typeof migrations_20260518_reset_dev_password_mutations;
  "migrations/20260522_seed_100_players": typeof migrations_20260522_seed_100_players;
  "migrations/20260522_seed_members": typeof migrations_20260522_seed_members;
  "migrations/20260522_seed_members_mutations": typeof migrations_20260522_seed_members_mutations;
  "migrations/20260522_upgrade_to_super_admin": typeof migrations_20260522_upgrade_to_super_admin;
  "migrations/20260526_remove_seeded_courses": typeof migrations_20260526_remove_seeded_courses;
  "migrations/20260605_seed_pondok_indah_holes": typeof migrations_20260605_seed_pondok_indah_holes;
  "mutations/broadcast_comments": typeof mutations_broadcast_comments;
  "mutations/golf_courses": typeof mutations_golf_courses;
  "mutations/handicap": typeof mutations_handicap;
  "mutations/leaderboard": typeof mutations_leaderboard;
  "mutations/matches": typeof mutations_matches;
  "mutations/notifications": typeof mutations_notifications;
  "mutations/players": typeof mutations_players;
  "mutations/running_texts": typeof mutations_running_texts;
  "mutations/scorecards": typeof mutations_scorecards;
  "mutations/tee_times": typeof mutations_tee_times;
  "mutations/tournaments": typeof mutations_tournaments;
  "mutations/users": typeof mutations_users;
  "queries/broadcast_comments": typeof queries_broadcast_comments;
  "queries/dashboard": typeof queries_dashboard;
  "queries/golf_courses": typeof queries_golf_courses;
  "queries/leaderboard": typeof queries_leaderboard;
  "queries/matches": typeof queries_matches;
  "queries/notifications": typeof queries_notifications;
  "queries/players": typeof queries_players;
  "queries/running_texts": typeof queries_running_texts;
  "queries/scorecards": typeof queries_scorecards;
  "queries/tee_times": typeof queries_tee_times;
  "queries/tournaments": typeof queries_tournaments;
  "queries/users": typeof queries_users;
  "subscriptions/holeProgress": typeof subscriptions_holeProgress;
  "subscriptions/leaderboard": typeof subscriptions_leaderboard;
  "subscriptions/liveScoring": typeof subscriptions_liveScoring;
  "subscriptions/matches": typeof subscriptions_matches;
  "subscriptions/matchplay": typeof subscriptions_matchplay;
  "subscriptions/rounds": typeof subscriptions_rounds;
  "subscriptions/scorecards": typeof subscriptions_scorecards;
  "subscriptions/tee_times": typeof subscriptions_tee_times;
  types: typeof types;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
