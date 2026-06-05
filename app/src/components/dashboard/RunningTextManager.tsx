/**
 * RunningTextManager — Kelola teks berjalan untuk halaman Live Scoring.
 * Fitur: tambah, edit, hapus, toggle aktif, reorder (naik/turun).
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/modules/convex/api";
import type { Id } from "@/modules/convex/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Megaphone,
} from "lucide-react";

// ─── Preview ticker ────────────────────────────────────────────────────────────

function TickerPreview({ texts }: { texts: string[] }) {
  if (texts.length === 0) return null;
  const combined = texts.join("   ·   ");

  return (
    <div className="overflow-hidden rounded-lg bg-emerald-900/60 border border-emerald-700/50 py-2 px-0">
      <div
        className="whitespace-nowrap text-sm font-medium text-emerald-200 animate-marquee"
        style={{
          display: "inline-block",
          paddingLeft: "100%",
          animation: "marquee 20s linear infinite",
        }}
      >
        {combined}
      </div>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────

type RunningTextRow = {
  id: Id<"running_texts">;
  text: string;
  isActive: boolean;
  order: number;
};

function TextRow({
  item,
  isFirst,
  isLast,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: {
  item: RunningTextRow;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReorder: (dir: "up" | "down") => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-all",
        item.isActive
          ? "border-emerald-600/50 bg-emerald-800/30"
          : "border-emerald-800/40 bg-emerald-900/20 text-slate-600 font-bold"
      )}
    >
      {/* Order arrows */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={() => onReorder("up")}
          disabled={isFirst}
          className="rounded p-0.5 text-emerald-400 hover:bg-emerald-700/40 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Pindah ke atas"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onReorder("down")}
          disabled={isLast}
          className="rounded p-0.5 text-emerald-400 hover:bg-emerald-700/40 disabled:opacity-20 disabled:cursor-not-allowed"
          aria-label="Pindah ke bawah"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#ECFDF5] truncate">{item.text}</p>
        <p className="text-xs text-emerald-400 mt-0.5">Urutan #{item.order}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            "rounded-lg p-1.5 transition-colors",
            item.isActive
              ? "text-emerald-300 hover:bg-emerald-700/40"
              : "text-emerald-600 hover:bg-emerald-800/40"
          )}
          title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
          aria-label={item.isActive ? "Nonaktifkan teks" : "Aktifkan teks"}
        >
          {item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-blue-300 hover:bg-blue-900/30 transition-colors"
          title="Edit"
          aria-label="Edit teks"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-red-400 hover:bg-red-900/30 transition-colors"
          title="Hapus"
          aria-label="Hapus teks"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RunningTextManager() {
  const texts = useQuery(api.queries.running_texts.list) as RunningTextRow[] | undefined;

  const createMutation = useMutation(api.mutations.running_texts.create);
  const updateMutation = useMutation(api.mutations.running_texts.update);
  const toggleMutation = useMutation(api.mutations.running_texts.toggleActive);
  const removeMutation = useMutation(api.mutations.running_texts.remove);
  const reorderMutation = useMutation(api.mutations.running_texts.reorder);

  const [newText, setNewText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<Id<"running_texts"> | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTexts = (texts ?? []).filter((t) => t.isActive).map((t) => t.text);

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await createMutation({ text: newText.trim(), isActive: true });
      setNewText("");
      setIsAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id: Id<"running_texts">) {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await updateMutation({ id, text: editText.trim() });
      setEditingId(null);
      setEditText("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: Id<"running_texts">) {
    await removeMutation({ id });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-400" />
            Running Text Live Score
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </Button>
        </div>
        <p className="text-xs text-emerald-300 mt-1">
          Teks berjalan yang tampil di halaman Live Scoring publik
        </p>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Preview ticker */}
        {activeTexts.length > 0 && (
          <div>
            <p className="text-xs text-emerald-400 mb-1.5 flex items-center gap-1">
              <AlignLeft className="h-3 w-3" />
              Preview (teks aktif)
            </p>
            <TickerPreview texts={activeTexts} />
          </div>
        )}

        {/* Add form */}
        {isAdding && (
          <div className="rounded-xl border border-emerald-600/50 bg-emerald-800/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-300">Teks Baru</p>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Contoh: Selamat datang di Live Scoring Pondokcabe Golf Club!"
              rows={2}
              className="w-full rounded-lg bg-emerald-900/60 border border-emerald-700/50 px-3 py-2 text-sm text-white placeholder-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewText("");
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newText.trim() || saving}
                className="gap-1.5 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewText("");
                }}
                className="gap-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                Batal
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {texts === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-emerald-700/30" />
            ))}
          </div>
        ) : texts.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Megaphone className="h-8 w-8 text-emerald-400/40 mb-2" />
            <p className="text-sm text-emerald-300">Belum ada running text</p>
            <p className="text-xs text-emerald-500 mt-1">
              Klik "Tambah" untuk membuat teks berjalan pertama
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {texts.map((item, idx) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  /* Edit inline */
                  <div className="rounded-xl border border-blue-600/50 bg-blue-900/20 p-3 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-emerald-900/60 border border-emerald-700/50 px-3 py-2 text-sm text-white placeholder-emerald-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit(item.id);
                        }
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditText("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={!editText.trim() || saving}
                        className="gap-1.5 text-xs"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? "Menyimpan..." : "Simpan"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TextRow
                    item={item}
                    isFirst={idx === 0}
                    isLast={idx === texts.length - 1}
                    onToggle={() => toggleMutation({ id: item.id })}
                    onEdit={() => {
                      setEditingId(item.id);
                      setEditText(item.text);
                      setIsAdding(false);
                    }}
                    onDelete={() => handleDelete(item.id)}
                    onReorder={(dir) =>
                      reorderMutation({ id: item.id, direction: dir })
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {(texts?.length ?? 0) > 0 && (
          <p className="text-xs text-emerald-500 text-right">
            {activeTexts.length} aktif · {(texts?.length ?? 0) - activeTexts.length} nonaktif
          </p>
        )}
      </CardContent>
    </Card>
  );
}
