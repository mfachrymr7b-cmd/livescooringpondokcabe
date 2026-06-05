import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Flag, Plus, Trophy, Users } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Tournament } from "@/modules/convex/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDate } from "@/utils";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  registration_open: "Pendaftaran",
  registration_closed: "Ditutup",
  ongoing: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusVariant: Record<string, "default" | "secondary" | "blue" | "amber" | "destructive"> = {
  ongoing: "default",
  registration_open: "blue",
  registration_closed: "amber",
  completed: "secondary",
  draft: "secondary",
  cancelled: "destructive",
};

export function TournamentsPage() {
  const tournaments = useQuery(api.queries.tournaments.listAll, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  if (tournaments === undefined) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournament Dashboard"
        description="Kelola turnamen, peserta, flight grouping, dan tee time."
        action={
          <Button asChild>
            <Link to="/tournaments/create">
              <Plus className="h-4 w-4" />
              Buat Turnamen
            </Link>
          </Button>
        }
      />

      {tournaments.page.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-8 w-8" />}
          title="Belum ada turnamen"
          description="Buat turnamen pertama untuk mulai mengatur registrasi pemain dan tee time."
          action={
            <Button asChild size="sm">
              <Link to="/tournaments/create">
                <Plus className="h-4 w-4" />
                Buat Turnamen
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.page.map((t: Tournament) => (
            <Link
              key={t._id}
              to={`/tournaments/${t._id}`}
              className="block transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Card className="h-full rounded-lg">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600/50">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-emerald-200">{formatDate(t.startDate)}</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-300" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-emerald-700/40 p-2">
                      <CalendarDays className="mb-1 h-3.5 w-3.5 text-emerald-300" />
                      <p className="font-semibold text-white">{t.totalRounds}</p>
                      <p className="text-emerald-200">Round</p>
                    </div>
                    <div className="rounded-md bg-emerald-700/40 p-2">
                      <Users className="mb-1 h-3.5 w-3.5 text-emerald-300" />
                      <p className="font-semibold text-white">
                        {t.participantCount}/{t.maxParticipants ?? "-"}
                      </p>
                      <p className="text-emerald-200">Player</p>
                    </div>
                    <div className="rounded-md bg-emerald-700/40 p-2">
                      <Flag className="mb-1 h-3.5 w-3.5 text-emerald-300" />
                      <p className="truncate font-semibold capitalize text-white">
                        {t.format.replace("_", " ")}
                      </p>
                      <p className="text-emerald-200">Mode</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={statusVariant[t.status] ?? "secondary"}>
                      {statusLabel[t.status] ?? t.status}
                    </Badge>
                    <span className="text-xs font-medium text-emerald-300">Detail</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
