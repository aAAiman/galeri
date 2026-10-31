"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { UploadModal } from "@/components/UploadModal";
import { AlbumModal } from "@/components/AlbumModal";
import {
  FolderPlus,
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
    <div className="min-h-screen flex bg-white dark:bg-black text-neutral-900 dark:text-neutral-100">
      <Navigation onOpenUpload={() => setIsUploadOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Album
            </h1>
            <span className="text-xs text-neutral-500">
              {albums.length} album
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari album..."
                className="w-40 sm:w-56 pl-8 pr-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
              />
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Buat Album</span>
            </button>
          </div>
        </header>

        {/* Albums Grid (Apple Photos style: clean card with label below) */}
        <div className="p-4 sm:p-6 flex-1">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
              <span className="text-xs">Memuat album...</span>
            </div>
          ) : albums.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <p className="text-xs text-neutral-400 mb-3">Belum ada album</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
              >
                Buat album pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className="group flex flex-col cursor-pointer select-none"
                >
                  {/* Clean Cover square */}
                  <div className="aspect-square w-full rounded-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative border border-neutral-200 dark:border-neutral-800">
                    {album.effective_cover_id ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${album.effective_cover_id}/thumbnail`}
                        alt={album.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-1">
                        <ImageIcon className="h-6 w-6 stroke-[1.5]" />
                      </div>
                    )}
                  </div>

                  {/* Album Name and Count underneath */}
                  <div className="pt-2 px-0.5">
                    <h3 className="font-medium text-xs text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-500 transition-colors">
                      {album.name}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {album.media_count} item
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          setIsUploadOpen(false);
          fetchAlbums();
        }}
      />

      <AlbumModal
        isOpen={isCreateOpen}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateAlbum}
      />
    </div>
  );
}
