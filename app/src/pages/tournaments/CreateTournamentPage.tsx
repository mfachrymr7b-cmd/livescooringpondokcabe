import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CalendarDays, Clock, Flag, Trophy } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfCourse } from "@/modules/convex/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/authStore";

const GAME_MODES = [
  { value: "stroke_play", label: "Stroke Play" },
  { value: "match_play", label: "Match Play" },
  { value: "stableford", label: "Stableford" },
  { value: "scramble", label: "Scramble" },
  { value: "best_ball", label: "Best Ball" },
  { value: "skins", label: "Skins" },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toTimestamp(date: string, time = "00:00") {
  return new Date(`${date}T${time}:00`).getTime();
}

function dayBefore(date: string) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() - 1);
  return value.getTime();
}

export function CreateTournamentPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const coursesResult = useQuery(api.queries.golf_courses.listActive, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const createTournament = useMutation(api.mutations.tournaments.create);
  const createMatch = useMutation(api.mutations.tournaments.createMatch);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: "",
    date: today,
    courseId: "",
    gameMode: "stroke_play",
    maxPlayer: "72",
    teeStart: "07:00",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courses = useMemo(
    () => (coursesResult?.page as GolfCourse[] | undefined) ?? [],
    [coursesResult]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.date || !form.courseId) {
      setError("Nama turnamen, tanggal, dan lapangan wajib diisi.");
      return;
    }

    if (!user?.id) {
      setError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsSubmitting(true);
    try {
      const course = courses.find((item) => item._id === form.courseId);
      const tournamentId = await createTournament({
        name: form.name.trim(),
        slug: `${slugify(form.name)}-${Date.now().toString(36)}`,
        description: form.description.trim() || undefined,
        courseId: form.courseId as Id<"golf_courses">,
        format: form.gameMode as "stroke_play",
        totalRounds: 1,
        holesPerRound: course?.totalHoles ?? 18,
        useHandicap: true,
        maxParticipants: Number(form.maxPlayer) || undefined,
        registrationOpenAt: Date.now(),
        registrationCloseAt: dayBefore(form.date),
        startDate: toTimestamp(form.date, form.teeStart),
        endDate: toTimestamp(form.date, "18:00"),
        organizerId: user.id as Id<"users">,
      });

      await createMatch({
        tournamentId,
        courseId: form.courseId as Id<"golf_courses">,
        roundNumber: 1,
        flightName: "Round 1",
        scheduledDate: toTimestamp(form.date, form.teeStart),
        holesPlayed: course?.totalHoles ?? 18,
        startingHole: 1,
        notes: `Tee start ${form.teeStart}`,
        userId: user.id,
      });

      navigate(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat turnamen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (coursesResult === undefined) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/tournaments" aria-label="Kembali ke turnamen">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Buat Turnamen"
          description="Setup jadwal, lapangan, format permainan, dan kapasitas pemain."
        />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Informasi Turnamen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Jakarta Golf Open"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teeStart">Tee Start</Label>
                <Input
                  id="teeStart"
                  type="time"
                  value={form.teeStart}
                  onChange={(event) => setForm((prev) => ({ ...prev, teeStart: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="course">Golf Course</Label>
                <select
                  id="course"
                  value={form.courseId}
                  onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
                  className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  <option value="">Pilih lapangan</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameMode">Game Mode</Label>
                <select
                  id="gameMode"
                  value={form.gameMode}
                  onChange={(event) => setForm((prev) => ({ ...prev, gameMode: event.target.value }))}
                  className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  {GAME_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPlayer">Max Player</Label>
              <Input
                id="maxPlayer"
                type="number"
                min={1}
                value={form.maxPlayer}
                onChange={(event) => setForm((prev) => ({ ...prev, maxPlayer: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Catatan format, sponsor, atau aturan singkat."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline">
                <Link to="/tournaments">Batal</Link>
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Buat Turnamen
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-green-700" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Dashboard siap dipakai</p>
                <p className="text-xs text-zinc-500">Detail turnamen akan berisi registration, flight, dan tee time.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-blue-700" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">{form.date || "Tanggal belum dipilih"}</p>
                <p className="text-xs text-zinc-500">Tanggal utama turnamen</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">{form.teeStart}</p>
                <p className="text-xs text-zinc-500">Tee start round pertama</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-zinc-700" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {courses.find((course) => course._id === form.courseId)?.name ?? "Golf Course"}
                </p>
                <p className="text-xs text-zinc-500">Lapangan yang dipakai</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
