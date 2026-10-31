"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Heart,
  Download,
  Trash2,
  Info,
  Calendar,
  HardDrive,
  Maximize2,
  Folder,
} from "lucide-react";

export interface MediaItem {
  id: number;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  media_type: "image" | "video";
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  is_favorite: boolean;
  taken_at?: string | null;
  uploaded_at: string;
  thumbnail_storage_key?: string | null;
}

interface MediaViewerProps {
  mediaList: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function MediaViewer({
  mediaList,
  initialIndex,
  isOpen,
  onClose,
  onToggleFavorite,
  onDelete,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  const currentMedia = mediaList[currentIndex];

  // Fetch albums for current media
  useEffect(() => {
    if (currentMedia?.id && showInfo) {
      fetch(`/api/media/${currentMedia.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.albums) setAlbums(data.albums);
        })
        .catch(() => {});
    }
  }, [currentMedia?.id, showInfo]);

  const handlePrev = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  }, [mediaList.length]);

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  }, [mediaList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentMedia) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-white">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="truncate max-w-xs md:max-w-md">
            <p className="text-sm font-medium truncate text-white">
              {currentMedia.original_filename}
            </p>
            <p className="text-xs text-white/50">
              {currentIndex + 1} dari {mediaList.length}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Zoom controls (images only) */}
          {currentMedia.media_type === "image" && (
            <div className="hidden sm:flex items-center bg-white/10 rounded-full p-1 mr-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-xs text-white/70 px-2 font-mono">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Favorite button */}
          <button
            onClick={() => onToggleFavorite && onToggleFavorite(currentMedia.id)}
            className={`p-2.5 rounded-full hover:bg-white/10 transition-colors ${
              currentMedia.is_favorite
                ? "text-rose-500 fill-rose-500"
                : "text-white/80 hover:text-white"
            }`}
            title="Favorit"
          >
            <Heart
              className={`h-5 w-5 ${
                currentMedia.is_favorite ? "fill-rose-500" : ""
              }`}
            />
          </button>

          {/* Download Original */}
          <a
            href={`/api/media/${currentMedia.id}/download`}
            download={currentMedia.original_filename}
            className="p-2.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Download Original"
          >
            <Download className="h-5 w-5" />
          </a>

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2.5 rounded-full hover:bg-white/10 transition-colors ${
              showInfo ? "text-sky-400 bg-white/10" : "text-white/80 hover:text-white"
            }`}
            title="Informasi Media"
          >
            <Info className="h-5 w-5" />
          </button>

          {/* Delete to Trash */}
          <button
            onClick={() => onDelete && onDelete(currentMedia.id)}
            className="p-2.5 rounded-full hover:bg-rose-500/20 text-white/80 hover:text-rose-400 transition-colors"
            title="Pindahkan ke Trash"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Prev button */}
        {mediaList.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
            title="Sebelumnya (Arrow Left)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Media display */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {currentMedia.media_type === "image" ? (
            <div
              className="overflow-hidden flex items-center justify-center w-full h-full transition-transform duration-100 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${currentMedia.id}/file`}
                alt={currentMedia.original_filename}
                className="max-h-[85vh] max-w-[90vw] object-contain select-none"
                draggable={false}
              />
            </div>
          ) : (
            <video
              key={currentMedia.id}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl"
              src={`/api/media/${currentMedia.id}/file`}
            >
              Browser Anda tidak mendukung pemutaran video ini.
            </video>
          )}
        </div>

        {/* Next button */}
        {mediaList.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
            title="Berikutnya (Arrow Right)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Info Sidebar Drawer */}
        {showInfo && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 border-l border-zinc-800 text-white p-5 overflow-y-auto z-30 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="font-semibold text-sm text-zinc-200">Informasi Media</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-zinc-500 mb-1">Nama File</p>
                <p className="font-medium text-zinc-200 break-words">
                  {currentMedia.original_filename}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-500">Tanggal Pengambilan</p>
                  <p className="font-medium text-zinc-200">
                    {formatDate(currentMedia.taken_at || currentMedia.uploaded_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <HardDrive className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-zinc-500">Ukuran & Format</p>
                  <p className="font-medium text-zinc-200">
                    {formatSize(currentMedia.file_size)} • {currentMedia.mime_type}
                  </p>
                </div>
              </div>

              {(currentMedia.width || currentMedia.height) && (
                <div className="flex items-start gap-2.5">
                  <Maximize2 className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-zinc-500">Dimensi Resolusi</p>
                    <p className="font-medium text-zinc-200">
                      {currentMedia.width} × {currentMedia.height} px
                    </p>
                  </div>
                </div>
              )}

              {/* Album Membership */}
              <div className="pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <Folder className="h-3.5 w-3.5" />
                  <span>Album Terkait</span>
                </div>
                {albums.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {albums.map((alb) => (
                      <span
                        key={alb.id}
                        className="px-2.5 py-1 rounded-md bg-zinc-800 text-sky-300 text-[11px] font-medium"
                      >
                        {alb.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 italic">
                    Media ini belum dimasukkan ke album manapun
                  </p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
