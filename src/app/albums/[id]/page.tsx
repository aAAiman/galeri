"use client";

import React, { useState, useEffect, use } from "react";
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
  FolderArchive,
  Image as ImageIcon,
  Play,
  Heart,
  Check,
  Loader2,
} from "lucide-react";

import { Suspense } from "react";

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
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
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

  // Upload modal state (with this album as target)
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
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/albums"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {album?.name || "Memuat Album..."}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-normal">
                  {mediaList.length} media
                </span>
              </h1>
              {album?.description && (
                <p className="text-xs text-zinc-500 mt-0.5">{album.description}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Unggah ke Album Ini</span>
            </button>

            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title="Edit Album"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
              title="Hapus Album"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Media Grid */}
        <div className="p-4 md:p-8 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-xs">Memuat isi album...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                <ImageIcon className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Album ini masih kosong
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Tambahkan foto dan video langsung ke album ini, atau pilih media dari Home untuk dimasukkan ke sini.
              </p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Unggah Foto ke Album Ini</span>
              </button>
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

      {/* Floating Action Toolbar */}
      <ActionToolbar
        selectedCount={selectedIds.size}
        inAlbumContext={true}
        onClearSelection={() => setSelectedIds(new Set())}
        onRemoveFromAlbum={handleRemoveFromAlbum}
        onMoveToAlbum={() => setAlbumModalMode("select_move")}
        onAddToAlbum={() => setAlbumModalMode("select_add")}
        onDeleteToTrash={() => setTrashConfirmOpen(true)}
      />

      {/* Upload Modal targeted to this album */}
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

      {/* Fullscreen Media Viewer */}
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

      {/* Edit Album Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-semibold text-base mb-4">Edit Detail Album</h3>
            <form onSubmit={handleUpdateAlbum} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Nama Album
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Album Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Hapus Album Ini?"
        message={`Menghapus album "${album?.name}" hanya akan menghapus pengelompokannya. Foto dan video asli TIDAK ikut terhapus dan tetap tersimpan di galeri utama.`}
        confirmLabel="Hapus Album"
        isDangerous={true}
        onConfirm={handleDeleteAlbum}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Bulk Trash Confirmation Modal */}
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
