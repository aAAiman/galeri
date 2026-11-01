"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { MediaViewer, MediaItem } from "@/components/MediaViewer";
import { ActionToolbar } from "@/components/ActionToolbar";
import { AlbumModal } from "@/components/AlbumModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { useTheme } from "@/components/ThemeProvider";
import { useGridZoom } from "@/hooks/useGridZoom";
import { GridZoomControls } from "@/components/GridZoomControls";
import { Heart, Play, Check, CheckSquare, Loader2 } from "lucide-react";

export default function FavoritesPage() {
  const { theme } = useTheme();
  const {
    zoomLevel,
    zoomIn,
    zoomOut,
    gridClass,
    canZoomIn,
    canZoomOut,
  } = useGridZoom();

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
    const handleRefresh = () => fetchFavorites();
    window.addEventListener("galerikita:refresh", handleRefresh);
    return () => {
      window.removeEventListener("galerikita:refresh", handleRefresh);
    };
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
  const isAllSelected = mediaList.length > 0 && selectedIds.size === mediaList.length;

  const handleToggleSelectAll = () => {
    if (selectedIds.size === mediaList.length && mediaList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mediaList.map((m) => m.id)));
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent text-neutral-900 rose:text-[#3a2228] transition-colors relative">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 rose:bg-[#fff9f9]/85 backdrop-blur-md border-b border-neutral-200/80 rose:border-[#f4d8de]/80 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 rose:text-[#3a2228]">
              Favorit
            </h1>
            {theme === "rose" && <span className="text-xs text-rose-500 font-semibold">♡</span>}
            <span className="text-xs text-neutral-500 rose:text-[#a38088] font-normal">
              • {mediaList.length} media
            </span>
          </div>

          <div className="flex items-center gap-2">
            <GridZoomControls
              zoomLevel={zoomLevel}
              canZoomIn={canZoomIn}
              canZoomOut={canZoomOut}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
            />

            {mediaList.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                  selectedIds.size > 0
                    ? "bg-blue-600 text-white rose:bg-[#d96b82] rose:text-white shadow-xs"
                    : "bg-neutral-100 dark:bg-neutral-800 rose:bg-[#fcecef] text-neutral-600 dark:text-neutral-300 rose:text-[#7a5c63] hover:text-neutral-900 rose:hover:text-[#d96b82] border border-transparent rose:border-[#f4d8de]"
                }`}
                title={
                  isAllSelected
                    ? "Batalkan pilihan semua foto"
                    : "Pilih semua foto"
                }
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {isAllSelected
                    ? "Batal Semua"
                    : selectedIds.size > 0
                    ? `${selectedIds.size} Dipilih`
                    : "Pilih Semua"}
                </span>
                <span className="sm:hidden">
                  {selectedIds.size > 0 ? selectedIds.size : "Pilih"}
                </span>
              </button>
            )}

            {/* Couple Avatar in Header */}
            <Link
              href="/settings"
              className="relative shrink-0 ml-1 rounded-full p-0.5 transition-transform hover:scale-105"
              title="Pengaturan Tema & Latar Berdua"
            >
              <div className="h-7 w-7 rounded-full overflow-hidden border border-neutral-300 rose:border-[#d96b82] ring-1 ring-neutral-200 rose:ring-[#fcdde3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/couple/collage.jpg"
                  alt="Momen Berdua"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </Link>
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
            <div className={`grid ${gridClass} transition-all duration-200`}>
              {mediaList.map((item, index) => {
                const isSelected = selectedIds.has(item.id);

                return (
                  <PhotoThumbnail
                    key={item.id}
                    item={item}
                    isSelected={isSelected}
                    isSelectionActive={isSelectionActive}
                    onOpen={() => setViewerIndex(index)}
                    onToggleSelect={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    }}
                    onToggleFavorite={(e) => handleToggleFavorite(item.id, e)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ActionToolbar
        selectedCount={selectedIds.size}
        totalCount={mediaList.length}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
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
