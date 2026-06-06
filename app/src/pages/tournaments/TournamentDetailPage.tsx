import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BarChart2,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  Play,
  Plus,
  Radio,
  Search,
  Swords,
  Trash2,
  Users,
  Flag,
  ChevronUp,
} from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfCourse, Player, Tournament } from "@/modules/convex/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/Modal";
import { formatDate } from "@/utils";
import { LiveLeaderboardPreview } from "@/components/scoring/LiveLeaderboardPreview";
import { MatchStatusBadge } from "@/components/scoring/MatchStatusBadge";
import { RoundSummaryPanel } from "@/components/scoring/RoundSummaryPanel";
import { useAuthStore } from "@/store/authStore";

type AppUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  displayName?: string;
  handicapIndex?: number;
  handicapCategory?: string;
};

type Match = {
  _id: Id<"matches">;
  roundNumber: number;
  flightName?: string;
  scheduledDate: number;
  holesPlayed: number;
  startingHole: number;
  status: string;
  winnerPlayerId?: Id<"players">;
  matchResult?: string;
};

type TeeTime = {
  _id: Id<"tee_times">;
  roundNumber: number;
  scheduledTime: number;
  startingHole: number;
  status: string;
  groupName?: string;
  maxPlayers: number;
  notes?: string;
};

type ImportedPlayer = {
  name: string;
  email: string;
  handicap?: string;
};

const formatLabel: Record<string, string> = {
  stroke_play: "Stroke Play",
  match_play: "Match Play",
  stableford: "Stableford",
  scramble: "Scramble",
  best_ball: "Best Ball",
  skins: "Skins",
};

const handicapCategories = [
  { value: "", label: "Auto / kosong" },
  { value: "scratch", label: "Scratch" },
  { value: "category_1", label: "Category 1 - Elit (< 5.5)" },
  { value: "category_2", label: "Category 2 - Lanjut (5.5 - 12.4)" },
  { value: "category_3", label: "Category 3 - Menengah (12.5 - 18.4)" },
  { value: "category_4", label: "Category 4 - Rekreasi (18.5 - 26.4)" },
  { value: "category_5", label: "Category 5 - Amatir (26.5 - 36.0)" },
  { value: "category_6", label: "Category 6 - Pemula (37.0 - 54.0)" },
];

function toDatetimeLocal(value: number) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function chunkPlayers(players: Player[], size: number) {
  const groups: Player[][] = [];
  for (let index = 0; index < players.length; index += size) {
    groups.push(players.slice(index, index + size));
  }
  return groups;
}

function parseImportedPlayers(text: string): ImportedPlayer[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return rows.slice(1, 51).map((row) => {
    const columns = row.split(row.includes("\t") ? "\t" : ",").map((item) => item.trim());
    return {
      name: columns[0] ?? "",
      email: columns[1] ?? "",
      handicap: columns[2] ?? "",
    };
  });
}

