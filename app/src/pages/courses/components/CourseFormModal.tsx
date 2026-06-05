import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfCourse } from "@/modules/convex/types";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass a course to edit; omit for create mode */
  course?: GolfCourse | null;
}

type Difficulty = "beginner" | "intermediate" | "advanced" | "championship";

interface FormState {
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  province: string;
  country: string;
  totalHoles: string;
  par: string;
  difficulty: Difficulty;
  clubhouseInfo: string;
  teeInfo: string;
  website: string;
  phone: string;
  courseRating: string;
  slopeRating: string;
  establishedYear: string;
}

interface FormErrors {
  name?: string;
  slug?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  totalHoles?: string;
  par?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Parse combined description string back into its parts.
 * Format: "main desc\n\nClubhouse: ...\n\nTee Info: ..."
 */
function parseDescription(raw: string): {
  description: string;
  clubhouseInfo: string;
  teeInfo: string;
} {
  const parts = raw.split(/\n\n/);
  const mainParts: string[] = [];
  let clubhouseInfo = "";
  let teeInfo = "";

  for (const part of parts) {
    if (part.startsWith("Clubhouse: ")) {
      clubhouseInfo = part.replace("Clubhouse: ", "");
    } else if (part.startsWith("Tee Info: ")) {
      teeInfo = part.replace("Tee Info: ", "");
    } else {
      mainParts.push(part);
    }
  }

  return { description: mainParts.join("\n\n"), clubhouseInfo, teeInfo };
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "championship", label: "Championship" },
];

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  address: "",
  city: "",
  province: "",
  country: "Indonesia",
  totalHoles: "18",
  par: "72",
  difficulty: "intermediate",
  clubhouseInfo: "",
  teeInfo: "",
  website: "",
  phone: "",
  courseRating: "",
  slopeRating: "",
  establishedYear: "",
};

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-white">
      {children}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourseFormModal({ open, onClose, course }: CourseFormModalProps) {
  const isEdit = !!course;

  const createCourse = useMutation(api.mutations.golf_courses.create);
  const updateCourse = useMutation(api.mutations.golf_courses.update);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Populate form when editing
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (course) {
      const parsed = parseDescription(course.description ?? "");
      setForm({
        name: course.name,
        slug: course.slug,
        description: parsed.description,
        address: course.address,
        city: course.city,
        province: course.province,
        country: course.country,
        totalHoles: String(course.totalHoles),
        par: String(course.par),
        difficulty: (course.difficulty as Difficulty) ?? "intermediate",
        clubhouseInfo: parsed.clubhouseInfo,
        teeInfo: parsed.teeInfo,
        website: course.website ?? "",
        phone: course.phone ?? "",
        courseRating: course.courseRating != null ? String(course.courseRating) : "",
        slopeRating: course.slopeRating != null ? String(course.slopeRating) : "",
        establishedYear: course.establishedYear != null ? String(course.establishedYear) : "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
  }, [open, course]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !isEdit) {
        next.slug = toSlug(value);
      }
      return next;
    });
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Nama lapangan wajib diisi";
    if (!form.slug.trim()) errs.slug = "Slug wajib diisi";
    if (!form.address.trim()) errs.address = "Alamat wajib diisi";
    if (!form.city.trim()) errs.city = "Kota wajib diisi";
    if (!form.province.trim()) errs.province = "Provinsi wajib diisi";
    if (!form.country.trim()) errs.country = "Negara wajib diisi";
    const holes = Number(form.totalHoles);
    if (!form.totalHoles || isNaN(holes) || holes < 1) {
      errs.totalHoles = "Total hole harus angka positif";
    }
    const par = Number(form.par);
    if (!form.par || isNaN(par) || par < 1) {
      errs.par = "Par harus angka positif";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError(null);

    // Combine description fields
    const parts: string[] = [];
    if (form.description.trim()) parts.push(form.description.trim());
    if (form.clubhouseInfo.trim()) parts.push(`Clubhouse: ${form.clubhouseInfo.trim()}`);
    if (form.teeInfo.trim()) parts.push(`Tee Info: ${form.teeInfo.trim()}`);
    const combinedDescription = parts.join("\n\n") || undefined;

    const courseRating = form.courseRating ? Number(form.courseRating) : undefined;
    const slopeRating = form.slopeRating ? Number(form.slopeRating) : undefined;
    const establishedYear = form.establishedYear ? Number(form.establishedYear) : undefined;

    try {
      if (isEdit && course) {
        await updateCourse({
          id: course._id as Id<"golf_courses">,
          name: form.name.trim(),
          description: combinedDescription,
          address: form.address.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          difficulty: form.difficulty,
          website: form.website.trim() || undefined,
          phone: form.phone.trim() || undefined,
          courseRating,
          slopeRating,
        });
      } else {
        await createCourse({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: combinedDescription,
          address: form.address.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          country: form.country.trim(),
          totalHoles: Number(form.totalHoles),
          par: Number(form.par),
          difficulty: form.difficulty,
          website: form.website.trim() || undefined,
          phone: form.phone.trim() || undefined,
          courseRating,
          slopeRating,
          establishedYear,
        });
      }
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>{isEdit ? "Edit Lapangan" : "Tambah Lapangan"}</ModalTitle>
          <ModalDescription>
            {isEdit
              ? "Perbarui informasi lapangan golf."
              : "Isi detail lapangan golf baru."}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* ── Identitas ─────────────────────────────────────────────────── */}
          <SectionLabel>Identitas</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nama Lapangan" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Pondok Indah Golf"
              />
            </FormField>
            <FormField
              label="Slug"
              error={errors.slug}
              hint={isEdit ? "Slug tidak bisa diubah" : "Auto-generate dari nama"}
              required
            >
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="pondok-indah-golf"
                disabled={isEdit}
                className={isEdit ? "bg-emerald-900/50 text-emerald-300 opacity-60" : ""}
              />
            </FormField>
          </div>

          <Separator />

          {/* ── Lokasi ────────────────────────────────────────────────────── */}
          <SectionLabel>Lokasi</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Kota" error={errors.city} required>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Jakarta Selatan"
              />
            </FormField>
            <FormField label="Provinsi" error={errors.province} required>
              <Input
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
                placeholder="DKI Jakarta"
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Alamat Lengkap" error={errors.address} required>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Jl. Metro Pondok Indah No. 1"
              />
            </FormField>
            <FormField label="Negara" error={errors.country} required>
              <Input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Indonesia"
              />
            </FormField>
          </div>

          <Separator />

          {/* ── Spesifikasi ───────────────────────────────────────────────── */}
          <SectionLabel>Spesifikasi Lapangan</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Total Hole" error={errors.totalHoles} required>
              <Input
                type="number"
                min={1}
                value={form.totalHoles}
                onChange={(e) => set("totalHoles", e.target.value)}
                placeholder="18"
                disabled={isEdit}
                className={isEdit ? "bg-emerald-900/50 text-emerald-300 opacity-60" : ""}
              />
            </FormField>
            <FormField label="Par" error={errors.par} required>
              <Input
                type="number"
                min={1}
                value={form.par}
                onChange={(e) => set("par", e.target.value)}
                placeholder="72"
              />
            </FormField>
            <FormField label="Tingkat Kesulitan" required>
              <select
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
                className="flex h-9 w-full rounded-md border border-emerald-600/50 bg-emerald-800/40 px-3 py-1 text-sm text-emerald-50 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: "#064e3b", color: "#ecfdf5" }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Course Rating" hint="Contoh: 72.4">
              <Input
                type="number"
                step="0.1"
                min={0}
                value={form.courseRating}
                onChange={(e) => set("courseRating", e.target.value)}
                placeholder="72.4"
              />
            </FormField>
            <FormField label="Slope Rating" hint="Contoh: 130">
              <Input
                type="number"
                min={0}
                value={form.slopeRating}
                onChange={(e) => set("slopeRating", e.target.value)}
                placeholder="130"
              />
            </FormField>
            {!isEdit && (
              <FormField label="Tahun Berdiri">
                <Input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={form.establishedYear}
                  onChange={(e) => set("establishedYear", e.target.value)}
                  placeholder="1990"
                />
              </FormField>
            )}
          </div>

          <Separator />

          {/* ── Deskripsi ─────────────────────────────────────────────────── */}
          <SectionLabel>Deskripsi</SectionLabel>
          <FormField label="Deskripsi Umum">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Deskripsi umum lapangan golf, sejarah, keunggulan, dll."
              rows={3}
            />
          </FormField>

          <FormField
            label="Clubhouse Info"
            hint="Fasilitas clubhouse, restoran, pro shop, locker room, dll."
          >
            <Textarea
              value={form.clubhouseInfo}
              onChange={(e) => set("clubhouseInfo", e.target.value)}
              placeholder="Clubhouse dilengkapi restoran, locker room, pro shop, driving range..."
              rows={2}
            />
          </FormField>

          <FormField
            label="Tee Info"
            hint="Informasi tee box yang tersedia (Black, Blue, White, Yellow, Red)"
          >
            <Textarea
              value={form.teeInfo}
              onChange={(e) => set("teeInfo", e.target.value)}
              placeholder="Tersedia 5 tee box: Black (6800m), Blue (6400m), White (6000m), Yellow (5600m), Red (5200m)..."
              rows={2}
            />
          </FormField>

          <Separator />

          {/* ── Kontak ────────────────────────────────────────────────────── */}
          <SectionLabel>Kontak</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Website">
              <Input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://example.com"
              />
            </FormField>
            <FormField label="Telepon">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+62 21 1234 5678"
              />
            </FormField>
          </div>

          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Simpan Perubahan" : "Tambah Lapangan"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
