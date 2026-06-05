import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import type { GolfHole } from "@/modules/convex/types";
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
import { cn } from "@/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoleEditModalProps {
  open: boolean;
  onClose: () => void;
  hole: GolfHole | null;
}

interface FormState {
  par: string;
  strokeIndex: string;
  distanceBlue: string;
  distanceWhite: string;
  distanceRed: string;
  distanceBlack: string;
  distanceYellow: string;
  description: string;
}

interface FormErrors {
  par?: string;
  strokeIndex?: string;
}

// ─── Tee colour config ────────────────────────────────────────────────────────

const TEE_COLOURS = [
  {
    key: "distanceBlue" as const,
    label: "Blue",
    colour: "text-blue-700",
    ring: "focus-visible:ring-blue-500",
    border: "border-blue-200",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
  },
  {
    key: "distanceWhite" as const,
    label: "White",
    colour: "text-zinc-700",
    ring: "focus-visible:ring-zinc-400",
    border: "border-zinc-200",
    bg: "bg-zinc-50",
    dot: "bg-zinc-300 border border-zinc-400",
  },
  {
    key: "distanceRed" as const,
    label: "Red",
    colour: "text-red-700",
    ring: "focus-visible:ring-red-500",
    border: "border-red-200",
    bg: "bg-red-50",
    dot: "bg-red-500",
  },
  {
    key: "distanceBlack" as const,
    label: "Black",
    colour: "text-zinc-900",
    ring: "focus-visible:ring-zinc-700",
    border: "border-zinc-300",
    bg: "bg-zinc-100",
    dot: "bg-zinc-900",
  },
  {
    key: "distanceYellow" as const,
    label: "Yellow",
    colour: "text-yellow-700",
    ring: "focus-visible:ring-yellow-500",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    dot: "bg-yellow-400",
  },
] as const;

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-white">
      {children}
    </p>
  );
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

interface ImageUploadProps {
  currentUrl?: string | null;
  onUploaded: (storageId: string, previewUrl: string) => void;
  onRemove: () => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}

