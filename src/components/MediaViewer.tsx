"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Trash2,
  Info,
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{
    dist?: number;
    initialZoom?: number;
    lastX?: number;
    lastY?: number;
  }>({});
  const lastTapRef = useRef<number>(0);
  const [showInfo, setShowInfo] = useState(false);
  const [albums, setAlbums] = useState<{ id: number; name: string }[]>([]);

  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  if (initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }

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
    setPanOffset({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  }, [mediaList.length]);

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
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

  // Mouse wheel scroll to zoom (PC)
  const handleWheel = (e: React.WheelEvent) => {
    if (!currentMedia || currentMedia.media_type !== "image") return;

    if (e.deltaY < 0) {
      // Scroll Up -> Zoom In
      setZoomLevel((z) => Math.min(4, Number((z + 0.3).toFixed(2))));
    } else {
      // Scroll Down -> Zoom Out
      setZoomLevel((z) => {
        const next = Math.max(1, Number((z - 0.3).toFixed(2)));
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Double click / Double tap to toggle 1x and 2.5x
  const handleDoubleClick = () => {
    if (!currentMedia || currentMedia.media_type !== "image") return;
    setZoomLevel((z) => {
      if (z > 1) {
        setPanOffset({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  };

  // Mouse drag panning on PC when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1 || currentMedia?.media_type !== "image") return;
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pinch & pan gestures on HP/mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (currentMedia?.media_type !== "image") return;

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        dist,
        initialZoom: zoomLevel,
      };
    } else if (e.touches.length === 1) {
      touchStartRef.current = {
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (currentMedia?.media_type !== "image") return;

    if (e.touches.length === 2 && touchStartRef.current.dist && touchStartRef.current.initialZoom) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      const nextZoom = Math.min(4, Math.max(1, Number((touchStartRef.current.initialZoom * factor).toFixed(2))));
      setZoomLevel(nextZoom);
      if (nextZoom === 1) setPanOffset({ x: 0, y: 0 });
    } else if (
      e.touches.length === 1 &&
      zoomLevel > 1 &&
      touchStartRef.current.lastX !== undefined &&
      touchStartRef.current.lastY !== undefined
    ) {
      const dx = e.touches[0].clientX - touchStartRef.current.lastX;
      const dy = e.touches[0].clientY - touchStartRef.current.lastY;
      touchStartRef.current.lastX = e.touches[0].clientX;
      touchStartRef.current.lastY = e.touches[0].clientY;
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap on mobile
        handleDoubleClick();
      }
      lastTapRef.current = now;
    }
    touchStartRef.current = {};
  };

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

        {/* Action Controls - Clean without zoom buttons */}
        <div className="flex items-center gap-0.5">
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

        <div className="w-full h-full flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          {currentMedia.media_type === "image" ? (
            <div
              className={`flex items-center justify-center w-full h-full transition-transform ${
                isDragging ? "duration-0" : "duration-150 ease-out"
              } ${
                zoomLevel > 1
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              }`}
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                touchAction: zoomLevel > 1 ? "none" : "pan-y",
              }}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${currentMedia.id}/file`}
                alt={currentMedia.original_filename}
                className="max-h-[92vh] max-w-[94vw] object-contain select-none pointer-events-none"
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

        {/* Subtle Zoom Reset Pill when Zoomed */}
        {zoomLevel > 1 && (
          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="absolute bottom-5 z-20 px-3 py-1 bg-black/75 hover:bg-black/90 text-white text-[11px] rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg cursor-pointer"
            title="Klik untuk kembali ke ukuran normal"
          >
            {zoomLevel}x • Ketuk / Klik ganda untuk reset
          </button>
        )}

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
