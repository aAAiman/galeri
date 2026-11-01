"use client";

import React from "react";
import {
  X,
  FolderInput,
  FolderPlus,
  FolderMinus,
  Heart,
  Trash2,
  Download,
} from "lucide-react";

interface ActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMoveToAlbum?: () => void;
  onAddToAlbum?: () => void;
  onRemoveFromAlbum?: () => void;
  onToggleFavorite?: () => void;
  onDeleteToTrash?: () => void;
  onDownloadAll?: () => void;
  inAlbumContext?: boolean;
}

export function ActionToolbar({
  selectedCount,
  onClearSelection,
  onMoveToAlbum,
  onAddToAlbum,
  onRemoveFromAlbum,
  onToggleFavorite,
  onDeleteToTrash,
  onDownloadAll,
  inAlbumContext = false,
}: ActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 dark:bg-neutral-800/95 rose:bg-[#fff0f3]/95 text-white rose:text-[#3a2228] border border-neutral-700/60 rose:border-[#f3c8d1] px-3.5 py-2 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-2 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-2 pr-2.5 border-r border-neutral-700 rose:border-[#f3c8d1]">
        <button
          onClick={onClearSelection}
          className="p-1 rounded text-neutral-400 rose:text-[#a38088] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors"
          title="Batal Seleksi"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-medium whitespace-nowrap text-neutral-200 rose:text-[#3a2228]">
          {selectedCount} dipilih
        </span>
      </div>

      <div className="flex items-center gap-1">
        {onMoveToAlbum && (
          <button
            onClick={onMoveToAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title="Pindahkan ke Album"
          >
            <FolderInput className="h-3.5 w-3.5 text-neutral-400 rose:text-[#a38088]" />
            <span className="hidden sm:inline">Pindah</span>
          </button>
        )}

        {onAddToAlbum && (
          <button
            onClick={onAddToAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition-colors cursor-pointer"
            title="Tambahkan ke Album"
          >
            <FolderPlus className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Tambah ke Album</span>
          </button>
        )}

        {inAlbumContext && onRemoveFromAlbum && (
          <button
            onClick={onRemoveFromAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-neutral-300 hover:text-amber-400 hover:bg-neutral-700/50 transition-colors cursor-pointer"
            title="Keluarkan dari Album"
          >
            <FolderMinus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluarkan</span>
          </button>
        )}

        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded text-neutral-300 hover:text-rose-400 hover:bg-neutral-700/50 transition-colors cursor-pointer"
            title="Favoritkan"
          >
            <Heart className="h-3.5 w-3.5" />
          </button>
        )}

        {onDownloadAll && (
          <button
            onClick={onDownloadAll}
            className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-700/50 transition-colors cursor-pointer"
            title="Unduh"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}

        {onDeleteToTrash && (
          <button
            onClick={onDeleteToTrash}
            className="p-1.5 rounded text-neutral-300 hover:text-rose-400 hover:bg-neutral-700/50 transition-colors cursor-pointer"
            title="Hapus ke Trash"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
