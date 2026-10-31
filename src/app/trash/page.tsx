"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Check,
  Play,
  HardDrive,
  Calendar,
} from "lucide-react";

interface TrashedItem {
  id: number;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  media_type: "image" | "video";
  deleted_at: string;
  days_remaining: number;
  thumbnail_storage_key?: string | null;
}

export default function TrashPage() {
  const [trashItems, setTrashItems] = useState<TrashedItem[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Confirmations
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [permanentConfirmOpen, setPermanentConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        setTrashItems(data.items || []);
        if (data.retentionDays) setRetentionDays(data.retentionDays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === trashItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trashItems.map((i) => i.id)));
    }
  };

  const handleRestore = async (ids: number[]) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: ids }),
      });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((item) => !ids.includes(item.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePermanentDelete = async () => {
    setIsProcessing(true);
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/trash/permanent-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: ids }),
      });
      if (res.ok) {
        setTrashItems((prev) => prev.filter((item) => !ids.includes(item.id)));
        setSelectedIds(new Set());
        setPermanentConfirmOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/trash/empty", { method: "POST" });
      if (res.ok) {
        setTrashItems([]);
        setSelectedIds(new Set());
        setEmptyConfirmOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-zinc-500" />
              Trash
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-normal">
                {trashItems.length} item
              </span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Item di Trash otomatis dihapus permanen setelah {retentionDays} hari
            </p>
          </div>

          {/* Action buttons */}
          {trashItems.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                {selectedIds.size === trashItems.length
                  ? "Batal Pilih Semua"
                  : "Pilih Semua"}
              </button>

              {selectedIds.size > 0 ? (
                <>
                  <button
                    onClick={() => handleRestore(Array.from(selectedIds))}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Pulihkan ({selectedIds.size})</span>
                  </button>
                  <button
                    onClick={() => setPermanentConfirmOpen(true)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Permanen ({selectedIds.size})</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEmptyConfirmOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  Kosongkan Trash
                </button>
              )}
            </div>
          )}
        </header>

        {/* Informational Banner */}
        <div className="p-4 md:px-8 pt-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Perhatian mengenai Kapasitas Storage:</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300 leading-relaxed">
                Media di dalam Trash <strong>tetap dihitung</strong> dalam batas kuota 50 GB hingga dihapus permanen atau kedaluwarsa. Memulihkan media akan mengembalikannya ke galeri dan album semula.
              </p>
            </div>
          </div>
        </div>

        {/* Trash Grid */}
        <div className="p-4 md:p-8 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-xs">Memuat item Trash...</p>
            </div>
          ) : trashItems.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Trash Kosong
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Tidak ada foto atau video yang dihapus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trashItems.map((item) => {
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 cursor-pointer border transition-all duration-200 select-none ${
                      isSelected
                        ? "ring-4 ring-sky-500 ring-offset-2 dark:ring-offset-zinc-950 border-sky-500 scale-[0.98]"
                        : "border-transparent hover:shadow-lg opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${item.id}/thumbnail`}
                      alt={item.original_filename}
                      loading="lazy"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/40"
                          : "bg-black/40 hover:bg-black/70 text-white/70 border border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>

                    {/* Single Restore button top right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore([item.id]);
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/40 hover:bg-sky-600 text-white/80 hover:text-white transition-all"
                      title="Pulihkan media ini"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    {/* Video indicator */}
                    {item.media_type === "video" && (
                      <div className="absolute bottom-7 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px]">
                        <Play className="h-2.5 w-2.5 fill-white" />
                        <span>Video</span>
                      </div>
                    )}

                    {/* Days remaining badge */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/80">
                      <span className="truncate max-w-[80%]">
                        {item.days_remaining} hari tersisa
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal for Permanent Delete */}
      <ConfirmationModal
        isOpen={permanentConfirmOpen}
        title="Hapus Media Secara Permanen?"
        message={`${selectedIds.size} media akan dihapus secara fisik dari server dan tidak dapat dipulihkan kembali. Ruang storage akan dibebaskan.`}
        confirmLabel="Hapus Permanen"
        isDangerous={true}
        isLoading={isProcessing}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermanentConfirmOpen(false)}
      />

      {/* Confirmation Modal for Empty Trash */}
      <ConfirmationModal
        isOpen={emptyConfirmOpen}
        title="Kosongkan Seluruh Trash?"
        message="Seluruh foto dan video di dalam Trash akan dihapus secara permanen dari server lokal. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Kosongkan Semua"
        isDangerous={true}
        isLoading={isProcessing}
        onConfirm={handleEmptyTrash}
        onCancel={() => setEmptyConfirmOpen(false)}
      />
    </div>
  );
}
