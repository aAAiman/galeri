"use client";

import React, { useState, useEffect } from "react";
import { X, FolderPlus, FolderCheck, Loader2 } from "lucide-react";

interface AlbumItem {
  id: number;
  name: string;
  description?: string | null;
  media_count?: number;
}

interface AlbumModalProps {
  isOpen: boolean;
  mode: "create" | "select_move" | "select_add";
  onClose: () => void;
  onSubmit: (albumId?: number, newAlbumData?: { name: string; description?: string }) => Promise<void>;
  selectedCount?: number;
}

export function AlbumModal({
  isOpen,
  mode,
  onClose,
  onSubmit,
  selectedCount = 0,
}: AlbumModalProps) {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);

  // Form fields for creating
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(mode === "create");

  useEffect(() => {
    if (isOpen) {
      setIsCreatingNew(mode === "create");
      setName("");
      setDescription("");
      setSelectedAlbumId(null);

      if (mode !== "create") {
        setLoading(true);
        fetch("/api/albums")
          .then((res) => res.json())
          .then((data) => {
            if (data.albums) setAlbums(data.albums);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isCreatingNew) {
        if (!name.trim()) return;
        await onSubmit(undefined, { name: name.trim(), description: description.trim() });
      } else {
        if (!selectedAlbumId) return;
        await onSubmit(selectedAlbumId);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "create"
      ? "Buat Album Baru"
      : mode === "select_move"
      ? `Pindahkan ${selectedCount} Media ke Album`
      : `Tambahkan ${selectedCount} Media ke Album`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode !== "create" && (
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  !isCreatingNew
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                Pilih Album Yang Ada
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  isCreatingNew
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                + Buat Album Baru
              </button>
            </div>
          )}

          {isCreatingNew ? (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Album <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Liburan Bali 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan mengenai album ini..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
            </>
          ) : (
            <div>
              {loading ? (
                <div className="py-8 flex justify-center text-zinc-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : albums.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  Belum ada album. Silakan buat album baru terlebih dahulu.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {albums.map((alb) => (
                    <button
                      key={alb.id}
                      type="button"
                      onClick={() => setSelectedAlbumId(alb.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        selectedAlbumId === alb.id
                          ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FolderCheck
                          className={`h-4 w-4 shrink-0 ${
                            selectedAlbumId === alb.id
                              ? "text-sky-600"
                              : "text-zinc-400"
                          }`}
                        />
                        <span className="text-sm font-medium truncate">
                          {alb.name}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {alb.media_count || 0} media
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || (!isCreatingNew && !selectedAlbumId)}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-sm transition-all shadow-md shadow-sky-600/20 flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