export function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const id = tournamentId ? (tournamentId as Id<"tournaments">) : undefined;
  const { user } = useAuthStore();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [groupSize, setGroupSize] = useState(4);
  const [groupPrefix, setGroupPrefix] = useState("Flight");
  const [isGeneratingFlights, setIsGeneratingFlights] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [flightSuccess, setFlightSuccess] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<ImportedPlayer[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRound] = useState(1);
  const [teeForm, setTeeForm] = useState({
    matchId: "",
    groupName: "Flight A",
    scheduledTime: "",
    startingHole: "1",
    maxPlayers: "4",
    notes: "",
  });
  const [teeError, setTeeError] = useState<string | null>(null);
  const [isCreatingTee, setIsCreatingTee] = useState(false);

  // State untuk form buat match/round
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState({
    roundNumber: "1",
    flightName: "",
    scheduledDate: "",
    holesPlayed: "",
    startingHole: "1",
    notes: "",
  });
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  const tournament = useQuery(api.queries.tournaments.get, id ? { id } : "skip") as Tournament | null | undefined;
  const course = useQuery(
    api.queries.golf_courses.get,
    tournament ? { id: tournament.courseId as Id<"golf_courses"> } : "skip"
  ) as GolfCourse | null | undefined;
  const playersResult = useQuery(api.queries.players.listByTournament, id ? {
    tournamentId: id,
    paginationOpts: { numItems: 200, cursor: null },
  } : "skip");
  const matches = useQuery(api.queries.tournaments.getMatches, id ? { tournamentId: id } : "skip") as Match[] | undefined;
  const teeTimes = useQuery(api.queries.tee_times.listByRound, id ? {
    tournamentId: id,
    roundNumber: selectedRound,
  } : "skip") as TeeTime[] | undefined;
  const usersResult = useQuery(api.queries.users.listByRoleAndStatus, {
    role: "player",
    status: "active",
    paginationOpts: { numItems: 200, cursor: null },
  });

  const createTeeTime = useMutation(api.mutations.tee_times.create);
  const generateFlights = useMutation(api.mutations.tournaments.generateFlights);
  const registerPlayer = useMutation(api.mutations.players.register);
  const createMatch = useMutation(api.mutations.tournaments.createMatch);
  const updateTournamentStatus = useMutation(api.mutations.tournaments.updateStatus);
  const deleteTournamentMutation = useMutation(api.mutations.tournaments.deleteTournament);
  const updateTournament = useMutation(api.mutations.tournaments.update);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tournament) return;
    setScheduleStart(toDatetimeLocal(tournament.startDate));
    setScheduleEnd(toDatetimeLocal(tournament.endDate));
  }, [tournament]);

  const players = useMemo(
    () => (playersResult?.page as Player[] | undefined) ?? [],
    [playersResult]
  );
  const appUsers = useMemo(
    () => (usersResult?.page as AppUser[] | undefined) ?? [],
    [usersResult]
  );
  const filteredPlayers = useMemo(() => {
    const term = playerSearch.trim().toLowerCase();
    if (!term) return players;
    return players.filter((player) =>
      [player.displayName, player.bibNumber, String(player.handicapIndex ?? "")]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [playerSearch, players]);
  const groupedPlayers = useMemo(
    () => chunkPlayers(filteredPlayers, groupSize),
    [filteredPlayers, groupSize]
  );

  async function handleImportFile(file: File | undefined) {
    setImportMessage(null);
    if (!file) return;

    if (file.name.endsWith(".csv") || file.name.endsWith(".tsv")) {
      const text = await file.text();
      const rows = parseImportedPlayers(text);
      setImportRows(rows);
      setImportMessage(`${rows.length} baris berhasil dibaca dari ${file.name}.`);
      return;
    }

    setImportRows([]);
    setImportMessage(`${file.name} dipilih. Preview otomatis tersedia untuk CSV/TSV; file Excel siap diteruskan ke proses import backend.`);
  }

  async function handleImportPlayers() {
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportMessage(null);
    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const row of importRows) {
      if (!row.name.trim()) { skipCount++; continue; }
      // Cari user berdasarkan nama (case-insensitive match)
      const matchedUser = usersResult?.page?.find(
        (u) => (u.displayName ?? u.name).toLowerCase() === row.name.trim().toLowerCase()
      );
      if (!matchedUser) { skipCount++; continue; }
      try {
        await registerPlayer({
          tournamentId: id!,
          userId: matchedUser._id as Id<"users">,
          displayName: row.name.trim(),
          handicapIndex: row.handicap ? Number(row.handicap) : undefined,
        });
        successCount++;
      } catch {
        errors.push(row.name);
      }
    }

    const parts = [`${successCount} player berhasil diimport`];
    if (skipCount > 0) parts.push(`${skipCount} dilewati (tidak ditemukan)`);
    if (errors.length > 0) parts.push(`${errors.length} gagal`);
    setImportMessage(parts.join(", ") + ".");
    if (successCount > 0) setImportRows([]);
    setIsImporting(false);
  }

  async function handleGenerateFlights() {
    if (players.length === 0) return;
    if (!user?.id) {
      setFlightError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    setFlightError(null);
    setFlightSuccess(null);
    setIsGeneratingFlights(true);
    const firstMatch = matches?.[0];
    try {
      const result = await generateFlights({
        tournamentId: id!,
        matchId: firstMatch?._id,
        roundNumber: firstMatch?.roundNumber ?? 1,
        maxPlayersPerFlight: groupSize,
        namePrefix: groupPrefix || "Flight",
        seedMethod: "registration_order",
        replaceExisting: true,
        userId: user.id,
      });
      setFlightSuccess(
        `${result.flightCount} flight berhasil dibuat dengan ${result.playerCount} player.`
      );
    } catch (err) {
      setFlightError(err instanceof Error ? err.message : "Gagal membuat flight.");
    } finally {
      setIsGeneratingFlights(false);
    }
  }

  async function handleCreateMatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMatchError(null);
    if (!tournament || !course) return;
    if (!user?.id) {
      setMatchError("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsCreatingMatch(true);
    try {
      await createMatch({
        tournamentId: id!,
        courseId: tournament.courseId as Id<"golf_courses">,
        roundNumber: Number(matchForm.roundNumber) || 1,
        flightName: matchForm.flightName.trim() || undefined,
        scheduledDate: matchForm.scheduledDate
          ? new Date(matchForm.scheduledDate).getTime()
          : tournament.startDate,
        holesPlayed: Number(matchForm.holesPlayed) || tournament.holesPerRound,
        startingHole: Number(matchForm.startingHole) || 1,
        notes: matchForm.notes.trim() || undefined,
        userId: user.id,
      });
      setShowMatchForm(false);
      setMatchForm({ roundNumber: "1", flightName: "", scheduledDate: "", holesPlayed: "", startingHole: "1", notes: "" });
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Gagal membuat match.");
    } finally {
      setIsCreatingMatch(false);
    }
  }

  async function changeTournamentStatus(newStatus: string) {
    if (!tournament) return;
    if (!user?.id) {
      setStatusMessage("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    setStatusMessage(null);
    setIsSavingStatus(true);
    try {
      await updateTournamentStatus({ id: id!, status: newStatus as "draft" | "registration_open" | "registration_closed" | "ongoing" | "completed" | "cancelled", userId: user.id });
      setStatusMessage(`Status turnamen diubah menjadi ${newStatus.replace("_", " ")}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Gagal mengubah status turnamen.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleDeleteTournament() {
    if (!tournament || !user?.id) return;
    setIsDeleting(true);
    try {
      await deleteTournamentMutation({ id: id!, userId: user.id });
      navigate("/tournaments");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Gagal menghapus turnamen.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveSchedule() {
    if (!tournament) return;
    if (!user?.id) {
      setStatusMessage("Sesi login tidak ditemukan. Silakan login ulang.");
      return;
    }
    setStatusMessage(null);
    setIsSavingStatus(true);
    try {
      await updateTournament({
        id: id!,
        userId: user.id,
        startDate: new Date(scheduleStart).getTime(),
        endDate: new Date(scheduleEnd).getTime(),
      });
      setStatusMessage("Jadwal turnamen berhasil disimpan.");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Gagal menyimpan jadwal turnamen.");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleCreateTeeTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeeError(null);

    const selectedMatch = matches?.find((match) => match._id === teeForm.matchId) ?? matches?.[0];
    if (!selectedMatch || !tournament) {
      setTeeError("Buat match/round terlebih dahulu sebelum membuat tee time.");
      return;
    }

    setIsCreatingTee(true);
    try {
      await createTeeTime({
        tournamentId: id!,
        matchId: selectedMatch._id,
        roundNumber: selectedMatch.roundNumber,
        scheduledTime: new Date(teeForm.scheduledTime || toDatetimeLocal(tournament.startDate)).getTime(),
        startingHole: Number(teeForm.startingHole) || 1,
        maxPlayers: Number(teeForm.maxPlayers) || 4,
        groupName: teeForm.groupName.trim() || undefined,
        notes: teeForm.notes.trim() || undefined,
      });
      setTeeForm((prev) => ({ ...prev, groupName: "", notes: "" }));
    } catch (err) {
      setTeeError(err instanceof Error ? err.message : "Gagal membuat tee time.");
    } finally {
      setIsCreatingTee(false);
    }
  }

  if (tournament === undefined || playersResult === undefined || matches === undefined || teeTimes === undefined) {
    return <PageSpinner />;
  }
  if (!tournament) return <p className="text-white p-8">Turnamen tidak ditemukan</p>;

  const defaultTeeTime = teeForm.scheduledTime || toDatetimeLocal(tournament.startDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/tournaments" aria-label="Kembali ke turnamen">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
              <Badge variant="secondary">{tournament.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-sm text-emerald-300">
              {formatDate(tournament.startDate)} · {course?.name ?? "Golf Course"} ·{" "}
              {formatLabel[tournament.format] ?? tournament.format}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAddPlayerOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Player
          </Button>
          <Button asChild variant="outline">
            <Link to={`/tournaments/${tournamentId}/leaderboard`}>
              <BarChart2 className="h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/tournaments/${tournamentId}/team-match`}>
              <Swords className="h-4 w-4" />
              Match Play
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/tournaments/${tournamentId}/start-round`}>
              <Play className="h-4 w-4" />
              Mulai Ronde
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/tournaments/${tournamentId}/scorecards`}>
              <ClipboardList className="h-4 w-4" />
              Scorecard Peserta
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Players" value={`${players.length}/${tournament.maxParticipants ?? "-"}`} />
        <MetricCard label="Flights" value={String(Math.max(groupedPlayers.length, 0))} />
        <MetricCard label="Tee Time" value={String(teeTimes.length)} />
        <MetricCard label="Tee Start" value={formatTime(tournament.startDate)} />
      </div>

      <Card className="rounded-lg border border-emerald-600/20 bg-white/95">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Status & Jadwal</CardTitle>
              <p className="text-sm text-emerald-300">Kelola status turnamen dan ubah jadwal mulai/selesai.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusMessage && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-4">
            <Button
              size="sm"
              variant={tournament.status === "registration_open" ? "secondary" : "outline"}
              onClick={() => changeTournamentStatus("registration_open")}
              disabled={isSavingStatus || tournament.status === "registration_open"}
            >
              Buka Registrasi
            </Button>
            <Button
              size="sm"
              variant={tournament.status === "registration_closed" ? "secondary" : "outline"}
              onClick={() => changeTournamentStatus("registration_closed")}
              disabled={isSavingStatus || tournament.status === "registration_closed"}
            >
              Tutup Registrasi
            </Button>
            <Button
              size="sm"
              variant={tournament.status === "ongoing" ? "secondary" : "outline"}
              onClick={() => changeTournamentStatus("ongoing")}
              disabled={isSavingStatus || tournament.status === "ongoing"}
            >
              Mulai Turnamen
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => changeTournamentStatus("completed")}
              disabled={isSavingStatus || tournament.status === "completed"}
            >
              Close Turnamen
            </Button>
          </div>

          {/* Tombol hapus — hanya muncul jika turnamen sudah completed/cancelled */}
          {(tournament.status === "completed" || tournament.status === "cancelled") && (
            <div className="border-t border-red-200 pt-4 mt-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Turnamen Ini
              </Button>
              <p className="mt-1 text-xs text-red-400">
                Menghapus turnamen akan menghapus semua data peserta, scorecard, dan leaderboard secara permanen.
              </p>
            </div>
          )}

          {/* Modal konfirmasi hapus */}
          <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <ModalContent>
              <ModalHeader>
                <ModalTitle>Hapus Turnamen?</ModalTitle>
                <ModalDescription>
                  Tindakan ini tidak dapat dibatalkan. Semua data turnamen <strong>{tournament.name}</strong> termasuk scorecard, leaderboard, dan data peserta akan dihapus permanen.
                </ModalDescription>
              </ModalHeader>
              <ModalFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                  Batal
                </Button>
                <Button variant="destructive" onClick={handleDeleteTournament} loading={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                  Ya, Hapus Sekarang
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduleStart">Mulai Turnamen</Label>
              <Input
                id="scheduleStart"
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleEnd">Selesai Turnamen</Label>
              <Input
                id="scheduleEnd"
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveSchedule}
              disabled={isSavingStatus || !scheduleStart || !scheduleEnd}
            >
              Simpan Jadwal
            </Button>
            <span className="text-sm text-white">Pastikan tanggal/waktu valid sebelum menyimpan.</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <LiveLeaderboardPreview
          tournamentId={id!}
          useHandicap={tournament.useHandicap}
          holesPerRound={tournament.holesPerRound}
        />
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Match Status</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMatchForm((v) => !v)}
                className="gap-1.5 text-xs"
              >
                {showMatchForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {showMatchForm ? "Tutup" : "Buat Round"}
              </Button>
            </div>
            <p className="text-sm text-emerald-300">Status round dan jadwal pertandingan.</p>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Form buat match/round */}
            {showMatchForm && (
              <form onSubmit={handleCreateMatch} className="rounded-xl border border-emerald-600/50 bg-emerald-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Flag className="h-4 w-4 text-emerald-400" />
                  Buat Round / Match Baru
                </p>
                {matchError && (
                  <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                    {matchError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="matchRound">Round Number</Label>
                    <Input
                      id="matchRound"
                      type="number"
                      min={1}
                      max={tournament.totalRounds}
                      value={matchForm.roundNumber}
                      onChange={(e) => setMatchForm((p) => ({ ...p, roundNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="matchFlight">Nama Flight <span className="text-emerald-400 font-normal">(opsional)</span></Label>
                    <Input
                      id="matchFlight"
                      value={matchForm.flightName}
                      onChange={(e) => setMatchForm((p) => ({ ...p, flightName: e.target.value }))}
                      placeholder="Flight A, Grup 1, dll."
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="matchDate">Tanggal & Waktu</Label>
                    <Input
                      id="matchDate"
                      type="datetime-local"
                      value={matchForm.scheduledDate || toDatetimeLocal(tournament.startDate)}
                      onChange={(e) => setMatchForm((p) => ({ ...p, scheduledDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="matchHole">Hole Start</Label>
                    <Input
                      id="matchHole"
                      type="number"
                      min={1}
                      max={18}
                      value={matchForm.startingHole}
                      onChange={(e) => setMatchForm((p) => ({ ...p, startingHole: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="matchHoles">Jumlah Hole</Label>
                  <Input
                    id="matchHoles"
                    type="number"
                    min={1}
                    max={18}
                    value={matchForm.holesPlayed || tournament.holesPerRound}
                    onChange={(e) => setMatchForm((p) => ({ ...p, holesPlayed: e.target.value }))}
                    placeholder={String(tournament.holesPerRound)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" loading={isCreatingMatch} className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    Buat Round
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowMatchForm(false)}>
                    Batal
                  </Button>
                </div>
              </form>
            )}

            {/* Daftar match */}
            {matches.length === 0 && !showMatchForm ? (
              <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 p-5 text-center">
                <Flag className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" />
                <p className="text-sm text-emerald-200 font-medium">Belum ada round/match</p>
                <p className="text-xs text-emerald-400 mt-1">Klik "Buat Round" untuk memulai</p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match._id}
                  className="flex items-center justify-between rounded-lg border border-emerald-600/40 bg-emerald-800/30 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      Round {match.roundNumber}
                      {match.flightName ? ` · ${match.flightName}` : ""}
                    </p>
                    <p className="text-xs text-emerald-300">
                      {formatDate(match.scheduledDate)} · Hole {match.startingHole} · {match.holesPlayed} holes
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {match.matchResult && (
                      <Badge variant="blue">{match.matchResult}</Badge>
                    )}
                    <MatchStatusBadge status={match.status} />
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-emerald-300 hover:text-white">
                      <Link to={`/tournaments/${tournamentId}/matches/${match._id}/scoring`}>
                        <Radio className="h-3 w-3" />
                        Live Scoring
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <RoundSummaryPanel tournamentId={id!} roundNumber={1} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Player Registration</CardTitle>
              <p className="text-sm text-emerald-300">Search player, add player, dan cek handicap peserta.</p>
            </div>
            <Button variant="outline" onClick={() => setAddPlayerOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Player
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <Input
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                className="pl-9"
                placeholder="Search player, bib, atau handicap..."
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-emerald-600/40">
              <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] bg-emerald-800/50 px-3 py-2 text-xs font-semibold text-emerald-300">
                <span>Player</span>
                <span>Handicap</span>
                <span>Status</span>
              </div>
              {filteredPlayers.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-emerald-300">Belum ada player terdaftar.</div>
              ) : (
                filteredPlayers.map((player) => (
                  <div
                    key={player._id}
                    className="grid grid-cols-[1.2fr_0.7fr_0.7fr] items-center border-t border-emerald-700/40 px-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{player.displayName}</p>
                      <p className="text-xs text-emerald-300">{player.bibNumber ?? "No bib"}</p>
                    </div>
                    <span className="text-emerald-100">{player.handicapIndex ?? "-"}</span>
                    <Badge variant={player.status === "confirmed" ? "default" : "secondary"}>
                      {player.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Import Player Excel</CardTitle>
            <p className="text-sm text-emerald-300">Upload `.xlsx`, `.xls`, `.csv`, atau `.tsv` dari daftar pemain.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-600/50 bg-emerald-800/30 px-4 py-6 text-center hover:bg-emerald-800/50">
              <FileSpreadsheet className="mb-2 h-8 w-8 text-emerald-400" />
              <span className="text-sm font-medium text-white">Pilih file player</span>
              <span className="mt-1 text-xs text-emerald-300">Kolom CSV/TSV: name, email, handicap</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="sr-only"
                onChange={(event) => void handleImportFile(event.target.files?.[0])}
              />
            </label>
            {importMessage && (
              <p className={`text-sm ${importMessage.includes("berhasil") ? "text-emerald-300" : "text-emerald-200"}`}>
                {importMessage}
              </p>
            )}
            {importRows.length > 0 && (
              <>
                <div className="max-h-48 overflow-auto rounded-lg border border-emerald-600/40">
                  {importRows.map((row, index) => (
                    <div key={`${row.email}-${index}`} className="grid grid-cols-[1fr_1fr_80px] gap-2 border-t border-emerald-700/40 px-3 py-2 text-xs first:border-t-0">
                      <span className="truncate font-medium text-white">{row.name}</span>
                      <span className="truncate text-emerald-300">{row.email}</span>
                      <span className="text-emerald-300">{row.handicap || "-"}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  loading={isImporting}
                  onClick={() => void handleImportPlayers()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import {importRows.length} Player ke Turnamen
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle>Flight Grouping</CardTitle>
              <p className="text-sm text-emerald-300">Group player berdasarkan daftar yang sudah terdaftar.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={groupPrefix}
                onChange={(event) => setGroupPrefix(event.target.value)}
                className="w-28"
                aria-label="Nama group"
              />
              <Input
                type="number"
                min={2}
                max={6}
                value={groupSize}
                onChange={(event) => setGroupSize(Number(event.target.value) || 4)}
                className="w-20"
                aria-label="Ukuran group"
              />
              <Button
                variant="outline"
                loading={isGeneratingFlights}
                disabled={players.length === 0 || isGeneratingFlights}
                onClick={() => void handleGenerateFlights()}
              >
                <Users className="h-4 w-4" />
                Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {flightError && (
              <div className="mb-3 rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                {flightError}
              </div>
            )}
            {flightSuccess && (
              <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-800/50 px-3 py-2 text-sm text-emerald-200">
                ✓ {flightSuccess}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {groupedPlayers.length === 0 ? (
                <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 p-6 text-center text-sm text-emerald-300 md:col-span-2">
                  Belum ada player untuk digroup.
                </div>
              ) : (
                groupedPlayers.map((group, index) => (
                  <div key={`${groupPrefix}-${index}`} className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold text-white">
                        {groupPrefix || "Flight"} {String.fromCharCode(65 + index)}
                      </p>
                      <Badge variant="outline">{group.length}/{groupSize}</Badge>
                    </div>
                    <div className="space-y-2">
                      {group.map((player) => (
                        <div key={player._id} className="flex items-center justify-between rounded-md bg-emerald-900/40 px-3 py-2 text-sm text-white">
                          <span className="truncate font-medium text-white">{player.displayName}</span>
                          <span className="text-xs text-emerald-200">HCP {player.handicapIndex ?? "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Tee Time</CardTitle>
            <p className="text-sm text-emerald-300">Buat jadwal tee time per group/flight.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateTeeTime} className="space-y-3">
              {teeError && (
                <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                  {teeError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="match">Round</Label>
                  <select
                    id="match"
                    value={teeForm.matchId || matches[0]?._id || ""}
                    onChange={(event) => setTeeForm((prev) => ({ ...prev, matchId: event.target.value }))}
                    className="flex h-9 w-full appearance-none rounded-md border border-emerald-600/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ backgroundColor: "#065F46", color: "#ECFDF5" }}
                  >
                    {matches.map((match) => (
                      <option key={match._id} value={match._id} style={{ backgroundColor: "#064e3b", color: "#ECFDF5" }}>
                        Round {match.roundNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group</Label>
                  <Input
                    id="groupName"
                    value={teeForm.groupName}
                    onChange={(event) => setTeeForm((prev) => ({ ...prev, groupName: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="scheduledTime">Tee Start</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    value={defaultTeeTime}
                    onChange={(event) => setTeeForm((prev) => ({ ...prev, scheduledTime: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startingHole">Hole</Label>
                  <Input
                    id="startingHole"
                    type="number"
                    min={1}
                    max={18}
                    value={teeForm.startingHole}
                    onChange={(event) => setTeeForm((prev) => ({ ...prev, startingHole: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={teeForm.notes}
                  onChange={(event) => setTeeForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Marshal, starter, atau info grouping."
                />
              </div>
              <Button type="submit" loading={isCreatingTee} disabled={matches.length === 0}>
                <CalendarClock className="h-4 w-4" />
                Simpan Tee Time
              </Button>
            </form>

            <div className="space-y-2">
              {teeTimes.length === 0 ? (
                <div className="rounded-lg border border-emerald-600/40 bg-emerald-800/30 p-5 text-center text-sm text-emerald-300">
                  Belum ada tee time.
                </div>
              ) : (
                teeTimes.map((teeTime) => (
                  <div key={teeTime._id} className="flex items-center justify-between rounded-lg border border-emerald-600/40 bg-emerald-800/30 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {teeTime.groupName ?? "Group"} · Hole {teeTime.startingHole}
                      </p>
                      <p className="text-xs text-emerald-300">{formatDate(teeTime.scheduledTime)} · {formatTime(teeTime.scheduledTime)}</p>
                    </div>
                    <Badge variant="secondary">{teeTime.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddPlayerModal
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        tournamentId={id!}
        users={appUsers}
        registeredUserIds={new Set(players.map((player) => player.userId))}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-700/50 bg-emerald-800/40 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-emerald-300">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function AddPlayerModal({
  open,
  onOpenChange,
  tournamentId,
  users,
  registeredUserIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: Id<"tournaments">;
  users: AppUser[];
  registeredUserIds: Set<string>;
}) {
  const registerPlayer = useMutation(api.mutations.players.register);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handicapIndex, setHandicapIndex] = useState("");
  const [handicapCategory, setHandicapCategory] = useState("");
  const [bibNumber, setBibNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((user) => !registeredUserIds.has(user._id))
      .filter((user) => {
        if (!term) return true;
        return [user.name, user.displayName, user.email].join(" ").toLowerCase().includes(term);
      });
  }, [registeredUserIds, search, users]);

  function handleSelectUser(userId: string) {
    const user = users.find((item) => item._id === userId);
    setSelectedUserId(userId);
    setDisplayName(user?.displayName || user?.name || "");
    setHandicapIndex(user?.handicapIndex !== undefined ? String(user.handicapIndex) : "");
    setHandicapCategory(user?.handicapCategory ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedUserId || !displayName.trim()) {
      setError("Pilih player dan isi display name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerPlayer({
        tournamentId,
        userId: selectedUserId as Id<"users">,
        displayName: displayName.trim(),
        handicapIndex: handicapIndex ? Number(handicapIndex) : undefined,
        handicapCategory: handicapCategory
          ? (handicapCategory as "scratch")
          : undefined,
        bibNumber: bibNumber.trim() || undefined,
      });
      onOpenChange(false);
      setSelectedUserId("");
      setDisplayName("");
      setHandicapIndex("");
      setHandicapCategory("");
      setBibNumber("");
      setSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan player.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>Add Player</ModalTitle>
          <ModalDescription>Search player, isi handicap form, lalu tambahkan ke turnamen.</ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="searchPlayer">Search Player</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <Input
                id="searchPlayer"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Cari nama atau email player..."
              />
            </div>
          </div>

          <div className="max-h-44 overflow-auto rounded-lg border border-emerald-600/40">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-emerald-300">Tidak ada player tersedia.</div>
            ) : (
              availableUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => handleSelectUser(user._id)}
                  className={`flex w-full items-center justify-between border-t border-emerald-700/40 px-3 py-2 text-left text-sm first:border-t-0 transition-colors ${
                    selectedUserId === user._id
                      ? "bg-emerald-600/50"
                      : "bg-emerald-800/20 hover:bg-emerald-700/30"
                  }`}
                >
                  <span>
                    <span className="block font-medium text-white">{user.displayName || user.name}</span>
                    <span className="block text-xs text-emerald-300">{user.email}</span>
                  </span>
                  <span className="text-xs text-emerald-300">HCP {user.handicapIndex ?? "-"}</span>
                </button>
              ))
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bibNumber">Bib Number</Label>
              <Input
                id="bibNumber"
                value={bibNumber}
                onChange={(event) => setBibNumber(event.target.value)}
                placeholder="A-001"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="handicapIndex">Handicap Form</Label>
              <Input
                id="handicapIndex"
                type="number"
                step="0.1"
                value={handicapIndex}
                onChange={(event) => setHandicapIndex(event.target.value)}
                placeholder="12.4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handicapCategory">Handicap Category</Label>
              <select
                id="handicapCategory"
                value={handicapCategory}
                onChange={(event) => setHandicapCategory(event.target.value)}
                className="flex h-9 w-full appearance-none rounded-md border border-emerald-600/50 bg-emerald-800/60 px-3 py-1 text-sm text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{ backgroundColor: "#065F46", color: "#ECFDF5" }}
              >
                {handicapCategories.map((category) => (
                  <option key={category.value} value={category.value} style={{ backgroundColor: "#064e3b", color: "#ECFDF5" }}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Tambah Player
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
