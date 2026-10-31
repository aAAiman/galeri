"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Trash2,
  RotateCcw,
  Loader2,
  Check,
  Play,
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
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Trash
            </h1>
            <span className="text-xs text-neutral-500 font-normal">
              • {trashItems.length} item • Dihapus setelah {retentionDays} hari
            </span>
          </div>

          {/* Action buttons */}
          {trashItems.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-md text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                {selectedIds.size === trashItems.length
                  ? "Batal Pilih"
                  : "Pilih Semua"}
              </button>

              {selectedIds.size > 0 ? (
                <>
                  <button
                    onClick={() => handleRestore(Array.from(selectedIds))}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Pulihkan ({selectedIds.size})</span>
                  </button>
                  <button
                    onClick={() => setPermanentConfirmOpen(true)}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                  >
                    Hapus Permanen
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEmptyConfirmOpen(true)}
                  className="px-3 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium cursor-pointer"
                >
                  Kosongkan Trash
                </button>
              )}
            </div>
          )}
        </header>

        {/* Quiet Informational Notice */}
        <div className="px-4 py-2 text-[11px] text-neutral-500 border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/50">
          File di Trash tetap dihitung dalam kuota 50 GB hingga dikosongkan permanen.
        </div>

        {/* Trash Grid */}
        <div className="p-2 sm:p-4 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Memuat Trash...</span>
            </div>
          ) : trashItems.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <p className="text-xs text-neutral-400">Trash kosong</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-1.5">
              {trashItems.map((item) => {
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-pointer select-none transition-transform duration-75 ${
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-black scale-[0.97]"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${item.id}/thumbnail`}
                      alt={item.original_filename}
                      loading="lazy"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-150"
                    />

                    <div className="absolute inset-0 bg-black/20" />

                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={`absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-black/40 hover:bg-black/70 text-white/80 border border-white/40"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Quick Restore */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore([item.id]);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 p-1 rounded bg-black/40 hover:bg-black/80 text-white transition-all cursor-pointer"
                      title="Pulihkan"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    {item.media_type === "video" && (
                      <div className="absolute bottom-5 right-1 flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 text-white text-[9px]">
                        <Play className="h-2.5 w-2.5 fill-white" />
                      </div>
                    )}

                    {/* Days remaining caption */}
                    <div className="absolute bottom-1 left-1.5 text-[9px] text-white/90 font-medium">
                      {item.days_remaining}h lagi
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ConfirmationModal
        isOpen={permanentConfirmOpen}
        title="Hapus Permanen?"
        message={`${selectedIds.size} media akan dihapus secara fisik dan tidak dapat dipulihkan.`}
        confirmLabel="Hapus Permanen"
        isDangerous={true}
        isLoading={isProcessing}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermanentConfirmOpen(false)}
      />

      <ConfirmationModal
        isOpen={emptyConfirmOpen}
        title="Kosongkan Trash?"
        message="Seluruh media di Trash akan dihapus permanen dari server."
        confirmLabel="Kosongkan"
        isDangerous={true}
        isLoading={isProcessing}
        onConfirm={handleEmptyTrash}
        onCancel={() => setEmptyConfirmOpen(false)}
      />
    </div>
  );
}
