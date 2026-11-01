"use client";

import React from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { GridZoomLevel } from "@/hooks/useGridZoom";

interface GridZoomControlsProps {
  zoomLevel: GridZoomLevel;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function GridZoomControls({
  zoomLevel,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: GridZoomControlsProps) {
  return (
    <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-900 rose:bg-[#fcecef] p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 rose:border-[#f3d8de] select-none">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (Perbanyak foto / perkecil ukuran)"
        className="p-1 rounded text-neutral-600 dark:text-neutral-400 rose:text-[#7a5c63] hover:text-neutral-900 dark:hover:text-white rose:hover:text-[#d96b82] hover:bg-white/80 dark:hover:bg-neutral-800 rose:hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>

      <span className="text-[10px] font-medium px-1 text-neutral-500 dark:text-neutral-400 rose:text-[#9e7a83] min-w-[36px] text-center capitalize">
        {zoomLevel === "compact"
          ? "Banyak"
          : zoomLevel === "large"
          ? "Besar"
          : "Sedang"}
      </span>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (Perbesar ukuran foto)"
        className="p-1 rounded text-neutral-600 dark:text-neutral-400 rose:text-[#7a5c63] hover:text-neutral-900 dark:hover:text-white rose:hover:text-[#d96b82] hover:bg-white/80 dark:hover:bg-neutral-800 rose:hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