function ImageUpload({
  currentUrl,
  onUploaded,
  onRemove,
  uploading,
  setUploading,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.mutations.golf_courses.generateUploadUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 5 MB");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload gagal");
      const { storageId } = await res.json() as { storageId: string };
      const previewUrl = URL.createObjectURL(file);
      onUploaded(storageId, previewUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-zinc-200">
          <img
            src={currentUrl}
            alt="Hole preview"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80"
            aria-label="Hapus gambar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-600/50 bg-emerald-800/30 transition-colors hover:border-green-400 hover:bg-emerald-700/30",
            uploading && "pointer-events-none opacity-60"
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          aria-label="Upload gambar hole"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-emerald-400" />
              <p className="text-xs text-white">
                Klik atau drag gambar ke sini
              </p>
              <p className="text-xs text-emerald-300">JPG, PNG, WebP · maks 5 MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploadError && (
        <p role="alert" className="text-xs text-red-600">
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HoleEditModal({ open, onClose, hole }: HoleEditModalProps) {
  const updateHole = useMutation(api.mutations.golf_courses.updateHole);

  const [form, setForm] = useState<FormState>({
    par: "4",
    strokeIndex: "1",
    distanceBlue: "",
    distanceWhite: "",
    distanceRed: "",
    distanceBlack: "",
    distanceYellow: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Image state: storageId to save, previewUrl for display
  const [imageStorageId, setImageStorageId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Populate form when hole changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !hole) return;
    setForm({
      par: String(hole.par),
      strokeIndex: String(hole.strokeIndex),
      distanceBlue: hole.distanceBlue != null ? String(hole.distanceBlue) : "",
      distanceWhite: hole.distanceWhite != null ? String(hole.distanceWhite) : "",
      distanceRed: hole.distanceRed != null ? String(hole.distanceRed) : "",
      distanceBlack: hole.distanceBlack != null ? String(hole.distanceBlack) : "",
      distanceYellow: hole.distanceYellow != null ? String(hole.distanceYellow) : "",
      description: hole.description ?? "",
    });
    setImageStorageId(null);
    setImagePreviewUrl(hole.imageUrl ?? null);
    setImageRemoved(false);
    setErrors({});
    setServerError(null);
  }, [open, hole]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field in errors) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    const par = Number(form.par);
    if (!form.par || isNaN(par) || par < 3 || par > 5) {
      errs.par = "Par harus 3, 4, atau 5";
    }
    const si = Number(form.strokeIndex);
    if (!form.strokeIndex || isNaN(si) || si < 1 || si > 18) {
      errs.strokeIndex = "Handicap index harus antara 1–18";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function parseOptionalNumber(val: string): number | undefined {
    const n = Number(val);
    return val.trim() !== "" && !isNaN(n) && n > 0 ? n : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hole || !validate()) return;

    setLoading(true);
    setServerError(null);

    // Determine imageUrl to save
    let imageUrl: string | null | undefined = undefined;
    if (imageRemoved) {
      imageUrl = null; // clear
    } else if (imageStorageId) {
      imageUrl = imageStorageId; // new upload
    }
    // else: undefined = no change

    try {
      await updateHole({
        id: hole._id as Id<"golf_holes">,
        par: Number(form.par),
        strokeIndex: Number(form.strokeIndex),
        distanceBlue: parseOptionalNumber(form.distanceBlue),
        distanceWhite: parseOptionalNumber(form.distanceWhite),
        distanceRed: parseOptionalNumber(form.distanceRed),
        distanceBlack: parseOptionalNumber(form.distanceBlack),
        distanceYellow: parseOptionalNumber(form.distanceYellow),
        description: form.description.trim() || undefined,
        imageUrl,
      });
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  if (!hole) return null;

  const currentImageUrl = imageRemoved
    ? null
    : imagePreviewUrl;

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Edit Hole {hole.holeNumber}</ModalTitle>
          <ModalDescription>
            Perbarui data par, handicap index, jarak tee, dan gambar hole.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* ── Par & Handicap Index ─────────────────────────────────────── */}
          <SectionLabel>Setup Hole</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Par" error={errors.par} required>
              <div className="flex gap-1">
                {[3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set("par", String(p))}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                      form.par === String(p)
                        ? "border-green-600 bg-green-700 text-white"
                        : "border-emerald-600/50 bg-emerald-800/40 text-white hover:bg-emerald-700/40"
                    )}
                    aria-pressed={form.par === String(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {errors.par && (
                <p className="text-xs text-red-600">{errors.par}</p>
              )}
            </FormField>

            <FormField
              label="Handicap Index"
              hint="Urutan kesulitan (1 = tersulit)"
              error={errors.strokeIndex}
              required
            >
              <Input
                type="number"
                min={1}
                max={18}
                value={form.strokeIndex}
                onChange={(e) => set("strokeIndex", e.target.value)}
                placeholder="1–18"
              />
            </FormField>
          </div>

          <Separator />

          {/* ── Tee Distances ────────────────────────────────────────────── */}
          <SectionLabel>Jarak Tee (meter)</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TEE_COLOURS.map((tee) => (
              <div
                key={tee.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  tee.border,
                  tee.bg
                )}
              >
                {/* Colour dot */}
                <span
                  className={cn("h-3 w-3 flex-shrink-0 rounded-full", tee.dot)}
                  aria-hidden
                />
                <label htmlFor={`tee-${tee.key}`} className={cn("w-12 text-xs font-semibold", tee.colour)}>
                  {tee.label}
                </label>
                <input
                  id={`tee-${tee.key}`}
                  type="number"
                  min={1}
                  value={form[tee.key]}
                  onChange={(e) => set(tee.key, e.target.value)}
                  placeholder="—"
                  className={cn(
                    "h-8 w-full rounded-md border border-transparent bg-emerald-800/40 px-2 text-sm tabular-nums text-white shadow-sm transition-colors placeholder:text-emerald-600/60 focus-visible:outline-none focus-visible:ring-2",
                    tee.ring
                  )}
                  aria-label={`Jarak tee ${tee.label}`}
                />
                <span className="flex-shrink-0 text-xs text-white">m</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* ── Gambar Hole ──────────────────────────────────────────────── */}
          <SectionLabel>Gambar Hole</SectionLabel>
          <ImageUpload
            currentUrl={currentImageUrl}
            onUploaded={(storageId, previewUrl) => {
              setImageStorageId(storageId);
              setImagePreviewUrl(previewUrl);
              setImageRemoved(false);
            }}
            onRemove={() => {
              setImageStorageId(null);
              setImagePreviewUrl(null);
              setImageRemoved(true);
            }}
            uploading={uploading}
            setUploading={setUploading}
          />

          <Separator />

          {/* ── Deskripsi ────────────────────────────────────────────────── */}
          <SectionLabel>Deskripsi</SectionLabel>
          <FormField label="Catatan Hole" hint="Opsional — tips, hazard, layout, dll.">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Hole dengan dog-leg ke kanan, bunker di sisi kiri fairway..."
              rows={3}
            />
          </FormField>

          {serverError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploading}
            >
              Batal
            </Button>
            <Button type="submit" loading={loading} disabled={uploading}>
              {uploading ? "Mengupload..." : "Simpan"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
