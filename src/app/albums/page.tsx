"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { AlbumModal } from "@/components/AlbumModal";
import {
  FolderPlus,
  FolderArchive,
  Image as ImageIcon,
  Loader2,
  Search,
} from "lucide-react";

interface AlbumItem {
  id: number;
  name: string;
  description?: string | null;
  cover_media_id?: number | null;
  effective_cover_id?: number | null;
  media_count: number;
  updated_at: string;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/albums?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setAlbums(data.albums || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, [search]);

  const handleCreateAlbum = async (
    _albumId?: number,
    newAlbumData?: { name: string; description?: string }
  ) => {
    if (!newAlbumData) return;
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlbumData),
      });
      if (res.ok) {
        fetchAlbums();
        setIsCreateOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Album Foto & Video
            </h1>
            <p className="text-xs text-zinc-500">
              Kelompokkan media tanpa menduplikasi file fisik
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama album..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none transition-all"
              />
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all shrink-0 cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Buat Album</span>
            </button>
          </div>
        </header>

        {/* Albums Grid */}
        <div className="p-4 md:p-8 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-xs">Memuat album...</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                <FolderArchive className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                Belum ada album
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                Buat album untuk mengorganisasikan foto liburan, kenangan, atau acara spesial bersama.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Buat Album Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Cover preview */}
                  <div className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                    {album.effective_cover_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${album.effective_cover_id}/thumbnail`}
                        alt={album.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1">
                        <ImageIcon className="h-8 w-8 stroke-[1.5]" />
                        <span className="text-[11px]">Belum ada media</span>
                      </div>
                    )}

                    {/* Media count pill */}
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">
                      {album.media_count} Media
                    </div>
                  </div>

                  {/* Album Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                        {album.name}
                      </h3>
                      {album.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                          {album.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          setIsUploadOpen(false);
          fetchAlbums();
        }}
      />

      {/* Create Album Modal */}
      <AlbumModal
        isOpen={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateAlbum}
      />
    </div>
  );
}
