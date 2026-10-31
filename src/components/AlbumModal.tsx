"use client";

import React, { useState, useEffect } from "react";
import { X, Folder, Loader2 } from "lucide-react";

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
      ? "Buat Album"
      : mode === "select_move"
      ? `Pindahkan ${selectedCount} Media ke Album`
      : `Tambahkan ${selectedCount} Media ke Album`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-sm shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {mode !== "create" && (
            <div className="flex items-center gap-1.5 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                  !isCreatingNew
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-medium shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                Pilih Album
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className={`flex-1 py-1 rounded-md transition-colors cursor-pointer ${
                  isCreatingNew
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-medium shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                + Album Baru
              </button>
            </div>
          )}

          {isCreatingNew ? (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  Nama Album
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Liburan 2026"
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
                />
              </div>
            </>
          ) : (
            <div>
              {loading ? (
                <div className="py-6 flex justify-center text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : albums.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  Belum ada album
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {albums.map((alb) => (
                    <button
                      key={alb.id}
                      type="button"
                      onClick={() => setSelectedAlbumId(alb.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        selectedAlbumId === alb.id
                          ? "border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                          : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{alb.name}</span>
                      </div>
                      <span className="text-[11px] text-neutral-400 shrink-0">
                        {alb.media_count || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || (!isCreatingNew && !selectedAlbumId)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black font-medium text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
