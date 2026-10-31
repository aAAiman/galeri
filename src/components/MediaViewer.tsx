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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none animate-in fade-in duration-100">
      {/* Top Bar */}
      <header className="h-12 px-4 flex items-center justify-between z-20 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-800 text-xs">
            <span className="font-medium text-neutral-200 truncate max-w-xs md:max-w-md">
              {currentMedia.original_filename}
            </span>
            <span className="text-neutral-500">
              {currentIndex + 1} / {mediaList.length}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5">
          {currentMedia.media_type === "image" && (
            <div className="hidden sm:flex items-center mr-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => onToggleFavorite && onToggleFavorite(currentMedia.id)}
            className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${
              currentMedia.is_favorite
                ? "text-rose-500 fill-rose-500"
                : "text-neutral-300 hover:text-white"
            }`}
            title="Favorit"
          >
            <Heart
              className={`h-4 w-4 ${
                currentMedia.is_favorite ? "fill-rose-500" : ""
              }`}
            />
          </button>

          <a
            href={`/api/media/${currentMedia.id}/download`}
            download={currentMedia.original_filename}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Unduh Asli"
          >
            <Download className="h-4 w-4" />
          </a>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${
              showInfo ? "text-blue-400 bg-neutral-800" : "text-neutral-300 hover:text-white"
            }`}
            title="Info"
          >
            <Info className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDelete && onDelete(currentMedia.id)}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-rose-400 transition-colors"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Presentation View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {mediaList.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Sebelumnya (Arrow Left)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <div className="w-full h-full flex items-center justify-center p-2 sm:p-6">
          {currentMedia.media_type === "image" ? (
            <div
              className="flex items-center justify-center w-full h-full transition-transform duration-100 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${currentMedia.id}/file`}
                alt={currentMedia.original_filename}
                className="max-h-[92vh] max-w-[94vw] object-contain select-none"
                draggable={false}
              />
            </div>
          ) : (
            <video
              key={currentMedia.id}
              controls
              autoPlay
              playsInline
              className="max-h-[90vh] max-w-[92vw] rounded"
              src={`/api/media/${currentMedia.id}/file`}
            >
              Format video tidak didukung.
            </video>
          )}
        </div>

        {mediaList.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Berikutnya (Arrow Right)"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Minimal Info Panel */}
        {showInfo && (
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-neutral-900 border-l border-neutral-800 text-neutral-200 p-4 overflow-y-auto z-20 text-xs space-y-4 animate-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-semibold text-neutral-100">Detail</span>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <p className="text-neutral-500 mb-0.5">Nama File</p>
              <p className="font-medium text-neutral-200 break-all">
                {currentMedia.original_filename}
              </p>
            </div>

            <div>
              <p className="text-neutral-500 mb-0.5">Waktu</p>
              <p className="text-neutral-200">
                {formatDate(currentMedia.taken_at || currentMedia.uploaded_at)}
              </p>
            </div>

            <div>
              <p className="text-neutral-500 mb-0.5">Format & Ukuran</p>
              <p className="text-neutral-200">
                {formatSize(currentMedia.file_size)} • {currentMedia.mime_type}
              </p>
            </div>

            {(currentMedia.width || currentMedia.height) && (
              <div>
                <p className="text-neutral-500 mb-0.5">Dimensi</p>
                <p className="text-neutral-200">
                  {currentMedia.width} × {currentMedia.height} piksel
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-neutral-800">
              <p className="text-neutral-500 mb-1.5">Album</p>
              {albums.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {albums.map((alb) => (
                    <span
                      key={alb.id}
                      className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[11px]"
                    >
                      {alb.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500 italic">Tidak ada album</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
