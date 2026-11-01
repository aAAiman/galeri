"use client";

import React from "react";
import { MediaItem } from "@/components/MediaViewer";
import { useLongPress } from "@/hooks/useLongPress";
import { Check, Heart, Play } from "lucide-react";

interface PhotoThumbnailProps {
  item: MediaItem;
  isSelected: boolean;
  isSelectionActive: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export function PhotoThumbnail({
  item,
  isSelected,
  isSelectionActive,
  onOpen,
  onToggleSelect,
  onToggleFavorite,
}: PhotoThumbnailProps) {
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      // Long press triggers selection like Google Photos / Apple Photos
      onToggleSelect();
    },
    onClick: () => {
      if (isSelectionActive) {
        onToggleSelect();
      } else {
        onOpen();
      }
    },
    thresholdMs: 450,
  });

  return (
    <div
      {...longPressHandlers}
      style={{ WebkitTouchCallout: "none" }}
      className={`group relative aspect-square bg-neutral-100 dark:bg-neutral-900 rose:bg-[#fcecef] overflow-hidden cursor-pointer select-none transition-transform duration-75 rounded-md rose:rounded-xl shadow-none rose:shadow-sm ${
        isSelected
          ? "ring-2 ring-blue-500 rose:ring-[#d96b82] ring-offset-1 dark:ring-offset-black rose:ring-offset-[#fff9f9] scale-[0.97]"
          : ""
      }`}
    >
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/media/${item.id}/thumbnail`}
        alt={item.original_filename}
        loading="lazy"
        draggable={false}
        className="w-full h-full object-cover transition-opacity duration-150 pointer-events-none"
      />

      {/* Subtle selection hover overlay */}
      <div
        className={`absolute inset-0 bg-black/20 rose:bg-[#d96b82]/10 transition-opacity ${
          isSelected || isSelectionActive
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Selection Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-md flex items-center justify-center transition-all ${
          isSelected
            ? "bg-blue-600 rose:bg-[#d96b82] text-white"
            : "bg-black/40 rose:bg-white/70 hover:bg-black/70 rose:hover:bg-white text-white/80 rose:text-[#d96b82] border border-white/40 rose:border-[#f3d8de] opacity-0 group-hover:opacity-100"
        }`}
        title="Pilih"
      >
        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
      </button>

      {/* Favorite Indicator / Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(e);
        }}
        className={`absolute top-1.5 right-1.5 z-10 p-1 rounded transition-all ${
          item.is_favorite
            ? "text-rose-500 fill-rose-500 opacity-100"
            : "text-white/80 hover:text-white bg-black/40 opacity-0 group-hover:opacity-100"
        }`}
        title="Favorit"
      >
        <Heart
          className={`h-3.5 w-3.5 ${item.is_favorite ? "fill-rose-500" : ""}`}
        />
      </button>

      {/* Discreet Video Pill */}
      {item.media_type === "video" && (
        <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1 py-0.5 rounded bg-black/60 text-white text-[9px] font-medium pointer-events-none">
          <Play className="h-2.5 w-2.5 fill-white" />
          {item.duration_seconds ? (
            <span>
              {Math.floor(item.duration_seconds / 60)}:
              {String(Math.floor(item.duration_seconds % 60)).padStart(2, "0")}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
