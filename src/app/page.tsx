"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Loader2,
  Upload,
  Folder,
  CheckSquare,
} from "lucide-react";

interface HomeAlbum {
  id: number;
  name: string;
  media_count?: number;
  effective_cover_id?: number | null;
  cover_media_id?: number | null;
}

export default function HomeGalleryPage() {
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
  const [albums, setAlbums] = useState<HomeAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Viewer state
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Album modal state
  const [albumModalMode, setAlbumModalMode] = useState<"select_move" | "select_add" | null>(null);

  // Confirmation modal state
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);

  const fetchMedia = useCallback(
    async (currentPage = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "80",
          filter,
          sort: "date_taken_desc",
        });

        const res = await fetch(`/api/media?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (append) {
            setMediaList((prev) => [...prev, ...data.items]);
          } else {
            setMediaList(data.items);
          }
          setHasMore(data.page < data.totalPages);
        }
      } catch (err) {
        console.error("Failed to load media:", err);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    setPage(1);
    fetchMedia(1, false);
    fetch("/api/albums")
      .then((r) => r.json())
      .then((d) => setAlbums(d.albums || []))
      .catch(console.error);

    const handleRefresh = () => {
      fetchMedia(1, false);
      fetch("/api/albums")
        .then((r) => r.json())
        .then((d) => setAlbums(d.albums || []))
        .catch(console.error);
    };

    window.addEventListener("galerikita:refresh", handleRefresh);
    return () => {
      window.removeEventListener("galerikita:refresh", handleRefresh);
    };
  }, [fetchMedia]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMedia(nextPage, true);
    }
  };

  // Group media by date for dense timeline
  const groupedMedia = useMemo(() => {
    const groups: { [key: string]: MediaItem[] } = {};

    mediaList.forEach((item) => {
      const dateVal = item.taken_at || item.uploaded_at;
      const d = new Date(dateVal);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      if (d.toDateString() === today.toDateString()) {
        key = "Hari Ini";
      } else if (d.toDateString() === yesterday.toDateString()) {
        key = "Kemarin";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  }, [mediaList]);

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
        const data = await res.json();
        setMediaList((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_favorite: data.isFavorite } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkFavorite = async () => {
    for (const id of Array.from(selectedIds)) {
      await handleToggleFavorite(id);
    }
    setSelectedIds(new Set());
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

  const handleDownloadSelected = () => {
    Array.from(selectedIds).forEach((id, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/api/media/${id}/download`;
        link.setAttribute("download", "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  const handleSingleTrash = async (id: number) => {
    try {
      await fetch(`/api/media/${id}`, { method: "DELETE" });
      setMediaList((prev) => prev.filter((item) => item.id !== id));
      if (viewerIndex !== null) setViewerIndex(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAlbumSubmit = async (
    targetAlbumId?: number,
    newAlbumData?: { name: string; description?: string }
  ) => {
    let resolvedAlbumId = targetAlbumId;

    if (newAlbumData) {
      const createRes = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlbumData),
      });
      const createData = await createRes.json();
      resolvedAlbumId = createData.albumId;
    }

    if (!resolvedAlbumId) return;

    const endpoint =
      albumModalMode === "select_move" ? "/api/albums/move" : "/api/albums/add";
    const payload =
      albumModalMode === "select_move"
        ? { mediaIds: Array.from(selectedIds), targetAlbumId: resolvedAlbumId }
        : { mediaIds: Array.from(selectedIds), albumId: resolvedAlbumId };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setSelectedIds(new Set());
      setAlbumModalMode(null);
    }
  };

  const isSelectionActive = selectedIds.size > 0;
  const isAllSelected = mediaList.length > 0 && selectedIds.size === mediaList.length;

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === mediaList.length && mediaList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mediaList.map((m) => m.id)));
    }
  }, [mediaList, selectedIds.size]);

  return (
    <div className="min-h-screen flex bg-transparent text-neutral-900 rose:text-[#3a2228] transition-colors relative">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Main Timeline View */}
      <main className="flex-1 flex flex-col min-w-0 md:pl-52 lg:pl-56 pt-14 pb-20 md:pb-8">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 md:left-52 lg:left-56 z-30 h-14 bg-white/95 dark:bg-neutral-900/95 rose:bg-[#fff9f9]/95 backdrop-blur-md border-b border-neutral-200/80 rose:border-[#f4d8de]/80 px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 select-none">
          {/* Filter Pills & Grid Zoom Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center bg-neutral-100 rose:bg-[#fcecef] rounded-lg p-0.5 text-xs border border-transparent rose:border-[#f4d8de] shrink-0">
              {(["all", "photo", "video"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs transition-colors cursor-pointer ${
                    filter === tab
                      ? theme === "rose"
                        ? "bg-[#d96b82] text-white font-medium shadow-xs"
                        : "bg-white text-neutral-900 font-medium shadow-xs"
                      : theme === "rose"
                      ? "text-[#7a5c63] hover:text-[#d96b82]"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {tab === "all" ? "Semua" : tab === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>

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
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none shrink-0 ${
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
                <span className="sm:hidden text-[11px]">
                  {selectedIds.size > 0 ? selectedIds.size : "Pilih"}
                </span>
              </button>
            )}
          </div>

          {/* Right Side: Upload (mobile) & Couple Profile Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Upload Action on mobile */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-[#d96b82] text-white text-xs font-medium shadow-xs"
              title="Unggah"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Unggah</span>
            </button>

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
                  alt="Aiman & Pacar"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </Link>
          </div>
        </header>

        {/* Rose Romance "Album Kamu ♡" Horizontal Carousel (User Screenshot Inspired) */}
        {albums.length > 0 && (
          <div className="px-3 sm:px-6 pt-4 pb-2 select-none">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold tracking-tight text-neutral-700 dark:text-neutral-300 rose:text-[#3a2228]">
                  Album Kamu
                </span>
                <span className="text-xs text-rose-500 font-semibold">♡</span>
              </div>
              <Link
                href="/albums"
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 rose:text-[#a38088] rose:hover:text-[#d96b82] transition-colors"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none">
              {albums.slice(0, 10).map((album) => {
                const coverMediaId = album.effective_cover_id || album.cover_media_id;
                return (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="flex flex-col w-36 sm:w-40 shrink-0 p-2 rounded-2xl bg-white dark:bg-neutral-900 rose:bg-white border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] shadow-2xs hover:shadow-xs transition-all group select-none"
                  >
                    <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 rose:bg-[#fcecef] relative mb-1.5 border border-neutral-100 dark:border-neutral-800/60 rose:border-[#f4d8de]">
                      {coverMediaId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/media/${coverMediaId}/thumbnail`}
                          alt={album.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 rose:text-[#d96b82]/60">
                          <Folder className="h-6 w-6 stroke-[1.5]" />
                        </div>
                      )}
                    </div>
                    <div className="px-1 pb-0.5 leading-tight flex-1 flex flex-col justify-between">
                      <p className="text-xs font-semibold truncate text-neutral-900 dark:text-neutral-100 rose:text-[#3a2228] group-hover:text-blue-600 rose:group-hover:text-[#d96b82] transition-colors">
                        {album.name}
                      </p>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 rose:text-[#a38088] mt-0.5">
                        {album.media_count} foto
                      </span>
                    </div>
                  </Link>
                );
              })}

              {/* Buat Album Baru Button */}
              <button
                type="button"
                onClick={() => setAlbumModalMode("select_add")}
                className="flex flex-col items-center justify-center w-36 sm:w-40 shrink-0 p-3 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 rose:border-[#f3c8d1] bg-neutral-50/50 dark:bg-neutral-900/50 rose:bg-[#fff0f3] text-neutral-600 dark:text-neutral-400 rose:text-[#d96b82] hover:bg-neutral-100 dark:hover:bg-neutral-800 rose:hover:bg-[#fde2e8] transition-all cursor-pointer text-center group select-none self-stretch"
              >
                <div className="h-8 w-8 rounded-full bg-white dark:bg-neutral-800 rose:bg-white flex items-center justify-center mb-1.5 shadow-2xs text-[#d96b82] group-hover:scale-110 transition-transform">
                  <span className="text-base font-semibold leading-none">+</span>
                </div>
                <span className="text-xs font-medium leading-tight text-neutral-700 dark:text-neutral-300 rose:text-[#d96b82]">
                  Buat Album
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 rose:text-[#c48e98] mt-0.5">
                  Baru
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Dense Timeline Photo Grid (Google & Apple Photos style) */}
        <div className="p-2 sm:p-4 space-y-6 flex-1">
          {loading && mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
              <span className="text-xs">Memuat galeri...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <p className="text-xs text-neutral-400 mb-3">Galeri foto dan video kosong</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white rose:bg-[#d96b82] text-white dark:text-black rose:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Unggah media pertama
              </button>
            </div>
          ) : (
            Object.entries(groupedMedia).map(([dateLabel, items]) => (
              <section key={dateLabel} className="space-y-1.5">
                {/* Clean Discreet Date Header */}
                <div className="px-1 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 rose:text-[#5a3840] tracking-tight">
                      {dateLabel}
                    </h2>
                    {theme === "rose" && (
                      <span className="text-[11px] text-[#d96b82]">♡</span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 rose:text-[#a38088]">
                    {items.length} media
                  </span>
                </div>

                {/* Zoomable responsive photo grid */}
                <div className={`grid ${gridClass} transition-all duration-200`}>
                  {items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const globalIndex = mediaList.findIndex(
                      (m) => m.id === item.id
                    );

                    return (
                      <PhotoThumbnail
                        key={item.id}
                        item={item}
                        isSelected={isSelected}
                        isSelectionActive={isSelectionActive}
                        onOpen={() => setViewerIndex(globalIndex)}
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
              </section>
            ))
          )}

          {hasMore && (
            <div className="py-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                {loading ? "Memuat..." : "Muat lebih banyak"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Selection Toolbar */}
      <ActionToolbar
        selectedCount={selectedIds.size}
        totalCount={mediaList.length}
        isAllSelected={isAllSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={() => setSelectedIds(new Set())}
        onMoveToAlbum={() => setAlbumModalMode("select_move")}
        onAddToAlbum={() => setAlbumModalMode("select_add")}
        onToggleFavorite={handleBulkFavorite}
        onDeleteToTrash={() => setTrashConfirmOpen(true)}
        onDownloadAll={handleDownloadSelected}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchMedia(1, false);
          setIsUploadOpen(false);
        }}
      />

      {/* Fullscreen Distraction-free Media Viewer */}
      {viewerIndex !== null && (
        <MediaViewer
          mediaList={mediaList}
          initialIndex={viewerIndex}
          isOpen={viewerIndex !== null}
          onClose={() => setViewerIndex(null)}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleSingleTrash}
        />
      )}

      {/* Album Modal */}
      {albumModalMode && (
        <AlbumModal
          isOpen={albumModalMode !== null}
          mode={albumModalMode}
          onClose={() => setAlbumModalMode(null)}
          onSubmit={handleAlbumSubmit}
          selectedCount={selectedIds.size}
        />
      )}

      {/* Confirmation Modal */}
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
