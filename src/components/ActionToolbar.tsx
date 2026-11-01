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
  CheckSquare,
  Square,
} from "lucide-react";

interface ActionToolbarProps {
  selectedCount: number;
  totalCount?: number;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
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
  totalCount,
  isAllSelected = false,
  onToggleSelectAll,
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
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 dark:bg-neutral-800/95 rose:bg-white/95 text-white rose:text-[#3a2228] border border-neutral-700/60 rose:border-[#f4d8de] px-3.5 py-2 rounded-xl shadow-xl rose:shadow-[0_8px_30px_rgb(217,107,130,0.18)] backdrop-blur-md flex items-center gap-1.5 sm:gap-2 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[95vw] overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1.5 sm:gap-2 pr-2 border-r border-neutral-700 rose:border-[#f3c8d1] shrink-0">
        <button
          onClick={onClearSelection}
          className="p-1 rounded-md text-neutral-400 rose:text-[#d96b82] hover:text-white rose:hover:text-[#b84860] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
          title="Batal Seleksi"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold whitespace-nowrap text-neutral-200 rose:text-[#3a2228]">
          {selectedCount} dipilih
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onToggleSelectAll && (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title={isAllSelected ? "Batalkan pilihan semua" : "Pilih semua foto"}
          >
            {isAllSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-blue-400 rose:text-[#d96b82]" />
            ) : (
              <Square className="h-3.5 w-3.5 text-neutral-400 rose:text-[#d96b82]" />
            )}
            <span className="hidden sm:inline">
              {isAllSelected ? "Batal Semua" : "Pilih Semua"}
            </span>
          </button>
        )}

        {onMoveToAlbum && (
          <button
            type="button"
            onClick={onMoveToAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title="Pindahkan ke Album"
          >
            <FolderInput className="h-3.5 w-3.5 text-neutral-400 rose:text-[#d96b82]" />
            <span className="hidden sm:inline">Pindah</span>
          </button>
        )}

        {onAddToAlbum && (
          <button
            type="button"
            onClick={onAddToAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title="Tambahkan ke Album"
          >
            <FolderPlus className="h-3.5 w-3.5 text-neutral-400 rose:text-[#d96b82]" />
            <span className="hidden sm:inline">Tambah ke Album</span>
          </button>
        )}

        {inAlbumContext && onRemoveFromAlbum && (
          <button
            type="button"
            onClick={onRemoveFromAlbum}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-amber-400 rose:hover:text-amber-700 hover:bg-neutral-700/50 rose:hover:bg-amber-100/60 transition-colors cursor-pointer"
            title="Keluarkan dari Album"
          >
            <FolderMinus className="h-3.5 w-3.5 text-amber-400 rose:text-amber-600" />
            <span className="hidden sm:inline">Keluarkan</span>
          </button>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-rose-400 rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title="Favoritkan"
          >
            <Heart className="h-3.5 w-3.5 text-neutral-400 rose:text-[#d96b82]" />
            <span className="hidden md:inline">Favorit</span>
          </button>
        )}

        {onDownloadAll && (
          <button
            type="button"
            onClick={onDownloadAll}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-[#5a3840] hover:text-white rose:hover:text-[#d96b82] hover:bg-neutral-700/50 rose:hover:bg-[#fde2e8] transition-colors cursor-pointer"
            title="Unduh"
          >
            <Download className="h-3.5 w-3.5 text-neutral-400 rose:text-[#d96b82]" />
            <span className="hidden md:inline">Unduh</span>
          </button>
        )}

        {onDeleteToTrash && (
          <button
            type="button"
            onClick={onDeleteToTrash}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-neutral-300 rose:text-rose-600 hover:text-rose-400 rose:hover:text-rose-700 hover:bg-neutral-700/50 rose:hover:bg-rose-100/70 transition-colors cursor-pointer"
            title="Hapus ke Trash"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400 rose:text-[#d96b82]" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        )}
      </div>
    </div>
  );
}
