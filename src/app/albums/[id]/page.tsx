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
import {
  ChevronLeft,
  Upload,
  Edit3,
  Trash2,
  Play,
  Heart,
  Check,
  Loader2,
} from "lucide-react";

interface AlbumDetail {
  id: number;
  name: string;
  description?: string | null;
  cover_media_id?: number | null;
  media_count: number;
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

  return (
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <Link
              href="/albums"
              className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                  {album?.name || "Memuat..."}
                </h1>
                <span className="text-xs text-neutral-500 font-normal">
                  • {mediaList.length} item
                </span>
              </div>
              {album?.description && (
                <p className="text-[11px] text-neutral-400 truncate max-w-xs sm:max-w-md">
                  {album.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Tambah</span>
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              title="Edit Album"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-rose-500 transition-colors"
              title="Hapus Album"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dense Media Grid */}
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
                className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
              >
                Tambah foto ke album
              </button>
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
