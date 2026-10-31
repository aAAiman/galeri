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
  Filter,
  ArrowUpDown,
  Play,
  Heart,
  Check,
  Image as ImageIcon,
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

  // Album modal state (for Move or Add)
  const [albumModalMode, setAlbumModalMode] = useState<"select_move" | "select_add" | null>(null);

  // Confirmation modal state (for Trash delete)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);

  // Fetch media
  const fetchMedia = useCallback(
    async (currentPage = 1, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "60",
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

  // Group media by date for timeline
  const groupedMedia = useMemo(() => {
    const groups: { [key: string]: MediaItem[] } = {};

    mediaList.forEach((item) => {
      const dateVal = item.taken_at || item.uploaded_at;
      const d = new Date(dateVal);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
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

  // Selection toggles
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
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama file foto / video..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none transition-all"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto pb-1 sm:pb-0">
            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 shrink-0">
              {(["all", "photo", "video"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filter === tab
                      ? "bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  {tab === "all" ? "Semua" : tab === "photo" ? "Foto" : "Video"}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-1.5 shrink-0 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-transparent">
              <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="date_taken_desc">Terbaru (Tanggal Ambil)</option>
                <option value="date_taken_asc">Terlama (Tanggal Ambil)</option>
                <option value="date_uploaded_desc">Terbaru Diunggah</option>
                <option value="date_uploaded_asc">Terlama Diunggah</option>
                <option value="filename_asc">Nama File (A-Z)</option>
              </select>
            </div>

            {/* Mobile upload trigger */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="md:hidden p-2 rounded-xl bg-sky-600 text-white shrink-0 shadow-md shadow-sky-600/25"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Gallery Content */}
        <div className="p-4 md:p-8 space-y-8 flex-1">
          {loading && mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-xs">Memuat galeri foto dan video...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                <ImageIcon className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Belum ada media
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Mulai unggah foto dan video kenangan Anda sekarang. File akan disimpan secara aman pada server lokal.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Unggah Foto / Video Sekarang</span>
              </button>
            </div>
          ) : (
            Object.entries(groupedMedia).map(([dateLabel, items]) => (
              <section key={dateLabel} className="space-y-3">
                <h2 className="text-sm font-semibold tracking-tight text-zinc-600 dark:text-zinc-300">
                  {dateLabel}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
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
                        className={`group relative aspect-square rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 cursor-pointer border transition-all duration-200 select-none ${
                          isSelected
                            ? "ring-4 ring-sky-500 ring-offset-2 dark:ring-offset-zinc-950 border-sky-500 scale-[0.98]"
                            : "border-transparent hover:shadow-lg"
                        }`}
                      >
                        {/* Thumbnail image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${item.id}/thumbnail`}
                          alt={item.original_filename}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Dark gradient overlay on hover or selected */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 transition-opacity ${
                            isSelected || isSelectionActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        />

                        {/* Checkbox for selection */}
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

                        {/* Favorite button top right */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(item.id, e)}
                          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-all ${
                            item.is_favorite
                              ? "text-rose-500 fill-rose-500"
                              : "text-white/80 hover:text-white bg-black/40 hover:bg-black/70"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              item.is_favorite ? "fill-rose-500" : ""
                            }`}
                          />
                        </button>

                        {/* Video Badge indicator */}
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
              </section>
            ))
          )}

          {/* Load more button */}
          {hasMore && (
            <div className="py-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                {loading ? "Memuat..." : "Muat Lebih Banyak Media"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Toolbar when items are selected */}
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

      {/* Fullscreen Media Viewer */}
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

      {/* Album Selector Modal for Move / Add */}
      {albumModalMode && (
        <AlbumModal
          isOpen={albumModalMode !== null}
          mode={albumModalMode}
          onClose={() => setAlbumModalMode(null)}
          onSubmit={handleAlbumSubmit}
          selectedCount={selectedIds.size}
        />
      )}

      {/* Confirmation Modal for Bulk Trash */}
      <ConfirmationModal
        isOpen={trashConfirmOpen}
        title="Pindahkan Media ke Trash?"
        message={`${selectedIds.size} media akan dipindahkan ke Trash. Media masih dapat dipulihkan dalam 30 hari.`}
        confirmLabel="Pindahkan ke Trash"
        isDangerous={true}
        onConfirm={handleBulkTrash}
        onCancel={() => setTrashConfirmOpen(false)}
      />
    </div>
  );
}
