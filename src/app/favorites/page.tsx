"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { MediaViewer, MediaItem } from "@/components/MediaViewer";
import { ActionToolbar } from "@/components/ActionToolbar";
import { AlbumModal } from "@/components/AlbumModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Heart, Play, Check, Loader2 } from "lucide-react";

export default function FavoritesPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [albumModalMode, setAlbumModalMode] = useState<"select_move" | "select_add" | null>(null);
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media?favoriteOnly=true&limit=100");
      if (res.ok) {
        const data = await res.json();
        setMediaList(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleFavorite = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/media/${id}/favorite`, { method: "PATCH" });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkTrash = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        await fetch(`/api/media/${id}`, { method: "DELETE" });
      }
      setMediaList((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setTrashConfirmOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isSelectionActive = selectedIds.size > 0;

  return (
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Favorit
            </h1>
            <span className="text-xs text-neutral-500 font-normal">
              • {mediaList.length} media
            </span>
          </div>
        </header>

        {/* Dense Grid */}
        <div className="p-2 sm:p-4 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Memuat favorit...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <p className="text-xs text-neutral-400">Belum ada media favorit</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Tandai foto atau video dengan ikon hati di galeri
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-1.5">
              {mediaList.map((item, index) => {
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isSelectionActive) {
                        toggleSelect(item.id, {} as React.MouseEvent);
                      } else {
                        setViewerIndex(index);
                      }
                    }}
                    className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-pointer select-none transition-transform duration-75 ${
                      isSelected
                        ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-black scale-[0.97]"
                        : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${item.id}/thumbnail`}
                      alt={item.original_filename}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />

                    <div
                      className={`absolute inset-0 bg-black/20 transition-opacity ${
                        isSelected || isSelectionActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={(e) => toggleSelect(item.id, e)}
                      className={`absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-black/40 hover:bg-black/70 text-white/80 border border-white/40 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(item.id, e)}
                      className="absolute top-1.5 right-1.5 z-10 p-1 rounded text-rose-500 fill-rose-500 bg-black/40 hover:bg-black/70 transition-all cursor-pointer"
                      title="Hapus dari Favorit"
                    >
                      <Heart className="h-3.5 w-3.5 fill-rose-500" />
                    </button>

                    {item.media_type === "video" && (
                      <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium">
                        <Play className="h-2.5 w-2.5 fill-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ActionToolbar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onMoveToAlbum={() => setAlbumModalMode("select_move")}
        onAddToAlbum={() => setAlbumModalMode("select_add")}
        onDeleteToTrash={() => setTrashConfirmOpen(true)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchFavorites();
          setIsUploadOpen(false);
        }}
      />

      {viewerIndex !== null && (
        <MediaViewer
          mediaList={mediaList}
          initialIndex={viewerIndex}
          isOpen={viewerIndex !== null}
          onClose={() => setViewerIndex(null)}
          onToggleFavorite={handleToggleFavorite}
          onDelete={async (id) => {
            await fetch(`/api/media/${id}`, { method: "DELETE" });
            setMediaList((prev) => prev.filter((m) => m.id !== id));
            setViewerIndex(null);
          }}
        />
      )}

      {albumModalMode && (
        <AlbumModal
          isOpen={albumModalMode !== null}
          mode={albumModalMode}
          onClose={() => setAlbumModalMode(null)}
          onSubmit={async (albumId) => {
            if (!albumId) return;
            const endpoint =
              albumModalMode === "select_move" ? "/api/albums/move" : "/api/albums/add";
            await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mediaIds: Array.from(selectedIds),
                ...(albumModalMode === "select_move"
                  ? { targetAlbumId: albumId }
                  : { albumId }),
              }),
            });
            setSelectedIds(new Set());
            setAlbumModalMode(null);
          }}
          selectedCount={selectedIds.size}
        />
      )}

      <ConfirmationModal
        isOpen={trashConfirmOpen}
        title="Pindahkan ke Trash?"
        message={`${selectedIds.size} media akan dipindahkan ke Trash.`}
        confirmLabel="Pindahkan"
        isDangerous={true}
        onConfirm={handleBulkTrash}
        onCancel={() => setTrashConfirmOpen(false)}
      />
    </div>
  );
}
