"use client";

import React, { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { MediaViewer, MediaItem } from "@/components/MediaViewer";
import { ActionToolbar } from "@/components/ActionToolbar";
import { AlbumModal } from "@/components/AlbumModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Heart, Play, Check, Loader2, Image as ImageIcon } from "lucide-react";

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
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
              Favorit
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-normal">
                {mediaList.length} media
              </span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Koleksi foto dan video favorit bersama
            </p>
          </div>
        </header>

        {/* Media Grid */}
        <div className="p-4 md:p-8 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-xs">Memuat favorit...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 mb-4">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Belum ada media favorit
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Klik ikon hati pada foto atau video di galeri untuk menambahkannya ke koleksi favorit.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
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
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 cursor-pointer border transition-all duration-200 select-none ${
                      isSelected
                        ? "ring-4 ring-sky-500 ring-offset-2 dark:ring-offset-zinc-950 border-sky-500 scale-[0.98]"
                        : "border-transparent hover:shadow-lg"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${item.id}/thumbnail`}
                      alt={item.original_filename}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity ${
                        isSelected || isSelectionActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={(e) => toggleSelect(item.id, e)}
                      className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/40"
                          : "bg-black/40 hover:bg-black/70 text-white/70 border border-white/20"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(item.id, e)}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-rose-500 fill-rose-500 bg-black/40 hover:bg-black/70 transition-all"
                      title="Hapus dari Favorit"
                    >
                      <Heart className="h-4 w-4 fill-rose-500" />
                    </button>

                    {item.media_type === "video" && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
                        <Play className="h-3 w-3 fill-white" />
                        <span>Video</span>
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
        title="Pindahkan Media ke Trash?"
        message={`${selectedIds.size} media akan dipindahkan ke Trash.`}
        confirmLabel="Pindahkan ke Trash"
        isDangerous={true}
        onConfirm={handleBulkTrash}
        onCancel={() => setTrashConfirmOpen(false)}
      />
    </div>
  );
}
