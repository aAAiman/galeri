"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  Upload,
  Edit3,
  Trash2,
  Play,
  Heart,
  Check,
  CheckSquare,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

interface AlbumDetail {
  id: number;
  name: string;
  description?: string | null;
  cover_media_id?: number | null;
  effective_cover_id?: number | null;
  media_count: number;
  created_at?: string;
  updated_at?: string;
}

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      }
    >
      <AlbumDetailContent params={params} />
    </Suspense>
  );
}

function AlbumDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    zoomLevel,
    zoomIn,
    zoomOut,
    gridClass,
    canZoomIn,
    canZoomOut,
  } = useGridZoom();
  const resolvedParams = use(params);
  const albumId = parseInt(resolvedParams.id, 10);

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Viewer state
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Album move / add modal state
  const [albumModalMode, setAlbumModalMode] = useState<"select_move" | "select_add" | null>(null);

  // Modals for album actions
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false);

  const fetchAlbumData = async () => {
    setLoading(true);
    try {
      const [albumRes, mediaRes] = await Promise.all([
        fetch(`/api/albums/${albumId}`),
        fetch(`/api/media?albumId=${albumId}&limit=100`),
      ]);

      if (albumRes.ok) {
        const aData = await albumRes.json();
        setAlbum(aData.album);
        setEditName(aData.album.name);
        setEditDesc(aData.album.description || "");
      }

      if (mediaRes.ok) {
        const mData = await mediaRes.json();
        setMediaList(mData.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbumData();

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetId = customEvent.detail?.targetAlbumId;
      if (!targetId || targetId === albumId) {
        fetchAlbumData();
      }
    };

    window.addEventListener("galerikita:refresh", handleRefresh);
    return () => {
      window.removeEventListener("galerikita:refresh", handleRefresh);
    };
  }, [albumId]);

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

  const handleRemoveFromAlbum = async () => {
    try {
      const res = await fetch("/api/albums/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          mediaIds: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
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
      setMediaList((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
      setTrashConfirmOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchAlbumData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAlbum = async () => {
    try {
      const res = await fetch(`/api/albums/${albumId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/albums");
      }
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

      <main className="flex-1 flex flex-col min-w-0 md:pl-52 lg:pl-56 pt-14 pb-20 md:pb-8">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 md:left-52 lg:left-56 z-30 h-14 bg-white/95 dark:bg-neutral-900/95 rose:bg-[#fff9f9]/95 backdrop-blur-md border-b border-neutral-200/80 rose:border-[#f4d8de]/80 px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 select-none">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Link
              href="/albums"
              className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 rose:text-[#a38088] rose:hover:text-[#d96b82] transition-colors shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 rose:text-[#3a2228] truncate max-w-[110px] xs:max-w-[170px] sm:max-w-xs md:max-w-md">
                  {album?.name || "Memuat..."}
                </h1>
                {theme === "rose" && <span className="text-xs text-rose-500 font-semibold shrink-0">♡</span>}
                <span className="hidden xs:inline text-xs text-neutral-500 rose:text-[#a38088] font-normal truncate shrink-0">
                  • {mediaList.length} item
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-neutral-900 dark:bg-white rose:bg-[#d96b82] text-white dark:text-black rose:text-white text-xs font-medium cursor-pointer shadow-xs hover:bg-neutral-800 dark:hover:bg-neutral-200 rose:hover:bg-[#c7556e] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Tambah</span>
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="p-1 sm:p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 rose:hover:bg-[#fcecef] text-neutral-500 rose:text-[#a38088] transition-colors"
              title="Edit Album"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 rose:hover:bg-[#fcecef] text-neutral-500 rose:text-[#d96b82] hover:text-rose-500 rose:hover:text-rose-600 transition-colors"
              title="Hapus Album"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Couple Avatar in Header */}
            <Link
              href="/settings"
              className="relative shrink-0 ml-1 rounded-full p-0.5 transition-transform hover:scale-105"
              title="Pengaturan Tema & Latar Berdua"
            >
              <div className="h-7 w-7 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 rose:border-[#d96b82] ring-1 ring-neutral-200 dark:ring-neutral-800 rose:ring-[#fcdde3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/couple/collage.jpg"
                  alt="Aiman & Pacar"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </Link>
          </div>
        </header>

        {/* Album Hero Header (User Screenshot Inspired) */}
        {album && (
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800/60 rose:border-[#f4d8de]">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 rose:bg-[#fcecef] border border-neutral-200 dark:border-neutral-800 rose:border-[#f4d8de] shrink-0 shadow-xs relative">
              {(album.effective_cover_id || album.cover_media_id || (mediaList.length > 0 ? mediaList[0].id : null)) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${album.effective_cover_id || album.cover_media_id || mediaList[0].id}/thumbnail`}
                  alt={album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400 rose:text-[#d96b82]/60">
                  <ImageIcon className="h-6 w-6 stroke-[1.5]" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100 rose:text-[#3a2228]">
                  {album.name}
                </h2>
                {theme === "rose" && <span className="text-sm text-[#d96b82]">♡</span>}
              </div>
              <p className="text-[11px] text-neutral-500 rose:text-[#a38088] mt-0.5">
                {mediaList.length} media{album.updated_at ? ` • Diperbarui ${new Date(album.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
              </p>
              {album.description && (
                <p className="text-xs text-neutral-600 dark:text-neutral-300 rose:text-[#6d4d54] mt-1.5 max-w-xl leading-relaxed">
                  {album.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Dense Media Grid with Apple Photos Zoom Level */}
        <div className="p-2 sm:p-4 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Memuat isi album...</span>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <p className="text-xs text-neutral-400 mb-3">Album ini kosong</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white rose:bg-[#d96b82] text-white dark:text-black rose:text-white text-xs font-medium cursor-pointer"
              >
                Tambah foto ke album
              </button>
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
        inAlbumContext={true}
        onClearSelection={() => setSelectedIds(new Set())}
        onRemoveFromAlbum={handleRemoveFromAlbum}
        onMoveToAlbum={() => setAlbumModalMode("select_move")}
        onAddToAlbum={() => setAlbumModalMode("select_add")}
        onDeleteToTrash={() => setTrashConfirmOpen(true)}
      />

      <UploadModal
        isOpen={isUploadOpen}
        targetAlbumId={albumId}
        targetAlbumName={album?.name}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchAlbumData();
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

      {/* Edit Album Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-sm p-4">
            <h3 className="font-semibold text-sm mb-3">Edit Album</h3>
            <form onSubmit={handleUpdateAlbum} className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Hapus Album?"
        message={`Menghapus album "${album?.name}" tidak akan menghapus foto/video asli. File tetap ada di galeri.`}
        confirmLabel="Hapus Album"
        isDangerous={true}
        onConfirm={handleDeleteAlbum}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

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
