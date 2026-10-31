"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { MediaViewer, MediaItem } from "@/components/MediaViewer";
import { ActionToolbar } from "@/components/ActionToolbar";
import { AlbumModal } from "@/components/AlbumModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Search,
  ArrowUpDown,
  Play,
  Heart,
  Check,
  Loader2,
  Upload,
} from "lucide-react";

export default function HomeGalleryPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [sort, setSort] = useState("date_taken_desc");
  const [search, setSearch] = useState("");
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
          sort,
          search,
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
    [filter, sort, search]
  );

  useEffect(() => {
    setPage(1);
    fetchMedia(1, false);
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

  return (
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Main Timeline View */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Understated Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-3 select-none">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari foto & video..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-lg p-0.5 text-xs">
              {(["all", "photo", "video"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    filter === tab
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium shadow-xs"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {tab === "all" ? "Semua" : tab === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="hidden sm:flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded-lg text-xs">
              <ArrowUpDown className="h-3 w-3 text-neutral-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="date_taken_desc">Terbaru</option>
                <option value="date_taken_asc">Terlama</option>
                <option value="filename_asc">Nama (A-Z)</option>
              </select>
            </div>

            {/* Upload Action on mobile */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black"
              title="Unggah"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dense Timeline Photo Grid (Google Photos style) */}
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
                className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium transition-colors cursor-pointer"
              >
                Unggah media pertama
              </button>
            </div>
          ) : (
            Object.entries(groupedMedia).map(([dateLabel, items]) => (
              <section key={dateLabel} className="space-y-1.5">
                {/* Clean Discreet Date Header */}
                <div className="px-1 pt-2">
                  <h2 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-tight">
                    {dateLabel}
                  </h2>
                </div>

                {/* Dense, responsive grid with minimal gutter */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 sm:gap-1.5">
                  {items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const globalIndex = mediaList.findIndex(
                      (m) => m.id === item.id
                    );

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isSelectionActive) {
                            toggleSelect(item.id, {} as React.MouseEvent);
                          } else {
                            setViewerIndex(globalIndex);
                          }
                        }}
                        className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-pointer select-none transition-transform duration-75 ${
                          isSelected
                            ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-black scale-[0.97]"
                            : ""
                        }`}
                      >
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${item.id}/thumbnail`}
                          alt={item.original_filename}
                          loading="lazy"
                          className="w-full h-full object-cover transition-opacity duration-150"
                        />

                        {/* Subtle selection hover overlay */}
                        <div
                          className={`absolute inset-0 bg-black/20 transition-opacity ${
                            isSelected || isSelectionActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        />

                        {/* Selection Checkbox */}
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

                        {/* Favorite Indicator / Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(item.id, e)}
                          className={`absolute top-1.5 right-1.5 z-10 p-1 rounded transition-all ${
                            item.is_favorite
                              ? "text-rose-500 fill-rose-500 opacity-100"
                              : "text-white/80 hover:text-white bg-black/40 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              item.is_favorite ? "fill-rose-500" : ""
                            }`}
                          />
                        </button>

                        {/* Discreet Video Pill */}
                        {item.media_type === "video" && (
                          <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium">
                            <Play className="h-2.5 w-2.5 fill-white" />
                          </div>
                        )}
                      </div>
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
        onClearSelection={() => setSelectedIds(new Set())}
        onMoveToAlbum={() => setAlbumModalMode("select_move")}
        onAddToAlbum={() => setAlbumModalMode("select_add")}
        onToggleFavorite={handleBulkFavorite}
        onDeleteToTrash={() => setTrashConfirmOpen(true)}
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
